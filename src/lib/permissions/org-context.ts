import { createClient } from "@/lib/supabase/server";
import type { OrgContext, UserMembership } from "@/types/auth";
import type { MembershipRole } from "@/types/enums";

/**
 * Fetch all active organization memberships for a user.
 * Returns an empty array if the user has no active memberships.
 */
export async function getUserMemberships(
  userId: string
): Promise<UserMembership[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      "organization_id, role_key, organizations!inner(slug, name_ar)"
    )
    .eq("user_id", userId)
    .eq("membership_status", "active");

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const org = row.organizations as unknown as {
      slug: string;
      name_ar: string;
    };
    return {
      organizationId: row.organization_id as string,
      organizationSlug: org.slug,
      organizationNameAr: org.name_ar,
      role: row.role_key as MembershipRole,
    };
  });
}

/**
 * Resolve the active organization context for a specific org + user.
 * Returns null if the user has no active membership in that organization.
 */
export async function resolveOrgContext(
  userId: string,
  organizationId: string
): Promise<OrgContext | null> {
  const memberships = await getUserMemberships(userId);
  const match = memberships.find((m) => m.organizationId === organizationId);

  if (!match) {
    return null;
  }

  return {
    organizationId: match.organizationId,
    organizationSlug: match.organizationSlug,
    organizationNameAr: match.organizationNameAr,
    userId,
    role: match.role,
  };
}
