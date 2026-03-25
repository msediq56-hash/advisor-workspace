/**
 * Pure helper that composes resolved org context with owner-scoped
 * record ownership for exact tenant ownership enforcement.
 *
 * No database access. No Supabase client. No side effects.
 */

import type { ResolvedOrgContext } from "@/types/auth";
import type {
  OwnerScopedRecordRef,
  OrganizationOwnedRecordRef,
} from "@/types/ownership";
import {
  isOwnedByOrganization,
  requireOwnedByOrganization,
} from "@/lib/permissions/ownership";

/**
 * Derive an organization-owned ownership reference from the resolved org context.
 */
export function getOrganizationOwnershipRef(
  context: ResolvedOrgContext
): OrganizationOwnedRecordRef {
  return {
    ownerScope: "organization",
    ownerOrganizationId: context.organizationId,
  };
}

/**
 * Check whether the record is owned by the same organization as the resolved context.
 * Returns false for platform-owned records, invalid shapes, or different organizations.
 */
export function hasOrganizationOwnershipAccess(
  context: ResolvedOrgContext,
  record: OwnerScopedRecordRef
): boolean {
  return isOwnedByOrganization(record, context.organizationId);
}

/**
 * Require that the record is owned by the same organization as the resolved context.
 * Throws on invalid shape, platform-owned, or different organization.
 */
export function requireOrganizationOwnershipAccess<
  T extends OwnerScopedRecordRef,
>(context: ResolvedOrgContext, record: T): T {
  return requireOwnedByOrganization(record, context.organizationId);
}
