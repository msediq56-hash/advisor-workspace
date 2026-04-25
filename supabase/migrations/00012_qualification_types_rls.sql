-- Migration 12: Qualification types dual-ownership RLS.
--
-- qualification_types uses the same owner_scope / owner_organization_id
-- dual-ownership pattern as catalog tables. Applies the same SELECT-only
-- RLS using the existing is_visible_by_ownership helper.
--
-- Policy intent:
--   Platform-owned qualification types are visible to all authenticated users.
--   Organization-owned qualification types are visible only to active members
--   of the owning organization.

ALTER TABLE qualification_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY qualification_types_select_visible
    ON qualification_types
    FOR SELECT
    TO authenticated
    USING (public.is_visible_by_ownership(owner_scope, owner_organization_id));
