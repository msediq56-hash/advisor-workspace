/**
 * Server-side current workspace bootstrap helper.
 *
 * Resolves the minimal bootstrap payload for the advisor workspace
 * by composing workspace run access with organization branding.
 *
 * Read-only, current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getCurrentWorkspaceRunAccess,
  requireCurrentWorkspaceRunAccess,
} from "@/lib/organizations/current-workspace-run-access";
import {
  getCurrentOrganizationBrandingSummary,
  requireCurrentOrganizationBrandingSummary,
} from "@/lib/organizations/current-organization-branding";
import type { CurrentWorkspaceBootstrap } from "@/types/workspace-bootstrap";
import type { MembershipRole } from "@/types/enums";

/**
 * Get the current workspace bootstrap payload.
 * Returns null if no workspace run access or no branding summary.
 */
export async function getCurrentWorkspaceBootstrap(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceBootstrap | null> {
  const runAccess = await getCurrentWorkspaceRunAccess(params);

  if (!runAccess) {
    return null;
  }

  const branding = await getCurrentOrganizationBrandingSummary({
    organizationId: params?.organizationId,
  });

  if (!branding) {
    return null;
  }

  return { workspace: runAccess.workspace, branding };
}

/**
 * Require the current workspace bootstrap payload, or throw.
 */
export async function requireCurrentWorkspaceBootstrap(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceBootstrap> {
  const runAccess = await requireCurrentWorkspaceRunAccess(params);

  const branding = await requireCurrentOrganizationBrandingSummary({
    organizationId: params?.organizationId,
  });

  return { workspace: runAccess.workspace, branding };
}
