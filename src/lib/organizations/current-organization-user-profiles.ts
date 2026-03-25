/**
 * Server-side current organization user profiles read helper.
 *
 * Resolves readable user profile rows for the current resolved organization
 * using the manageOrganizationUsers capability and RLS-aware client.
 *
 * Read-only, current-session scoped. The owner-read RLS policies
 * (migrations 4+5) ensure only owners can see org member profiles.
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentWorkspaceCapabilityAccess,
  requireCurrentWorkspaceCapabilityAccess,
} from "@/lib/organizations/current-workspace-capability-guards";
import { getCurrentOrganizationMembershipsReadAccess } from "@/lib/organizations/current-organization-memberships";
import type {
  UserProfileSummary,
  CurrentOrganizationUserProfilesReadAccess,
} from "@/types/user-profiles-read";

/**
 * Get readable user profile rows for the current resolved organization.
 * Returns null if no workspace capability access (manageOrganizationUsers).
 * Returns an empty array if no profile rows are found.
 */
export async function getCurrentOrganizationUserProfilesReadAccess(
  params?: { organizationId?: string | null }
): Promise<CurrentOrganizationUserProfilesReadAccess | null> {
  const workspace = await getCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationUsers",
    organizationId: params?.organizationId,
  });

  if (!workspace) {
    return null;
  }

  const profiles = await queryOrgMemberProfiles(params);

  return { workspace, profiles };
}

/**
 * Require readable user profile rows for the current resolved organization, or throw.
 * Does NOT throw for an empty list — only throws when capability access is missing.
 */
export async function requireCurrentOrganizationUserProfilesReadAccess(
  params?: { organizationId?: string | null }
): Promise<CurrentOrganizationUserProfilesReadAccess> {
  const workspace = await requireCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationUsers",
    organizationId: params?.organizationId,
  });

  const profiles = await queryOrgMemberProfiles(params);

  return { workspace, profiles };
}

/**
 * Derive target user ids from current organization memberships,
 * then query their profiles via the RLS-aware client.
 */
async function queryOrgMemberProfiles(
  params?: { organizationId?: string | null }
): Promise<readonly UserProfileSummary[]> {
  // Use the memberships read helper to get current org member ids
  const membershipsAccess = await getCurrentOrganizationMembershipsReadAccess(params);

  if (!membershipsAccess || membershipsAccess.memberships.length === 0) {
    return [];
  }

  const userIds = membershipsAccess.memberships.map((m) => m.userId);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, email_normalized, is_active")
    .in("id", userIds);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id as string,
    fullName: row.full_name as string,
    emailNormalized: row.email_normalized as string,
    isActive: row.is_active as boolean,
  }));
}
