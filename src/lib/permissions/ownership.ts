/**
 * Pure ownership shape validation and organization ownership checks.
 * No database access. No Supabase client. No side effects.
 */

import type { OwnerScopedRecordRef } from "@/types/ownership";

/**
 * Check whether the record has a valid ownership shape:
 * - platform => ownerOrganizationId must be null
 * - organization => ownerOrganizationId must be a non-empty string
 */
export function hasValidOwnershipShape(record: OwnerScopedRecordRef): boolean {
  if (record.ownerScope === "platform") {
    return record.ownerOrganizationId === null;
  }
  if (record.ownerScope === "organization") {
    return (
      typeof record.ownerOrganizationId === "string" &&
      record.ownerOrganizationId.length > 0
    );
  }
  return false;
}

/** True only when ownerScope = 'platform' and ownerOrganizationId = null. */
export function isPlatformOwned(record: OwnerScopedRecordRef): boolean {
  return record.ownerScope === "platform" && record.ownerOrganizationId === null;
}

/** True only when ownerScope = 'organization' and ownerOrganizationId is a non-empty string. */
export function isOrganizationOwned(record: OwnerScopedRecordRef): boolean {
  return (
    record.ownerScope === "organization" &&
    typeof record.ownerOrganizationId === "string" &&
    record.ownerOrganizationId.length > 0
  );
}

/**
 * True only when the record is organization-owned and its ownerOrganizationId
 * exactly equals the provided organizationId.
 * Returns false for platform-owned records.
 */
export function isOwnedByOrganization(
  record: OwnerScopedRecordRef,
  organizationId: string
): boolean {
  return (
    isOrganizationOwned(record) &&
    record.ownerOrganizationId === organizationId
  );
}

/** Throw if the ownership shape is invalid; otherwise return the record unchanged. */
export function requireValidOwnershipShape<T extends OwnerScopedRecordRef>(
  record: T
): T {
  if (!hasValidOwnershipShape(record)) {
    throw new Error(
      `Invalid ownership shape: scope='${record.ownerScope}', ownerOrganizationId='${record.ownerOrganizationId}'`
    );
  }
  return record;
}

/**
 * Require that the record is owned by the specified organization.
 * Throws if ownership shape is invalid, if the record is platform-owned,
 * or if it belongs to a different organization.
 */
export function requireOwnedByOrganization<T extends OwnerScopedRecordRef>(
  record: T,
  organizationId: string
): T {
  requireValidOwnershipShape(record);
  if (!isOwnedByOrganization(record, organizationId)) {
    throw new Error(
      `Record is not owned by organization '${organizationId}'`
    );
  }
  return record;
}
