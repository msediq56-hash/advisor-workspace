/**
 * Shared ownership/tenant-scope types.
 * Based on the owner_scope / owner_organization_id model from Migration 1.
 */

import type { OwnerScope } from "./enums";

/** Base reference for any record that carries owner_scope / owner_organization_id. */
export interface OwnerScopedRecordRef {
  ownerScope: OwnerScope;
  ownerOrganizationId: string | null;
}

/** A platform-owned record: ownerScope = 'platform', ownerOrganizationId = null. */
export interface PlatformOwnedRecordRef extends OwnerScopedRecordRef {
  ownerScope: "platform";
  ownerOrganizationId: null;
}

/** An organization-owned record: ownerScope = 'organization', ownerOrganizationId = non-empty string. */
export interface OrganizationOwnedRecordRef extends OwnerScopedRecordRef {
  ownerScope: "organization";
  ownerOrganizationId: string;
}
