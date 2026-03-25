/**
 * British subject count support types.
 *
 * Minimal contract for counting normalized British subject records
 * by segment, level, and optional minimum grade.
 *
 * No rule types. No evaluator/result types. No persistence types.
 */

import type {
  BritishSubjectSegmentKey,
  NormalizedBritishCurriculumProfile,
  NormalizedBritishSubjectRecord,
} from "./normalized-british-profile";

/** Parameters for counting British subjects from a normalized profile. */
export interface CountBritishSubjectsParams {
  profile: NormalizedBritishCurriculumProfile;
  segmentKeys?: readonly Exclude<BritishSubjectSegmentKey, "other">[];
  subjectLevelKeys?: readonly string[];
  minimumNormalizedGradeValue?: number;
}

/** Result of counting British subjects. */
export interface CountBritishSubjectsResult {
  count: number;
  matchedSubjects: readonly NormalizedBritishSubjectRecord[];
}
