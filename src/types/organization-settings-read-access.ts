/**
 * Shared organization settings read access type for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { OrganizationSummary } from "./organization";
import type { OrganizationBrandingSummary } from "./organization-branding";

/** Current workspace capability access with organization settings (read). */
export interface CurrentOrganizationSettingsReadAccess {
  workspace: CurrentWorkspaceCapabilities;
  organization: OrganizationSummary;
  branding: OrganizationBrandingSummary;
}
