-- Migration 15: Evaluation runtime RLS.
--
-- Enables SELECT-only RLS on the three evaluation runtime tables. Tenant
-- isolation is rooted at evaluation_runs.organization_id and applied via
-- the existing public.is_active_member_of() SECURITY DEFINER helper.
--
-- Child tables use root-direct EXISTS joins to evaluation_runs so the
-- ownership check is applied exactly once at the root ownership table,
-- following the pattern accepted in migrations 00013 and 00014.
--
-- Persistence write path is unaffected: the SECURITY DEFINER RPC
-- persist_direct_evaluation_run_atomic and the service_role admin
-- client both bypass RLS by default.
--
-- Policy intent:
--   Authenticated users can SELECT evaluation runtime data only when they
--   are active members of the organization that owns the evaluation run.

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_rule_traces ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SELECT POLICIES
-- ============================================================

-- evaluation_runs: directly check organization membership
CREATE POLICY evaluation_runs_select_member
    ON evaluation_runs
    FOR SELECT
    TO authenticated
    USING (public.is_active_member_of(organization_id));

-- evaluation_results: root-direct EXISTS join to evaluation_runs
CREATE POLICY evaluation_results_select_member
    ON evaluation_results
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM evaluation_runs
            WHERE evaluation_runs.id = evaluation_results.evaluation_run_id
              AND public.is_active_member_of(evaluation_runs.organization_id)
        )
    );

-- evaluation_rule_traces: root-direct EXISTS join through evaluation_results
-- to evaluation_runs
CREATE POLICY evaluation_rule_traces_select_member
    ON evaluation_rule_traces
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM evaluation_results
            JOIN evaluation_runs
              ON evaluation_runs.id = evaluation_results.evaluation_run_id
            WHERE evaluation_results.id = evaluation_rule_traces.evaluation_result_id
              AND public.is_active_member_of(evaluation_runs.organization_id)
        )
    );
