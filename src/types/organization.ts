/**
 * Shared organization types for the foundation layer.
 * Reuses enum unions from src/types/enums.ts — do not duplicate them here.
 */

import type { OrganizationStatus } from "./enums";

/** Minimal read-only summary of an accessible organization. */
export interface OrganizationSummary {
  id: string;
  slug: string;
  nameAr: string;
  status: OrganizationStatus;
}
