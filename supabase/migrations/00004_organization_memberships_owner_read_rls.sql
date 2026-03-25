-- Migration 4: Organization Memberships Owner Read RLS Extension
-- Scope: Additional SELECT policy on organization_memberships
-- Intent: Organization owners can read all membership rows for their
--         own active organization, enabling user management views.

CREATE POLICY organization_memberships_select_org_owner
    ON organization_memberships
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM organization_memberships AS actor_membership
            WHERE actor_membership.organization_id = organization_memberships.organization_id
              AND actor_membership.user_id = auth.uid()
              AND actor_membership.membership_status = 'active'
              AND actor_membership.role_key = 'owner'
        )
        AND EXISTS (
            SELECT 1
            FROM organizations
            WHERE organizations.id = organization_memberships.organization_id
              AND organizations.status = 'active'
        )
    );
