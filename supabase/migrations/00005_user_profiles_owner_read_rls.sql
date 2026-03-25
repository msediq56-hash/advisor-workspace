-- Migration 5: User Profiles Owner Read RLS Extension
-- Scope: Additional SELECT policy on user_profiles
-- Intent: Organization owners can read profile rows for users who have
--         an active membership in the same active organization.

CREATE POLICY user_profiles_select_org_owner
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM organization_memberships AS target_membership
            JOIN organization_memberships AS actor_membership
              ON actor_membership.organization_id = target_membership.organization_id
             AND actor_membership.user_id = auth.uid()
             AND actor_membership.membership_status = 'active'
             AND actor_membership.role_key = 'owner'
            JOIN organizations
              ON organizations.id = target_membership.organization_id
             AND organizations.status = 'active'
            WHERE target_membership.user_id = user_profiles.id
              AND target_membership.membership_status = 'active'
        )
    );
