/**
 * Pure counting helper for normalized British subject records.
 *
 * Counts only countable subjects, with optional segment, level,
 * and minimum grade filters applied in AND manner.
 *
 * No rule execution. No evaluator logic. No persistence.
 * Pure sync function — no DB access.
 */

import type {
  CountBritishSubjectsParams,
  CountBritishSubjectsResult,
} from "@/types/british-subject-count-support";

/**
 * Count countable British subjects from a normalized profile.
 * Applies optional segment, level, and minimum grade filters.
 */
export function countBritishSubjects(
  params: CountBritishSubjectsParams
): CountBritishSubjectsResult {
  const { profile, segmentKeys, subjectLevelKeys, minimumNormalizedGradeValue } = params;

  const segmentSet = segmentKeys ? new Set<string>(segmentKeys) : null;
  const levelSet = subjectLevelKeys ? new Set(subjectLevelKeys) : null;

  const matchedSubjects = profile.subjects.filter((s) => {
    if (!s.isCountable) return false;
    if (segmentSet && !segmentSet.has(s.segmentKey)) return false;
    if (levelSet && !levelSet.has(s.subjectLevelKey)) return false;
    if (
      minimumNormalizedGradeValue !== undefined &&
      s.normalizedGradeValue < minimumNormalizedGradeValue
    ) {
      return false;
    }
    return true;
  });

  return {
    count: matchedSubjects.length,
    matchedSubjects,
  };
}
