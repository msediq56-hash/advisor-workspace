/**
 * Shared read-only types for the Direct Evaluation catalog selection service.
 * Flat option arrays for stepwise selection: country → universityType → university → degree → program → offering.
 *
 * Reuses reference-list and browse types. Do not duplicate shapes here.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type {
  CatalogCountryOption,
  CatalogUniversityTypeOption,
  CatalogDegreeOption,
} from "./catalog-reference-lists";

/** University option for Direct Evaluation selection. */
export interface CatalogSelectionUniversityOption {
  id: string;
  nameAr: string;
  nameEn: string | null;
}

/** Program option for Direct Evaluation selection. */
export interface CatalogSelectionProgramOption {
  id: string;
  programCode: string | null;
  titleAr: string;
  titleEn: string | null;
}

/** Offering option for Direct Evaluation selection (effective overlay values applied). */
export interface CatalogSelectionOfferingOption {
  id: string;
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

/** Effective catalog selection options for Direct Evaluation. */
export interface EffectiveCatalogSelectionOptions {
  workspace: CurrentWorkspaceCapabilities;
  countries: readonly CatalogCountryOption[];
  universityTypes: readonly CatalogUniversityTypeOption[];
  universities: readonly CatalogSelectionUniversityOption[];
  degrees: readonly CatalogDegreeOption[];
  programs: readonly CatalogSelectionProgramOption[];
  offerings: readonly CatalogSelectionOfferingOption[];
}
