/**
 * Shared organization members read access types for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { MembershipSummary } from "./membership";
import type { UserProfileSummary } from "./user-profiles-read";

/** A single organization member: membership paired with optional profile. */
export interface OrganizationMemberSummary {
  membership: MembershipSummary;
  profile: UserProfileSummary | null;
}

/** Current workspace capability access with readable organization members. */
export interface CurrentOrganizationMembersReadAccess {
  workspace: CurrentWorkspaceCapabilities;
  members: readonly OrganizationMemberSummary[];
}
