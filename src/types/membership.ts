/**
 * Shared membership types for the foundation layer.
 * Reuses enum unions from src/types/enums.ts — do not duplicate them here.
 */

import type { MembershipRole, MembershipStatus } from "./enums";

/** Minimal read-only summary of an accessible membership. */
export interface MembershipSummary {
  id: string;
  userId: string;
  organizationId: string;
  roleKey: MembershipRole;
  membershipStatus: MembershipStatus;
}
