/**
 * Shared organization members management access type for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { OrganizationMemberSummary } from "./organization-members-read";

/** Current workspace capability access for organization members management (read). */
export interface CurrentOrganizationMembersManagementAccess {
  workspace: CurrentWorkspaceCapabilities;
  members: readonly OrganizationMemberSummary[];
}
