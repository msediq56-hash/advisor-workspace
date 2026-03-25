/**
 * Shared role capability types for the foundation layer.
 * Reuses MembershipRole from src/types/enums.ts — do not duplicate it here.
 */

/** Explicit capability keys for Phase 1 foundation role checks. */
export type RoleCapabilityKey =
  | "manageOrganizationUsers"
  | "manageOrganizationSettings"
  | "editOrganizationOwnedData"
  | "viewOrganizationOwnedData"
  | "runAdvisorWorkspace";
