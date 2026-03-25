/**
 * Shared workspace bootstrap type for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { OrganizationBrandingSummary } from "./organization-branding";

/** Minimal current workspace bootstrap payload for the advisor workspace. */
export interface CurrentWorkspaceBootstrap {
  workspace: CurrentWorkspaceCapabilities;
  branding: OrganizationBrandingSummary;
}
