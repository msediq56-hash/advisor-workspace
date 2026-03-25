/**
 * Server-side current workspace capabilities helper.
 *
 * Composes current workspace context with the fixed role-capability
 * mapping to produce the enabled capabilities for the current actor.
 *
 * Read-only, current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getCurrentWorkspaceContext,
  requireCurrentWorkspaceContext,
} from "@/lib/organizations/current-workspace-context";
import { getRoleCapabilities } from "@/lib/permissions/role-capabilities";
import type { CurrentWorkspaceCapabilities } from "@/types/workspace-capabilities";
import type { MembershipRole } from "@/types/enums";

/**
 * Get the current workspace capabilities.
 * Returns null if no current workspace context is available.
 */
export async function getCurrentWorkspaceCapabilities(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceCapabilities | null> {
  const workspace = await getCurrentWorkspaceContext(params);

  if (!workspace) {
    return null;
  }

  const capabilities = getRoleCapabilities(workspace.membership.roleKey);

  return { workspace, capabilities };
}

/**
 * Require the current workspace capabilities, or throw.
 */
export async function requireCurrentWorkspaceCapabilities(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceCapabilities> {
  const workspace = await requireCurrentWorkspaceContext(params);
  const capabilities = getRoleCapabilities(workspace.membership.roleKey);

  return { workspace, capabilities };
}
