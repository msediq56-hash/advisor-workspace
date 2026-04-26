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

// ---------------------------------------------------------------------------
// Language certificate (Milestone 2D.1a — type-extension / pass-through only)
// ---------------------------------------------------------------------------

/**
 * Accepted language test types for the optional language certificate.
 * Mirrors Constructor source data section 10.3 ("شهادات اللغة المقبولة").
 * "other" is a capture-only safety valve; it does NOT imply equivalence
 * for any evaluator. It exists so the data contract can record certificates
 * that are not in the explicit list, paired with a free-text label.
 */
export type LanguageTestTypeKey =
  | "ielts"
  | "toefl"
  | "duolingo"
  | "cambridge"
  | "pte"
  | "other";

/**
 * Optional language certificate input.
 *
 * Designed for pass-through: each test type uses its own native score
 * scale (IELTS 0–9, Duolingo 10–160, TOEFL iBT 0–120, Cambridge 100–230,
 * PTE 10–90). No cross-test normalization is performed at any layer; the
 * future language_certificate_minimum evaluator will compare against the
 * native scale per testTypeKey.
 *
 * Strictly OPTIONAL on every profile. Absent input MUST result in the
 * field being omitted from raw and normalized snapshots — NOT set to
 * null — so existing JSONB normalized_profile_snapshot shapes do not
 * change for callers that do not provide a certificate.
 *
 * "other" requires a non-empty testTypeOtherLabel. Other test types may
 * omit testTypeOtherLabel.
 */
export interface LanguageCertificate {
  testTypeKey: LanguageTestTypeKey;
  score: number;
  overallScore?: number;
  testTypeOtherLabel?: string;
  notesAr?: string;
}

/** Common fields shared by all raw qualification profiles. */
export interface RawQualificationProfileBase {
  qualificationFamily: QualificationFamilyKey;
  countryId: string;
  notesAr: string | null;
  /**
   * Optional language certificate. Strictly optional — when absent the
   * field is omitted from the typed shape (do NOT serialize as null).
   */
  languageCertificate?: LanguageCertificate;
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
