-- Migration 13: Qualification child RLS.
--
-- Enables SELECT-only RLS on the three qualification child tables, each
-- using a root-direct EXISTS join to qualification_types so that the
-- dual-ownership visibility helper is applied exactly once at the root.
--
-- Policy intent:
--   A child row is visible to authenticated users only when its parent
--   qualification_types row is visible under the dual-ownership model:
--     - platform-owned qualification types are visible to all authenticated
--     - organization-owned qualification types are visible only to active
--       members of the owning organization

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE qualification_question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_question_options ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SELECT POLICIES — root-direct EXISTS to qualification_types
-- ============================================================

-- qualification_question_sets: visible if parent qualification_types is visible
CREATE POLICY qualification_question_sets_select_visible
    ON qualification_question_sets
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM qualification_types
            WHERE qualification_types.id = qualification_question_sets.qualification_type_id
              AND public.is_visible_by_ownership(qualification_types.owner_scope, qualification_types.owner_organization_id)
        )
    );

-- qualification_questions: visible if root qualification_types is visible
CREATE POLICY qualification_questions_select_visible
    ON qualification_questions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM qualification_question_sets
            JOIN qualification_types
              ON qualification_types.id = qualification_question_sets.qualification_type_id
            WHERE qualification_question_sets.id = qualification_questions.question_set_id
              AND public.is_visible_by_ownership(qualification_types.owner_scope, qualification_types.owner_organization_id)
        )
    );

-- qualification_question_options: visible if root qualification_types is visible
CREATE POLICY qualification_question_options_select_visible
    ON qualification_question_options
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM qualification_questions
            JOIN qualification_question_sets
              ON qualification_question_sets.id = qualification_questions.question_set_id
            JOIN qualification_types
              ON qualification_types.id = qualification_question_sets.qualification_type_id
            WHERE qualification_questions.id = qualification_question_options.question_id
              AND public.is_visible_by_ownership(qualification_types.owner_scope, qualification_types.owner_organization_id)
        )
    );
