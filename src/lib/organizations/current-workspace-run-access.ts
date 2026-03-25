/**
 * Server-side advisor workspace run access helper.
 *
 * Resolves whether the current actor can run the advisor workspace
 * in the current resolved organization using the runAdvisorWorkspace capability.
 *
 * Read-only, current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getCurrentWorkspaceCapabilityAccess,
  requireCurrentWorkspaceCapabilityAccess,
} from "@/lib/organizations/current-workspace-capability-guards";
import type { CurrentWorkspaceRunAccess } from "@/types/workspace-run-access";
import type { MembershipRole } from "@/types/enums";

/**
 * Get current workspace run access.
 * Returns null if no workspace capability access (runAdvisorWorkspace).
 */
export async function getCurrentWorkspaceRunAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceRunAccess | null> {
  const workspace = await getCurrentWorkspaceCapabilityAccess({
    capability: "runAdvisorWorkspace",
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  });

  if (!workspace) {
    return null;
  }

  return { workspace };
}

/**
 * Require current workspace run access, or throw.
 */
export async function requireCurrentWorkspaceRunAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceRunAccess> {
  const workspace = await requireCurrentWorkspaceCapabilityAccess({
    capability: "runAdvisorWorkspace",
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  });

  return { workspace };
}
