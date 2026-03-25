/**
 * Normalized British curriculum profile types.
 *
 * Preserves subject records with added normalized numeric grade values.
 * No countable flags. No evaluator/result types. No persistence types.
 */

/** Normalized single British subject record with numeric grade value. */
export interface NormalizedBritishSubjectRecord {
  subjectName: string;
  subjectLevel: string;
  grade: string;
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
