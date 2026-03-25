/**
 * Shared organization memberships read access type for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { MembershipSummary } from "./membership";

/** Current workspace capability access with readable membership rows. */
export interface CurrentOrganizationMembershipsReadAccess {
  workspace: CurrentWorkspaceCapabilities;
  memberships: readonly MembershipSummary[];
}
