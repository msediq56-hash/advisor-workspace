-- Migration 11: Catalog child RLS for faculties.
--
-- faculties is a child of universities with no direct owner_scope /
-- owner_organization_id. Visibility follows the parent university's
-- dual-ownership model via the existing is_visible_by_ownership helper.
--
-- Policy intent:
--   Authenticated users can SELECT a faculty only when its parent
--   university is visible under the accepted ownership visibility model.

ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;

CREATE POLICY faculties_select_visible
    ON faculties
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM universities
            WHERE universities.id = faculties.university_id
              AND public.is_visible_by_ownership(universities.owner_scope, universities.owner_organization_id)
        )
    );
