/**
 * Shared user profiles read access types for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";

/** Minimal read-only summary of a user profile. */
export interface UserProfileSummary {
  id: string;
  fullName: string;
  emailNormalized: string;
  isActive: boolean;
}

/** Current workspace capability access with readable user profile rows. */
export interface CurrentOrganizationUserProfilesReadAccess {
  workspace: CurrentWorkspaceCapabilities;
  profiles: readonly UserProfileSummary[];
}
