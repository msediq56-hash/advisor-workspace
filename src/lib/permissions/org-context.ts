import { createAdminClient } from "@/lib/supabase/admin";
import type {
  UserMembership,
  ResolvedOrgContext,
  OrgContextResolutionResult,
} from "@/types/auth";
import type { MembershipRole, MembershipStatus, OrganizationStatus } from "@/types/enums";

/**
 * Server-side organization context resolution.
 *
 * Uses the service-role admin client because RLS policies are not
 * implemented yet. Once RLS is in place, this should be reviewed
 * to determine whether the admin client is still appropriate here.
 */

/**
 * Fetch all active memberships for a user where both the membership
 * and the organization are active.
 */
export async function listActiveMembershipsForUser(
  userId: string
): Promise<UserMembership[]> {
  const supabase = createAdminClient();

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

  // Filter to only organizations that are active (join filter via !inner
  // handles the join, but we still confirm org status in mapping)
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
 * Resolve org context for a user.
 *
 * Resolution rules:
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
