/**
 * Shared workspace run access type for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";

/** Current workspace capability access for running the advisor workspace. */
export interface CurrentWorkspaceRunAccess {
  workspace: CurrentWorkspaceCapabilities;
}
