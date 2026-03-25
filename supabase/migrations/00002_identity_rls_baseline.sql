-- Migration 2: Identity & Organization RLS Baseline
-- Scope: SELECT-only policies for user_profiles, organizations, organization_memberships
-- Intent: Authenticated users can read only their own profile, their own memberships,
--         and organizations they actively belong to.
-- Does NOT add write policies, catalog RLS, or any table/column changes.

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SELECT POLICIES
-- ============================================================

-- user_profiles: authenticated users can read only their own profile
CREATE POLICY user_profiles_select_own
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- organization_memberships: authenticated users can read only their own memberships
CREATE POLICY organization_memberships_select_own
    ON organization_memberships
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- organizations: authenticated users can read only organizations they have an active membership in
CREATE POLICY organizations_select_active_member
    ON organizations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM organization_memberships
            WHERE organization_memberships.organization_id = organizations.id
              AND organization_memberships.user_id = auth.uid()
              AND organization_memberships.membership_status = 'active'
        )
    );
