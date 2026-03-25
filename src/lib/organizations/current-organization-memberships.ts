/**
 * Server-side current organization memberships read helper.
 *
 * Resolves readable membership rows for the current resolved organization
 * using the manageOrganizationUsers capability and RLS-aware client.
 *
 * Read-only, current-session scoped. The owner-read RLS policy
 * (migration 4) ensures only owners can see all org membership rows.
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentWorkspaceCapabilityAccess,
  requireCurrentWorkspaceCapabilityAccess,
} from "@/lib/organizations/current-workspace-capability-guards";
import type { CurrentOrganizationMembershipsReadAccess } from "@/types/organization-memberships-read";
import type { MembershipSummary } from "@/types/membership";
import type { DbOrganizationMembership } from "@/types/database";

/**
 * Get readable membership rows for the current resolved organization.
 * Returns null if no workspace capability access (manageOrganizationUsers).
 * Returns an empty array if no membership rows are found.
 */
export async function getCurrentOrganizationMembershipsReadAccess(
  params?: { organizationId?: string | null }
): Promise<CurrentOrganizationMembershipsReadAccess | null> {
  const workspace = await getCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationUsers",
    organizationId: params?.organizationId,
  });

  if (!workspace) {
    return null;
  }

  const memberships = await queryOrgMemberships(workspace.workspace.orgContext.organizationId);

  return { workspace, memberships };
}

/**
 * Require readable membership rows for the current resolved organization, or throw.
 * Does NOT throw for an empty list — only throws when capability access is missing.
 */
export async function requireCurrentOrganizationMembershipsReadAccess(
  params?: { organizationId?: string | null }
): Promise<CurrentOrganizationMembershipsReadAccess> {
  const workspace = await requireCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationUsers",
    organizationId: params?.organizationId,
  });

  const memberships = await queryOrgMemberships(workspace.workspace.orgContext.organizationId);

  return { workspace, memberships };
}

async function queryOrgMemberships(
  organizationId: string
): Promise<readonly MembershipSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_memberships")
    .select("id, user_id, organization_id, role_key, membership_status")
    .eq("organization_id", organizationId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    organizationId: row.organization_id as string,
    roleKey: row.role_key as MembershipSummary["roleKey"],
    membershipStatus: row.membership_status as MembershipSummary["membershipStatus"],
  }));
}
