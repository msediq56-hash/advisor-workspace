/**
 * Server-side current workspace organization-owned data guards.
 *
 * Composes workspace capability access with readable/writable
 * owner-scope helpers to gate data access by capability + tenant ownership.
 *
 * Read-only check layer — does not perform database writes.
 * Current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getCurrentWorkspaceCapabilityAccess,
  requireCurrentWorkspaceCapabilityAccess,
} from "@/lib/organizations/current-workspace-capability-guards";
import {
  hasReadableOwnerScopeAccess,
  requireReadableOwnerScopeAccess,
} from "@/lib/permissions/readable-owner-scope";
import {
  hasWritableOwnerScopeAccess,
  requireWritableOwnerScopeAccess,
} from "@/lib/permissions/writable-owner-scope";
import type {
  CurrentWorkspaceReadableOwnedDataAccess,
  CurrentWorkspaceWritableOwnedDataAccess,
} from "@/types/workspace-owned-data-access";
import type { OwnerScopedRecordRef } from "@/types/ownership";
import type { MembershipRole } from "@/types/enums";

/**
 * Get readable access to an owner-scoped record in the current workspace.
 * Returns null if no workspace, missing viewOrganizationOwnedData capability,
 * or record is not readable in the current org context.
 */
export async function getCurrentWorkspaceReadableOwnedDataAccess(
  params: {
    record: OwnerScopedRecordRef;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<CurrentWorkspaceReadableOwnedDataAccess | null> {
  const result = await getCurrentWorkspaceCapabilityAccess({
    capability: "viewOrganizationOwnedData",
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  if (!result) {
    return null;
  }

  if (!hasReadableOwnerScopeAccess(result.workspace.orgContext, params.record)) {
    return null;
  }

  return { workspace: result, record: params.record };
}

/**
 * Require readable access to an owner-scoped record, or throw.
 */
export async function requireCurrentWorkspaceReadableOwnedDataAccess(
  params: {
    record: OwnerScopedRecordRef;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<CurrentWorkspaceReadableOwnedDataAccess> {
  const result = await requireCurrentWorkspaceCapabilityAccess({
    capability: "viewOrganizationOwnedData",
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  requireReadableOwnerScopeAccess(result.workspace.orgContext, params.record);

  return { workspace: result, record: params.record };
}

/**
 * Get writable access to an owner-scoped record in the current workspace.
 * Returns null if no workspace, missing editOrganizationOwnedData capability,
 * or record is not writable in the current org context.
 */
export async function getCurrentWorkspaceWritableOwnedDataAccess(
  params: {
    record: OwnerScopedRecordRef;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<CurrentWorkspaceWritableOwnedDataAccess | null> {
  const result = await getCurrentWorkspaceCapabilityAccess({
    capability: "editOrganizationOwnedData",
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  if (!result) {
    return null;
  }

  if (!hasWritableOwnerScopeAccess(result.workspace.orgContext, params.record)) {
    return null;
  }

  return { workspace: result, record: params.record };
}

/**
 * Require writable access to an owner-scoped record, or throw.
 */
export async function requireCurrentWorkspaceWritableOwnedDataAccess(
  params: {
    record: OwnerScopedRecordRef;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<CurrentWorkspaceWritableOwnedDataAccess> {
  const result = await requireCurrentWorkspaceCapabilityAccess({
    capability: "editOrganizationOwnedData",
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  requireWritableOwnerScopeAccess(result.workspace.orgContext, params.record);

  return { workspace: result, record: params.record };
}
