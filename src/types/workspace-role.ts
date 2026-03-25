/**
 * Shared workspace role type for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceContext } from "./workspace-context";
import type { MembershipRole } from "./enums";

/** Current workspace context with the resolved membership role. */
export interface CurrentWorkspaceRole {
  workspace: CurrentWorkspaceContext;
  role: MembershipRole;
}
