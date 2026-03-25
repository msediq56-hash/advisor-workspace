/**
 * Normalized British curriculum profile types.
 *
 * Preserves subject records with added normalized keys and numeric grade values.
 * No countable flags. No evaluator/result types. No persistence types.
 */

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
}
