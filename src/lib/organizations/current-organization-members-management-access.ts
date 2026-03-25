/**
 * Server-side current organization members management access helper.
 *
 * Composes workspace capability access (manageOrganizationUsers) with
 * current organization members read access for management views.
 *
 * Read-only, current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getCurrentWorkspaceCapabilityAccess,
  requireCurrentWorkspaceCapabilityAccess,
} from "@/lib/organizations/current-workspace-capability-guards";
import {
  getCurrentOrganizationMembersReadAccess,
  requireCurrentOrganizationMembersReadAccess,
} from "@/lib/organizations/current-organization-members";
import type { CurrentOrganizationMembersManagementAccess } from "@/types/organization-members-management-access";
import type { MembershipRole } from "@/types/enums";

/**
 * Get current organization members management access.
 * Returns null if no workspace capability access (manageOrganizationUsers)
 * or no readable current organization members access.
 */
export async function getCurrentOrganizationMembersManagementAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentOrganizationMembersManagementAccess | null> {
  const workspace = await getCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationUsers",
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  });

  if (!workspace) {
    return null;
  }

  const membersAccess = await getCurrentOrganizationMembersReadAccess({
    organizationId: params?.organizationId,
  });

  if (!membersAccess) {
    return null;
  }

  return { workspace, members: membersAccess.members };
}

/**
 * Require current organization members management access, or throw.
 */
export async function requireCurrentOrganizationMembersManagementAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentOrganizationMembersManagementAccess> {
  const workspace = await requireCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationUsers",
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  });

  const membersAccess = await requireCurrentOrganizationMembersReadAccess({
    organizationId: params?.organizationId,
  });

  return { workspace, members: membersAccess.members };
}
