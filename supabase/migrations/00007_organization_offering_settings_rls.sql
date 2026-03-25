-- Migration 7: RLS for organization_offering_settings
-- Scope: Enable RLS and add SELECT policy for organization_offering_settings.
-- Pattern: Reuses public.is_active_member_of() SECURITY DEFINER helper
--          from migration 00006 (Decision 018 — no recursive policy subqueries).

ALTER TABLE organization_offering_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read offering settings only for organizations
-- where they have an active membership in an active organization.
CREATE POLICY organization_offering_settings_select_active_member
    ON organization_offering_settings
    FOR SELECT
    TO authenticated
    USING (public.is_active_member_of(organization_id));
