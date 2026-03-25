/**
 * Minimal shared database-facing types for the foundation layer.
 * These are NOT full table row types — only what the auth/session
 * and org-context layers need right now.
 *
 * Full generated types will come later via supabase gen types.
 */

import type { MembershipRole, MembershipStatus, OrganizationStatus } from "./enums";

/** Matches the user_profiles table (subset needed for session). */
export interface DbUserProfile {
  id: string;
  full_name: string;
  email_normalized: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Matches the organizations table (subset needed for org context). */
export interface DbOrganization {
  id: string;
  slug: string;
  name_ar: string;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
}

/** Matches organization_memberships (subset for org context resolution). */
export interface DbOrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role_key: MembershipRole;
  membership_status: MembershipStatus;
  created_at: string;
  updated_at: string;
}
