/**
 * Shared organization branding settings access type for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { OrganizationBrandingSummary } from "./organization-branding";

/** Current workspace capability access combined with resolved branding summary. */
export interface CurrentOrganizationBrandingSettingsAccess {
  workspace: CurrentWorkspaceCapabilities;
  branding: OrganizationBrandingSummary;
}
