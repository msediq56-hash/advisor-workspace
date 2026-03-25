/**
 * Raw qualification profile types for Direct Evaluation capture.
 *
 * These represent the unprocessed student qualification input before
 * any normalization or evaluation. British curriculum uses a disciplined
 * subject-based model from the start.
 *
 * No DB row types. No evaluator types. No normalization output types.
 */

// ---------------------------------------------------------------------------
// Qualification families
// ---------------------------------------------------------------------------

/** Supported qualification family keys for Direct Evaluation v1. */
export type QualificationFamilyKey =
  | "arabic_secondary"
  | "american_high_school"
  | "british_curriculum"
  | "international_baccalaureate";

// ---------------------------------------------------------------------------
// Base shape
// ---------------------------------------------------------------------------

/** Common fields shared by all raw qualification profiles. */
export interface RawQualificationProfileBase {
  qualificationFamily: QualificationFamilyKey;
  countryId: string;
  notesAr: string | null;
}

// ---------------------------------------------------------------------------
// Arabic secondary
// ---------------------------------------------------------------------------

export interface RawArabicSecondaryProfile extends RawQualificationProfileBase {
  qualificationFamily: "arabic_secondary";
  certificateName: string;
  finalAverage: number;
  gradingScale: string;
  graduationYear: number;
}

// ---------------------------------------------------------------------------
// American high school
// ---------------------------------------------------------------------------

export interface RawAmericanHighSchoolProfile extends RawQualificationProfileBase {
  qualificationFamily: "american_high_school";
  gpa: number;
  gpaScale: string;
  graduationYear: number;
  satTotal: number | null;
}

// ---------------------------------------------------------------------------
// British curriculum (subject-based)
// ---------------------------------------------------------------------------

/** Header-level metadata for a British curriculum profile. */
export interface RawBritishQualificationHeader {
  curriculumLabel: string;
  graduationYear: number;
  notesAr: string | null;
}

/** One subject record within a British curriculum profile. */
export interface RawBritishSubjectRecord {
  subjectName: string;
  subjectLevel: string;
  grade: string;
  notesAr: string | null;
}

/** British curriculum profile — always subject-based, never flattened key/value. */
export interface RawBritishCurriculumProfile extends RawQualificationProfileBase {
  qualificationFamily: "british_curriculum";
  header: RawBritishQualificationHeader;
  subjects: readonly RawBritishSubjectRecord[];
}

// ---------------------------------------------------------------------------
// International Baccalaureate
// ---------------------------------------------------------------------------

export interface RawIBProfile extends RawQualificationProfileBase {
  qualificationFamily: "international_baccalaureate";
  diplomaType: string;
  totalPoints: number;
  graduationYear: number;
  notesAr: string | null;
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

/** Raw qualification profile — discriminated on qualificationFamily. */
export type RawQualificationProfile =
  | RawArabicSecondaryProfile
  | RawAmericanHighSchoolProfile
  | RawBritishCurriculumProfile
  | RawIBProfile;
