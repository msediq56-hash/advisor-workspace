/**
 * Server-side current organization members read helper.
 *
 * Composes current organization memberships and user profiles read access
 * into a combined member view for the current resolved organization.
 *
 * Read-only, current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getCurrentOrganizationMembershipsReadAccess,
  requireCurrentOrganizationMembershipsReadAccess,
} from "@/lib/organizations/current-organization-memberships";
import {
  getCurrentOrganizationUserProfilesReadAccess,
  requireCurrentOrganizationUserProfilesReadAccess,
} from "@/lib/organizations/current-organization-user-profiles";
import type {
  OrganizationMemberSummary,
  CurrentOrganizationMembersReadAccess,
} from "@/types/organization-members-read";
import type { UserProfileSummary } from "@/types/user-profiles-read";
import type { MembershipSummary } from "@/types/membership";

/**
 * Get readable organization members for the current resolved organization.
 * Returns null if either memberships or profiles access is unavailable.
 * Returns an empty array if no memberships exist.
 */
export async function getCurrentOrganizationMembersReadAccess(
  params?: { organizationId?: string | null }
): Promise<CurrentOrganizationMembersReadAccess | null> {
  const membershipsAccess = await getCurrentOrganizationMembershipsReadAccess(params);
  if (!membershipsAccess) {
    return null;
  }

  const profilesAccess = await getCurrentOrganizationUserProfilesReadAccess(params);
  if (!profilesAccess) {
    return null;
  }

  const members = combineMembers(
    membershipsAccess.memberships,
    profilesAccess.profiles
  );

  return { workspace: membershipsAccess.workspace, members };
}

/**
 * Require readable organization members for the current resolved organization, or throw.
 * Does NOT throw for an empty list — only throws when required access is missing.
 */
export async function requireCurrentOrganizationMembersReadAccess(
  params?: { organizationId?: string | null }
): Promise<CurrentOrganizationMembersReadAccess> {
  const membershipsAccess = await requireCurrentOrganizationMembershipsReadAccess(params);
  const profilesAccess = await requireCurrentOrganizationUserProfilesReadAccess(params);

  const members = combineMembers(
    membershipsAccess.memberships,
    profilesAccess.profiles
  );

  return { workspace: membershipsAccess.workspace, members };
}

/**
 * Combine memberships with profiles by user id.
 * Each membership produces one member entry. Profile is null if not found.
 */
function combineMembers(
  memberships: readonly MembershipSummary[],
  profiles: readonly UserProfileSummary[]
): readonly OrganizationMemberSummary[] {
  const profileMap = new Map<string, UserProfileSummary>();
  for (const profile of profiles) {
    profileMap.set(profile.id, profile);
  }

  return memberships.map((membership) => ({
    membership,
    profile: profileMap.get(membership.userId) ?? null,
  }));
}
