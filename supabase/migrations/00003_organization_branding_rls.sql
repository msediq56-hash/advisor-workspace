-- Migration 3: Organization Branding RLS Baseline
-- Scope: SELECT-only policy for organization_branding
-- Intent: Authenticated users can read branding only for organizations
--         they actively belong to and that are themselves active.

ALTER TABLE organization_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_branding_select_active_member
    ON organization_branding
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM organization_memberships
            WHERE organization_memberships.organization_id = organization_branding.organization_id
              AND organization_memberships.user_id = auth.uid()
              AND organization_memberships.membership_status = 'active'
        )
        AND EXISTS (
            SELECT 1
            FROM organizations
            WHERE organizations.id = organization_branding.organization_id
              AND organizations.status = 'active'
        )
    );
