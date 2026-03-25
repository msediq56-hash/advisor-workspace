/**
 * Shared types for active catalog reference lists.
 * These cover the global reference tables: countries, university_types, degrees.
 *
 * Reuses existing workspace types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";

/** A single active country option from the catalog. */
export interface CatalogCountryOption {
  id: string;
  code: string;
  nameAr: string;
}

/** A single active university type option from the catalog. */
export interface CatalogUniversityTypeOption {
  id: string;
  key: string;
  nameAr: string;
}

/** A single active degree option from the catalog. */
export interface CatalogDegreeOption {
  id: string;
  key: string;
  nameAr: string;
  levelRank: number;
}

/** Active catalog reference lists with workspace access context. */
export interface ActiveCatalogReferenceLists {
  workspace: CurrentWorkspaceCapabilities;
  countries: readonly CatalogCountryOption[];
  universityTypes: readonly CatalogUniversityTypeOption[];
  degrees: readonly CatalogDegreeOption[];
}
