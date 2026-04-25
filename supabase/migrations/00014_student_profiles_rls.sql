-- Migration 14: Student profile RLS.
--
-- Enables SELECT-only RLS on the three student profile tables. Tenant
-- isolation is rooted at student_profiles.organization_id and applied
-- via the existing public.is_active_member_of() SECURITY DEFINER helper.
--
-- Child tables use root-direct EXISTS joins to student_profiles so the
-- ownership check is applied exactly once at the root ownership table,
-- following the pattern accepted in migration 00013.
--
-- Policy intent:
--   Authenticated users can SELECT student profile data only when they
--   are active members of the organization that owns the profile.

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profile_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profile_subjects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SELECT POLICIES
-- ============================================================

-- student_profiles: directly check organization membership
CREATE POLICY student_profiles_select_member
    ON student_profiles
    FOR SELECT
    TO authenticated
    USING (public.is_active_member_of(organization_id));

-- student_profile_answers: root-direct EXISTS join to student_profiles
CREATE POLICY student_profile_answers_select_member
    ON student_profile_answers
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM student_profiles
            WHERE student_profiles.id = student_profile_answers.profile_id
              AND public.is_active_member_of(student_profiles.organization_id)
        )
    );

-- student_profile_subjects: root-direct EXISTS join to student_profiles
CREATE POLICY student_profile_subjects_select_member
    ON student_profile_subjects
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM student_profiles
            WHERE student_profiles.id = student_profile_subjects.profile_id
              AND public.is_active_member_of(student_profiles.organization_id)
        )
    );
