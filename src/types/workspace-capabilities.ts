/**
 * Shared workspace capabilities type for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceContext } from "./workspace-context";
import type { RoleCapabilityKey } from "./role-capabilities";

/** Current workspace context with resolved role capabilities. */
export interface CurrentWorkspaceCapabilities {
  workspace: CurrentWorkspaceContext;
  capabilities: readonly RoleCapabilityKey[];
}
