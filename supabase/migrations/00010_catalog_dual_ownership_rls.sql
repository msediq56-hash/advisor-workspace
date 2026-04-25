-- Migration 10: Catalog dual-ownership RLS baseline.
--
-- Enables RLS and adds SELECT policies for the three catalog tables that
-- use the owner_scope / owner_organization_id dual-ownership pattern:
--   - universities
--   - programs
--   - program_offerings
--
-- Policy intent:
--   - Platform-owned rows (owner_scope = 'platform') are visible to all
--     authenticated users.
--   - Organization-owned rows (owner_scope = 'organization') are visible
--     only to authenticated users who are active members of the owning
--     organization.
--
-- Introduces a reusable SECURITY DEFINER helper for dual-ownership
-- visibility that avoids recursive RLS problems.

-- ============================================================
-- REUSABLE DUAL-OWNERSHIP VISIBILITY HELPER
-- ============================================================

-- Returns true if a row with the given owner_scope / owner_organization_id
-- is visible to the current authenticated user.
--
-- Platform-owned rows are always visible to authenticated users.
-- Organization-owned rows are visible only when the user is an active
-- member of the owning organization (delegates to is_active_member_of).
CREATE OR REPLACE FUNCTION public.is_visible_by_ownership(
  p_owner_scope owner_scope,
  p_owner_organization_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_owner_scope = 'platform' THEN true
    WHEN p_owner_scope = 'organization' AND p_owner_organization_id IS NOT NULL
      THEN public.is_active_member_of(p_owner_organization_id)
    ELSE false
  END;
$$;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_offerings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SELECT POLICIES
-- ============================================================

-- universities: platform-owned visible to all authenticated;
-- organization-owned visible to active members of the owning org.
CREATE POLICY universities_select_visible
    ON universities
    FOR SELECT
    TO authenticated
    USING (public.is_visible_by_ownership(owner_scope, owner_organization_id));

-- programs: same dual-ownership visibility pattern.
CREATE POLICY programs_select_visible
    ON programs
    FOR SELECT
    TO authenticated
    USING (public.is_visible_by_ownership(owner_scope, owner_organization_id));

-- program_offerings: same dual-ownership visibility pattern.
CREATE POLICY program_offerings_select_visible
    ON program_offerings
    FOR SELECT
    TO authenticated
    USING (public.is_visible_by_ownership(owner_scope, owner_organization_id));
