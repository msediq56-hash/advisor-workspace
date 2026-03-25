/**
 * Server-side current organization branding settings access helper.
 *
 * Composes workspace capability access (manageOrganizationSettings)
 * with the current organization branding summary.
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
  getCurrentOrganizationBrandingSummary,
  requireCurrentOrganizationBrandingSummary,
} from "@/lib/organizations/current-organization-branding";
import type { CurrentOrganizationBrandingSettingsAccess } from "@/types/organization-branding-access";
import type { MembershipRole } from "@/types/enums";

/**
 * Get current organization branding settings access.
 * Returns null if no workspace capability access (manageOrganizationSettings)
 * or no accessible branding summary.
 */
export async function getCurrentOrganizationBrandingSettingsAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentOrganizationBrandingSettingsAccess | null> {
  const workspace = await getCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationSettings",
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  });

  if (!workspace) {
    return null;
  }

  const branding = await getCurrentOrganizationBrandingSummary({
    organizationId: params?.organizationId,
  });

  if (!branding) {
    return null;
  }

  return { workspace, branding };
}

/**
 * Require current organization branding settings access, or throw.
 */
export async function requireCurrentOrganizationBrandingSettingsAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentOrganizationBrandingSettingsAccess> {
  const workspace = await requireCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationSettings",
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  });

  const branding = await requireCurrentOrganizationBrandingSummary({
    organizationId: params?.organizationId,
  });

  return { workspace, branding };
}
