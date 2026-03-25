/**
 * Shared workspace-owned data access types for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { OwnerScopedRecordRef } from "./ownership";

/** Readable owner-scoped data access in the current workspace. */
export interface CurrentWorkspaceReadableOwnedDataAccess {
  workspace: CurrentWorkspaceCapabilities;
  record: OwnerScopedRecordRef;
}

/** Writable owner-scoped data access in the current workspace. */
export interface CurrentWorkspaceWritableOwnedDataAccess {
  workspace: CurrentWorkspaceCapabilities;
  record: OwnerScopedRecordRef;
}
