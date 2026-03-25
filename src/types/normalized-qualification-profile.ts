/**
 * Normalized qualification profile types for Direct Evaluation.
 *
 * Includes baseline normalization for simple-form families and
 * British specialized normalization.
 *
 * No evaluator/result types. No persistence types. No UI-only types.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { EffectiveTargetOfferingContext } from "./catalog-target-context";
import type { ActiveQualificationDefinitionRead } from "./qualification-definition-read";
import type { NormalizedBritishCurriculumProfile } from "./normalized-british-profile";

// ---------------------------------------------------------------------------
// Supported normalized families (baseline — no British)
// ---------------------------------------------------------------------------

export type NormalizedQualificationFamilyKey =
  | "arabic_secondary"
  | "american_high_school"
  | "international_baccalaureate";

// ---------------------------------------------------------------------------
// Normalized family profiles
// ---------------------------------------------------------------------------

export interface NormalizedArabicSecondaryProfile {
  qualificationFamily: "arabic_secondary";
  countryId: string;
  certificateName: string;
  finalAverage: number;
  gradingScale: string;
  graduationYear: number;
  notesAr: string | null;
}

export interface NormalizedAmericanHighSchoolProfile {
  qualificationFamily: "american_high_school";
  countryId: string;
  gpa: number;
  gpaScale: string;
  graduationYear: number;
  satTotal: number | null;
  notesAr: string | null;
}

export interface NormalizedIBProfile {
  qualificationFamily: "international_baccalaureate";
  countryId: string;
  diplomaType: string;
  totalPoints: number;
  graduationYear: number;
  notesAr: string | null;
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type NormalizedQualificationProfile =
  | NormalizedArabicSecondaryProfile
  | NormalizedAmericanHighSchoolProfile
  | NormalizedIBProfile
  | NormalizedBritishCurriculumProfile;

// ---------------------------------------------------------------------------
// Bundled normalized output
// ---------------------------------------------------------------------------

/** Normalized Direct Evaluation input — ready for future rule evaluation. */
export interface NormalizedDirectEvaluationInput {
  workspace: CurrentWorkspaceCapabilities;
  target: EffectiveTargetOfferingContext;
  qualificationDefinition: ActiveQualificationDefinitionRead;
  normalizedProfile: NormalizedQualificationProfile;
}
