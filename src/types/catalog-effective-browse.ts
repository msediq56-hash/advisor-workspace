/**
 * Shared read-only types for the effective activated catalog browse service.
 * Flat array shapes with foreign keys — no nested trees.
 * Reuses existing workspace types. Do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";

/** University summary derived from effective activated offerings. */
export interface CatalogBrowseUniversity {
  id: string;
  countryId: string;
  universityTypeId: string;
  nameAr: string;
  nameEn: string | null;
}

/** Program summary derived from effective activated offerings. */
export interface CatalogBrowseProgram {
  id: string;
  universityId: string;
  facultyId: string | null;
  degreeId: string;
  programCode: string | null;
  titleAr: string;
  titleEn: string | null;
  canonicalSearchTitleAr: string;
}

/** Effective catalog offering with organization overlay values applied. */
export interface EffectiveCatalogOffering {
  id: string;
  programId: string;
  intakeLabelAr: string;
  intakeTermKey: string | null;
  intakeYear: number | null;
  campusNameAr: string | null;
  studyModeKey: string | null;
  durationMonths: number | null;
  teachingLanguageKey: string | null;
  annualTuitionAmount: number | null;
  currencyCode: string;
  applicationFeeAmount: number | null;
  extraFeeNoteAr: string | null;
  scholarshipNoteAr: string | null;
}

/** Effective activated catalog browse result for the current workspace. */
export interface EffectiveCatalogBrowse {
  workspace: CurrentWorkspaceCapabilities;
  universities: readonly CatalogBrowseUniversity[];
  programs: readonly CatalogBrowseProgram[];
  offerings: readonly EffectiveCatalogOffering[];
}
