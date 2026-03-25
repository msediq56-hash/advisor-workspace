/**
 * Server-side current membership summary helper.
 *
 * Resolves the current accessible membership for the authenticated
 * actor's resolved org context. Read-only, current-session scoped.
 *
 * Uses the RLS-aware server client — only the current user's own
 * membership rows are visible.
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getOptionalActorAccess,
  requireActorAccess,
} from "@/lib/auth/actor-access";
import type { MembershipSummary } from "@/types/membership";
import type { DbOrganizationMembership } from "@/types/database";

/**
 * Get the current accessible membership summary.
 * Returns null if:
 * - no authenticated actor
 * - no resolved org context
 * - no matching active membership row
 */
export async function getCurrentMembershipSummary(
  params?: { organizationId?: string | null }
): Promise<MembershipSummary | null> {
  const { orgContext } = await getOptionalActorAccess({
    organizationId: params?.organizationId,
  });

  if (!orgContext) {
    return null;
  }

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, user_id, organization_id, role_key, membership_status")
    .eq("user_id", orgContext.userId)
    .eq("organization_id", orgContext.organizationId)
    .eq("membership_status", "active")
    .single<Pick<DbOrganizationMembership, "id" | "user_id" | "organization_id" | "role_key" | "membership_status">>();

  if (!membership) {
    return null;
  }

  return {
    id: membership.id,
    userId: membership.user_id,
    organizationId: membership.organization_id,
    roleKey: membership.role_key,
    membershipStatus: membership.membership_status,
  };
}

/**
 * Require the current accessible membership summary, or throw.
 */
export async function requireCurrentMembershipSummary(
  params?: { organizationId?: string | null }
): Promise<MembershipSummary> {
  const { orgContext } = await requireActorAccess({
    organizationId: params?.organizationId,
  });

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, user_id, organization_id, role_key, membership_status")
    .eq("user_id", orgContext.userId)
    .eq("organization_id", orgContext.organizationId)
    .eq("membership_status", "active")
    .single<Pick<DbOrganizationMembership, "id" | "user_id" | "organization_id" | "role_key" | "membership_status">>();

  if (!membership) {
    throw new Error("Active membership not found");
  }

  return {
    id: membership.id,
    userId: membership.user_id,
    organizationId: membership.organization_id,
    roleKey: membership.role_key,
    membershipStatus: membership.membership_status,
  };
}
