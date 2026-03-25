/**
 * Server-side current workspace capability guards.
 *
 * Composes current workspace capabilities with role-capability checks
 * to gate access by a specific capability key.
 *
 * Read-only, current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getCurrentWorkspaceCapabilities,
  requireCurrentWorkspaceCapabilities,
} from "@/lib/organizations/current-workspace-capabilities";
import { hasRoleCapability } from "@/lib/permissions/role-capabilities";
import type { CurrentWorkspaceCapabilities } from "@/types/workspace-capabilities";
import type { RoleCapabilityKey } from "@/types/role-capabilities";
import type { MembershipRole } from "@/types/enums";

/**
 * Get current workspace capabilities only if the requested capability is enabled.
 * Returns null if no workspace context or if the capability is not enabled.
 */
export async function getCurrentWorkspaceCapabilityAccess(
  params: {
    capability: RoleCapabilityKey;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<CurrentWorkspaceCapabilities | null> {
  const result = await getCurrentWorkspaceCapabilities({
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  if (!result) {
    return null;
  }

  if (!hasRoleCapability(result.workspace.membership.roleKey, params.capability)) {
    return null;
  }

  return result;
}

/**
 * Require current workspace capabilities with a specific capability enabled, or throw.
 */
export async function requireCurrentWorkspaceCapabilityAccess(
  params: {
    capability: RoleCapabilityKey;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<CurrentWorkspaceCapabilities> {
  const result = await requireCurrentWorkspaceCapabilities({
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  if (!hasRoleCapability(result.workspace.membership.roleKey, params.capability)) {
    throw new Error(`Missing required capability: ${params.capability}`);
  }

  return result;
}
