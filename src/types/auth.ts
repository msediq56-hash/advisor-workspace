/**
 * Typed shapes for auth session, organization membership, and org context resolution.
 * Reuses enum unions from src/types/enums.ts — do not duplicate them here.
 */

import type { MembershipRole, MembershipStatus, OrganizationStatus } from "./enums";

/** The authenticated user as resolved from Supabase Auth. */
export interface SessionUser {
  id: string;
  email: string;
}

/** Resolved session — null means not authenticated. */
export interface AppSession {
  user: SessionUser;
}

/** A single organization membership for a user, with org details. */
export interface UserMembership {
  membershipId: string;
  userId: string;
  organizationId: string;
  organizationSlug: string;
  organizationNameAr: string;
  roleKey: MembershipRole;
  membershipStatus: MembershipStatus;
  organizationStatus: OrganizationStatus;
}

/** Resolved organization context for a request — only returned when status is 'resolved'. */
export interface ResolvedOrgContext {
  userId: string;
  membershipId: string;
  organizationId: string;
  organizationSlug: string;
  organizationNameAr: string;
  roleKey: MembershipRole;
}

/** Possible outcomes of org context resolution. */
export type OrgContextResolutionStatus =
  | "resolved"
  | "no_active_memberships"
  | "multiple_active_memberships_requires_selection"
  | "organization_not_accessible";

/** Result of org context resolution — discriminated by status. */
export type OrgContextResolutionResult =
  | { status: "resolved"; context: ResolvedOrgContext; memberships: UserMembership[] }
  | { status: "no_active_memberships" }
  | { status: "multiple_active_memberships_requires_selection"; memberships: UserMembership[] }
  | { status: "organization_not_accessible"; memberships: UserMembership[] };

/** Active application actor profile resolved from user_profiles. */
export interface ActorProfile {
  id: string;
  fullName: string;
  emailNormalized: string;
  isActive: boolean;
}

/** Authenticated user combined with their active actor profile. */
export interface AppActor {
  session: AppSession;
  profile: ActorProfile;
}

/** Optional actor access — all fields nullable when not authenticated or unresolved. */
export interface OptionalActorAccess {
  session: AppSession | null;
  actor: AppActor | null;
  orgResolution: OrgContextResolutionResult | null;
  orgContext: ResolvedOrgContext | null;
}

/** Required actor access — fully resolved session, actor, and org context. */
export interface RequiredActorAccess {
  session: AppSession;
  actor: AppActor;
  orgContext: ResolvedOrgContext;
}
