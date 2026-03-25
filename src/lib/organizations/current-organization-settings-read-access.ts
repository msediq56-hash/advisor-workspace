/**
 * Server-side current organization settings read access helper.
 *
 * Composes workspace capability access (manageOrganizationSettings)
 * with current organization summary and branding summary.
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
  getCurrentOrganizationSummary,
  requireCurrentOrganizationSummary,
} from "@/lib/organizations/current-organization";
import {
  getCurrentOrganizationBrandingSummary,
  requireCurrentOrganizationBrandingSummary,
} from "@/lib/organizations/current-organization-branding";
import type { CurrentOrganizationSettingsReadAccess } from "@/types/organization-settings-read-access";
import type { MembershipRole } from "@/types/enums";

/**
 * Get current organization settings read access.
 * Returns null if no workspace capability access (manageOrganizationSettings),
 * no organization summary, or no branding summary.
 */
export async function getCurrentOrganizationSettingsReadAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentOrganizationSettingsReadAccess | null> {
  const workspace = await getCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationSettings",
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  });

  if (!workspace) {
    return null;
  }

  const organization = await getCurrentOrganizationSummary({
    organizationId: params?.organizationId,
  });

  if (!organization) {
    return null;
  }

  const branding = await getCurrentOrganizationBrandingSummary({
    organizationId: params?.organizationId,
  });

  if (!branding) {
    return null;
  }

  return { workspace, organization, branding };
}

/**
 * Require current organization settings read access, or throw.
 */
export async function requireCurrentOrganizationSettingsReadAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentOrganizationSettingsReadAccess> {
  const workspace = await requireCurrentWorkspaceCapabilityAccess({
    capability: "manageOrganizationSettings",
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  });

  const organization = await requireCurrentOrganizationSummary({
    organizationId: params?.organizationId,
  });

  const branding = await requireCurrentOrganizationBrandingSummary({
    organizationId: params?.organizationId,
  });

  return { workspace, organization, branding };
}
