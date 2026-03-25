/**
 * Server-side current workspace role helper.
 *
 * Resolves the current membership role from the current workspace context.
 *
 * Read-only, current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getCurrentWorkspaceContext,
  requireCurrentWorkspaceContext,
} from "@/lib/organizations/current-workspace-context";
import type { CurrentWorkspaceRole } from "@/types/workspace-role";
import type { MembershipRole } from "@/types/enums";

/**
 * Get the current workspace role.
 * Returns null if no current workspace context is available.
 */
export async function getCurrentWorkspaceRole(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceRole | null> {
  const workspace = await getCurrentWorkspaceContext(params);

  if (!workspace) {
    return null;
  }

  return { workspace, role: workspace.membership.roleKey };
}

/**
 * Require the current workspace role, or throw.
 */
export async function requireCurrentWorkspaceRole(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceRole> {
  const workspace = await requireCurrentWorkspaceContext(params);
  return { workspace, role: workspace.membership.roleKey };
}
