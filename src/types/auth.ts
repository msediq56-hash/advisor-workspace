/**
 * Typed shapes for auth session and organization context.
 */

import type { MembershipRole } from "./enums";

/** The authenticated user as resolved from Supabase Auth + user_profiles. */
export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
}

/** Resolved session — null means not authenticated. */
export interface AppSession {
  user: SessionUser;
}

/** A single organization membership for the current user. */
export interface UserMembership {
  organizationId: string;
  organizationSlug: string;
  organizationNameAr: string;
  role: MembershipRole;
}

/** Active organization context for a request. */
export interface OrgContext {
  organizationId: string;
  organizationSlug: string;
  organizationNameAr: string;
  userId: string;
  role: MembershipRole;
}
