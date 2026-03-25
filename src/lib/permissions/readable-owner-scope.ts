/**
 * Read-side tenant scope helper for owner-scoped records.
 *
 * Defines the shared read rule:
 * - platform-owned records are readable from any resolved org context
 * - organization-owned records are readable only from the same organization
 *
 * This is read-scope only. It does NOT imply write access,
 * platform edit rights, or cross-org access.
 *
 * No database access. No Supabase client. No side effects.
 */

import type { ResolvedOrgContext } from "@/types/auth";
import type {
  OwnerScopedRecordRef,
  PlatformOwnedRecordRef,
  OrganizationOwnedRecordRef,
} from "@/types/ownership";
import {
  hasValidOwnershipShape,
  isPlatformOwned,
  isOwnedByOrganization,
  requireValidOwnershipShape,
} from "@/lib/permissions/ownership";

/**
 * Return the two readable ownership refs for a resolved org context:
 * 1. platform-owned (readable from any org)
 * 2. organization-owned by context.organizationId
 */
export function getReadableOwnerScopeRefs(
  context: ResolvedOrgContext
): readonly [PlatformOwnedRecordRef, OrganizationOwnedRecordRef] {
  return [
    { ownerScope: "platform", ownerOrganizationId: null },
    { ownerScope: "organization", ownerOrganizationId: context.organizationId },
  ] as const;
}

/**
 * Check whether a record is readable from the resolved org context.
 * True when the record has a valid ownership shape and is either
 * platform-owned or organization-owned by context.organizationId.
 */
export function hasReadableOwnerScopeAccess(
  context: ResolvedOrgContext,
  record: OwnerScopedRecordRef
): boolean {
  if (!hasValidOwnershipShape(record)) {
    return false;
  }
  return (
    isPlatformOwned(record) ||
    isOwnedByOrganization(record, context.organizationId)
  );
}

/**
 * Require read access for the resolved org context, or throw.
 * Throws on invalid ownership shape or organization-owned record
 * belonging to a different organization.
 */
export function requireReadableOwnerScopeAccess<
  T extends OwnerScopedRecordRef,
>(context: ResolvedOrgContext, record: T): T {
  requireValidOwnershipShape(record);
  if (!hasReadableOwnerScopeAccess(context, record)) {
    throw new Error(
      `Record not readable from organization '${context.organizationId}'`
    );
  }
  return record;
}
