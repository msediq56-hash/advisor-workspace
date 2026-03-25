/**
 * Write-side tenant scope helper for owner-scoped records.
 *
 * Defines the shared write rule:
 * - organization-owned records are writable only from the same organization
 * - platform-owned records are NOT writable from organization-scoped services
 *
 * This is write-scope only. It does NOT imply platform admin rights,
 * cross-org access, read access rules, or role hierarchy.
 *
 * No database access. No Supabase client. No side effects.
 */

import type { ResolvedOrgContext } from "@/types/auth";
import type { OwnerScopedRecordRef } from "@/types/ownership";
import { hasOrganizationOwnershipAccess } from "@/lib/permissions/organization-ownership";
import { requireValidOwnershipShape } from "@/lib/permissions/ownership";

/**
 * Check whether a record is writable from the resolved org context.
 * True only when the record is organization-owned by context.organizationId.
 * Platform-owned records are never writable from organization-scoped services.
 */
export function hasWritableOwnerScopeAccess(
  context: ResolvedOrgContext,
  record: OwnerScopedRecordRef
): boolean {
  return hasOrganizationOwnershipAccess(context, record);
}

/**
 * Require write access for the resolved org context, or throw.
 * Throws on invalid ownership shape, platform-owned records,
 * or organization-owned records belonging to a different organization.
 */
export function requireWritableOwnerScopeAccess<
  T extends OwnerScopedRecordRef,
>(context: ResolvedOrgContext, record: T): T {
  requireValidOwnershipShape(record);
  if (!hasOrganizationOwnershipAccess(context, record)) {
    throw new Error(
      `Record not writable from organization '${context.organizationId}'`
    );
  }
  return record;
}
