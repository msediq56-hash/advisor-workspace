/**
 * Shared read-only type for a resolved effective target offering context.
 * Used by Direct Evaluation to capture the full catalog chain for one selected offering.
 *
 * Reuses existing catalog and workspace types — do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { CatalogCountryOption, CatalogUniversityTypeOption, CatalogDegreeOption } from "./catalog-reference-lists";
import type { CatalogBrowseUniversity, CatalogBrowseProgram, EffectiveCatalogOffering } from "./catalog-effective-browse";

/** Full resolved catalog context for one effective target offering. */
export interface EffectiveTargetOfferingContext {
  workspace: CurrentWorkspaceCapabilities;
  country: CatalogCountryOption;
  universityType: CatalogUniversityTypeOption;
  university: CatalogBrowseUniversity;
  degree: CatalogDegreeOption;
  program: CatalogBrowseProgram;
  offering: EffectiveCatalogOffering;
}
