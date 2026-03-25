/**
 * Server-side current workspace role guards.
 *
 * Gates access by requiring exact role inclusion from the current
 * workspace membership role. No role hierarchy — exact match only.
 *
 * Read-only, current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getCurrentWorkspaceRole,
  requireCurrentWorkspaceRole,
} from "@/lib/organizations/current-workspace-role";
import type { CurrentWorkspaceRole } from "@/types/workspace-role";
import type { MembershipRole } from "@/types/enums";

/**
 * Get current workspace role only if it is included in allowedRoles.
 * Returns null if no workspace context or if the role is not allowed.
 */
export async function getCurrentWorkspaceRoleAccess(
  params: {
    allowedRoles: readonly MembershipRole[];
    organizationId?: string | null;
  }
): Promise<CurrentWorkspaceRole | null> {
  if (params.allowedRoles.length === 0) {
    return null;
  }

  const result = await getCurrentWorkspaceRole({
    organizationId: params.organizationId,
  });

  if (!result) {
    return null;
  }

  if (!params.allowedRoles.includes(result.role)) {
    return null;
  }

  return result;
}

/**
 * Require current workspace role to be included in allowedRoles, or throw.
 */
export async function requireCurrentWorkspaceRoleAccess(
  params: {
    allowedRoles: readonly MembershipRole[];
    organizationId?: string | null;
  }
): Promise<CurrentWorkspaceRole> {
  if (params.allowedRoles.length === 0) {
    throw new Error("No allowed roles specified");
  }

  const result = await requireCurrentWorkspaceRole({
    organizationId: params.organizationId,
  });

  if (!params.allowedRoles.includes(result.role)) {
    throw new Error("Insufficient role for this operation");
  }

  return result;
}
