/**
 * Server-side organization context resolution.
 *
 * Current-session scoped: reads rely on RLS policies
 * (organization_memberships_select_own, organizations_select_active_member),
 * so only the authenticated user's own membership rows are visible.
 *
 * This is NOT a generic arbitrary-user resolver. It only resolves
 * org context for the current authenticated user.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  UserMembership,
  ResolvedOrgContext,
  OrgContextResolutionResult,
} from "@/types/auth";
import type { MembershipRole, MembershipStatus, OrganizationStatus } from "@/types/enums";

/**
 * Fetch all active memberships for a user where both the membership
 * and the organization are active.
 *
 * Returns an empty array if:
 * - no authenticated session exists
 * - userId does not match the current authenticated user
 */
export async function listActiveMembershipsForUser(
  userId: string
): Promise<UserMembership[]> {
  const supabase = await createClient();

  // Verify current authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || authUser.id !== userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      "id, user_id, organization_id, role_key, membership_status, organizations!inner(slug, name_ar, status)"
    )
    .eq("user_id", userId)
    .eq("membership_status", "active");

  if (error || !data) {
    return [];
  }

  // RLS already limits rows to the current user's memberships.
  // The !inner join + organizations RLS ensures only accessible orgs are returned.
  // We still confirm org status in mapping as a defense-in-depth check.
  return data
    .map((row) => {
      const org = row.organizations as unknown as {
        slug: string;
        name_ar: string;
        status: string;
      };

      return {
        membershipId: row.id as string,
        userId: row.user_id as string,
        organizationId: row.organization_id as string,
        organizationSlug: org.slug,
        organizationNameAr: org.name_ar,
        roleKey: row.role_key as MembershipRole,
        membershipStatus: row.membership_status as MembershipStatus,
        organizationStatus: org.status as OrganizationStatus,
      };
    })
    .filter((m) => m.organizationStatus === "active");
}

/**
 * Resolve org context for the current authenticated user.
 *
 * Resolution rules:
 * - If no authenticated user or userId mismatch: no_active_memberships
 * - If no active memberships exist: no_active_memberships
 * - If organizationId is provided: validate and resolve or return organization_not_accessible
 * - If organizationId is omitted and exactly one active membership: auto-resolve
 * - If organizationId is omitted and multiple active memberships: require selection
 */
export async function resolveOrgContext(params: {
  userId: string;
  organizationId?: string | null;
}): Promise<OrgContextResolutionResult> {
  const { userId, organizationId } = params;

  // Verify current authenticated user before attempting resolution
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || authUser.id !== userId) {
    return { status: "organization_not_accessible" as const, memberships: [] };
  }

  const memberships = await listActiveMembershipsForUser(userId);

  if (memberships.length === 0) {
    return { status: "no_active_memberships" };
  }

  // Explicit organization requested
  if (organizationId) {
    const match = memberships.find((m) => m.organizationId === organizationId);

    if (!match) {
      return { status: "organization_not_accessible", memberships };
    }

    return {
      status: "resolved",
      context: toResolvedContext(userId, match),
      memberships,
    };
  }

  // No organization specified — auto-resolve only if exactly one
  if (memberships.length === 1) {
    return {
      status: "resolved",
      context: toResolvedContext(userId, memberships[0]),
      memberships,
    };
  }

  return {
    status: "multiple_active_memberships_requires_selection",
    memberships,
  };
}

function toResolvedContext(
  userId: string,
  membership: UserMembership
): ResolvedOrgContext {
  return {
    userId,
    membershipId: membership.membershipId,
    organizationId: membership.organizationId,
    organizationSlug: membership.organizationSlug,
    organizationNameAr: membership.organizationNameAr,
    roleKey: membership.roleKey,
  };
}
