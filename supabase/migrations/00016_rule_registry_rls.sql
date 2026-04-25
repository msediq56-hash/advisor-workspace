-- Migration 16: Rule registry RLS.
--
-- Enables SELECT-only RLS on the four rule registry tables. Tenant isolation
-- is rooted at rule_sets via the dual-ownership visibility model and applied
-- via the existing public.is_visible_by_ownership() helper.
--
-- Child tables (rule_set_versions, rule_groups, rules) use root-direct EXISTS
-- joins to rule_sets so the ownership check is applied exactly once at the
-- root ownership table, following the pattern accepted in migrations 00013
-- and 00015.
--
-- rule_types is intentionally NOT touched in this slice. It is a platform
-- reference table with no owner_scope column and no per-tenant data, and the
-- resolver queries it after rule_set/version/group/rule visibility has
-- already been gated by their RLS policies.
--
-- Existing application-code ownership filtering in
-- resolve-direct-evaluation-rule-context.ts remains as defense-in-depth per
-- Decision 026 and is unchanged in this slice.
--
-- Policy intent:
--   Authenticated users can SELECT rule registry rows only when the parent
--   rule_sets row is visible under the dual-ownership model:
--     - platform-owned rule_sets are visible to all authenticated
--     - organization-owned rule_sets are visible only to active members of
--       the owning organization

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_set_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SELECT POLICIES — root-direct visibility from rule_sets
-- ============================================================

-- rule_sets: dual-ownership visibility at the root
CREATE POLICY rule_sets_select_visible
    ON rule_sets
    FOR SELECT
    TO authenticated
    USING (public.is_visible_by_ownership(owner_scope, owner_organization_id));

-- rule_set_versions: visible if parent rule_sets is visible
CREATE POLICY rule_set_versions_select_visible
    ON rule_set_versions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM rule_sets
            WHERE rule_sets.id = rule_set_versions.rule_set_id
              AND public.is_visible_by_ownership(rule_sets.owner_scope, rule_sets.owner_organization_id)
        )
    );

-- rule_groups: visible if root rule_sets is visible
CREATE POLICY rule_groups_select_visible
    ON rule_groups
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM rule_set_versions
            JOIN rule_sets
              ON rule_sets.id = rule_set_versions.rule_set_id
            WHERE rule_set_versions.id = rule_groups.rule_set_version_id
              AND public.is_visible_by_ownership(rule_sets.owner_scope, rule_sets.owner_organization_id)
        )
    );

-- rules: visible if root rule_sets is visible
CREATE POLICY rules_select_visible
    ON rules
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM rule_groups
            JOIN rule_set_versions
              ON rule_set_versions.id = rule_groups.rule_set_version_id
            JOIN rule_sets
              ON rule_sets.id = rule_set_versions.rule_set_id
            WHERE rule_groups.id = rules.rule_group_id
              AND public.is_visible_by_ownership(rule_sets.owner_scope, rule_sets.owner_organization_id)
        )
    );
