/**
 * Normalized British curriculum profile types.
 *
 * Preserves subject records with normalized keys, numeric grade values,
 * and countability baseline. No evaluator/result types. No persistence types.
 */

import type { LanguageCertificate } from "./qualification-raw-profile";

/** British subject segment classification. */
export type BritishSubjectSegmentKey = "o_level" | "as_level" | "a_level" | "other";

/** Normalized single British subject record with keys and numeric grade value. */
export interface NormalizedBritishSubjectRecord {
  subjectName: string;
  subjectLevel: string;
  segmentKey: BritishSubjectSegmentKey;
  subjectLevelKey: string;
  grade: string;
  gradeNormalizedKey: string;
  normalizedGradeValue: number;
  isCountable: boolean;
  notesAr: string | null;
}

/** Normalized British curriculum header. */
export interface NormalizedBritishHeader {
  curriculumLabel: string;
  graduationYear: number;
  notesAr: string | null;
}

/** Normalized British curriculum profile with subject-level grade values. */
export interface NormalizedBritishCurriculumProfile {
  qualificationFamily: "british_curriculum";
  countryId: string;
  notesAr: string | null;
  header: NormalizedBritishHeader;
  subjects: readonly NormalizedBritishSubjectRecord[];
  /**
   * Optional language certificate (Milestone 2D.1a). Strictly optional —
   * when absent the field is omitted entirely (NOT null) so the JSONB
   * snapshot shape is unchanged for callers that do not provide one.
   */
  languageCertificate?: LanguageCertificate;
}
