-- Migration 6: Fix Recursive Identity RLS Policies
--
-- Problem: Policies on organization_memberships that subquery organization_memberships
-- cause infinite recursion because PostgreSQL applies RLS to subqueries inside policies.
--
-- Fix: Replace recursive subqueries with SECURITY DEFINER functions that bypass RLS
-- for the internal membership/ownership lookup.

-- ============================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================

-- Returns true if the current auth user has an active membership
-- in the given organization (and the organization itself is active).
-- Bypasses RLS via SECURITY DEFINER to avoid recursive policy evaluation.
CREATE OR REPLACE FUNCTION public.is_active_member_of(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = target_org_id
      AND m.user_id = auth.uid()
      AND m.membership_status = 'active'
      AND o.status = 'active'
  );
$$;

-- Returns true if the current auth user has an active owner membership
-- in the given organization (and the organization itself is active).
-- Bypasses RLS via SECURITY DEFINER to avoid recursive policy evaluation.
CREATE OR REPLACE FUNCTION public.is_owner_of(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_memberships m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.organization_id = target_org_id
      AND m.user_id = auth.uid()
      AND m.membership_status = 'active'
      AND m.role_key = 'owner'
      AND o.status = 'active'
  );
$$;

-- ============================================================
-- DROP AFFECTED POLICIES (keep safe baseline self-read policies)
-- ============================================================

-- Drop the recursive policies only
DROP POLICY IF EXISTS organizations_select_active_member ON organizations;
DROP POLICY IF EXISTS organization_branding_select_active_member ON organization_branding;
DROP POLICY IF EXISTS organization_memberships_select_org_owner ON organization_memberships;
DROP POLICY IF EXISTS user_profiles_select_org_owner ON user_profiles;

-- ============================================================
-- RECREATE POLICIES USING HELPER FUNCTIONS
-- ============================================================

-- organizations: authenticated active members can read orgs they belong to
CREATE POLICY organizations_select_active_member
    ON organizations
    FOR SELECT
    TO authenticated
    USING (public.is_active_member_of(id));

-- organization_branding: authenticated active members can read branding for their orgs
CREATE POLICY organization_branding_select_active_member
    ON organization_branding
    FOR SELECT
    TO authenticated
    USING (public.is_active_member_of(organization_id));

-- organization_memberships: owners can read all memberships in their active org
CREATE POLICY organization_memberships_select_org_owner
    ON organization_memberships
    FOR SELECT
    TO authenticated
    USING (public.is_owner_of(organization_id));

-- user_profiles: owners can read profiles for users in their active org
CREATE POLICY user_profiles_select_org_owner
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM organization_memberships target_m
            WHERE target_m.user_id = user_profiles.id
              AND target_m.membership_status = 'active'
              AND public.is_owner_of(target_m.organization_id)
        )
    );
