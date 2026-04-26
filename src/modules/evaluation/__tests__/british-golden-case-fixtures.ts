/**
 * Golden-case fixtures for British direct-evaluation verification baseline.
 *
 * Each fixture defines a realistic PreparedBritishDirectEvaluation and
 * ResolvedDirectEvaluationRuleContext that can be fed directly into the
 * execution → assembly → rendering path without DB access.
 *
 * Covers the current supported British subject-based rule surface:
 * - minimum_subject_count
 * - required_subject_exists
 * - minimum_subject_grade
 */

import type { PreparedBritishDirectEvaluation } from "@/types/prepared-british-direct-evaluation";
import type { ResolvedDirectEvaluationRuleContext } from "@/types/direct-evaluation-resolved-rule-context";

// ---------------------------------------------------------------------------
// Shared British student profile
// ---------------------------------------------------------------------------

const BRITISH_NORMALIZED_PROFILE = {
  qualificationFamily: "british_curriculum" as const,
  countryId: "country-de",
  notesAr: null,
  header: {
    curriculumLabel: "A-Level",
    graduationYear: 2025,
    notesAr: null,
  },
  // Grade values use the canonical British runtime ordinal scale
  // (A* = 8, A = 7, B = 6, C = 5, D = 4, E = 3, F = 2, G = 1, U = 0).
  // gradeNormalizedKey is uppercase, matching the real normalizer.
  subjects: [
    {
      subjectName: "Mathematics",
      subjectLevel: "A-Level",
      segmentKey: "a_level" as const,
      subjectLevelKey: "a_level",
      grade: "A",
      gradeNormalizedKey: "A",
      normalizedGradeValue: 7,
      isCountable: true,
      notesAr: null,
    },
    {
      subjectName: "Physics",
      subjectLevel: "A-Level",
      segmentKey: "a_level" as const,
      subjectLevelKey: "a_level",
      grade: "B",
      gradeNormalizedKey: "B",
      normalizedGradeValue: 6,
      isCountable: true,
      notesAr: null,
    },
    {
      subjectName: "Chemistry",
      subjectLevel: "A-Level",
      segmentKey: "a_level" as const,
      subjectLevelKey: "a_level",
      grade: "C",
      gradeNormalizedKey: "C",
      normalizedGradeValue: 5,
      isCountable: true,
      notesAr: null,
    },
    {
      subjectName: "Biology",
      subjectLevel: "A-Level",
      segmentKey: "a_level" as const,
      subjectLevelKey: "a_level",
      grade: "B",
      gradeNormalizedKey: "B",
      normalizedGradeValue: 6,
      isCountable: true,
      notesAr: null,
    },
    {
      subjectName: "English",
      subjectLevel: "AS-Level",
      segmentKey: "as_level" as const,
      subjectLevelKey: "as_level",
      grade: "B",
      gradeNormalizedKey: "B",
      normalizedGradeValue: 6,
      isCountable: true,
      notesAr: null,
    },
  ],
};

/**
 * Minimal prepared input stub — only normalizedProfile matters for
 * execution → assembly → rendering.
 */
function makePrepared(): PreparedBritishDirectEvaluation {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: BRITISH_NORMALIZED_PROFILE,
  };
}

// ---------------------------------------------------------------------------
// Helper: build a resolved context from rule groups
// ---------------------------------------------------------------------------

function makeResolvedContext(
  ruleGroups: ResolvedDirectEvaluationRuleContext["ruleGroups"],
): ResolvedDirectEvaluationRuleContext {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: BRITISH_NORMALIZED_PROFILE as never,
    status: "supported",
    resolvedRuleSet: {
      ruleSetId: "rs-golden",
      ruleSetVersionId: "rsv-golden",
      targetScope: "offering",
      qualificationTypeId: "qt-british",
    },
    ruleGroups,
  };
}

// ---------------------------------------------------------------------------
// GOLDEN CASE 1: eligible
// ---------------------------------------------------------------------------
// Student has 5 countable subjects, mathematics exists, mathematics grade 7 (A) ≥ 6 (B).
// All rules pass in one blocking group.

export const GOLDEN_ELIGIBLE = {
  label: "British student fully eligible — all blocking rules pass",
  prepared: makePrepared(),
  resolvedContext: makeResolvedContext([
    {
      ruleGroupId: "rg-blocking-1",
      groupKey: "academic_requirements",
      groupSeverity: "blocking",
      groupEvaluationMode: "all_required",
      orderIndex: 0,
      rules: [
        {
          ruleId: "r-count",
          ruleTypeKey: "minimum_subject_count",
          ruleConfig: {
            segment: "a_level",
            minimumCount: 3,
          },
          orderIndex: 0,
        },
        {
          ruleId: "r-exists",
          ruleTypeKey: "required_subject_exists",
          ruleConfig: {
            subjectNamesNormalized: ["mathematics"],
          },
          orderIndex: 1,
        },
        {
          ruleId: "r-grade",
          ruleTypeKey: "minimum_subject_grade",
          ruleConfig: {
            subjectNameNormalized: "mathematics",
            // Threshold 6 (B). Mathematics is 7 (A) → passes.
            minimumGradeValue: 6,
          },
          orderIndex: 2,
        },
      ],
    },
  ]),
  expected: {
    finalStatus: "eligible" as const,
    primaryReasonKey: "all_required_groups_satisfied",
    ruleOutcomes: {
      "r-count": "passed",
      "r-exists": "passed",
      "r-grade": "passed",
    },
  },
};

// ---------------------------------------------------------------------------
// GOLDEN CASE 2: not_eligible
// ---------------------------------------------------------------------------
// Same student, but the minimum_subject_grade threshold for mathematics is 8 (A*).
// Student has 7 (A). Blocking group fails → not_eligible.

export const GOLDEN_NOT_ELIGIBLE = {
  label: "British student not eligible — minimum grade threshold not met in blocking group",
  prepared: makePrepared(),
  resolvedContext: makeResolvedContext([
    {
      ruleGroupId: "rg-blocking-1",
      groupKey: "academic_requirements",
      groupSeverity: "blocking",
      groupEvaluationMode: "all_required",
      orderIndex: 0,
      rules: [
        {
          ruleId: "r-count",
          ruleTypeKey: "minimum_subject_count",
          ruleConfig: {
            segment: "a_level",
            minimumCount: 3,
          },
          orderIndex: 0,
        },
        {
          ruleId: "r-exists",
          ruleTypeKey: "required_subject_exists",
          ruleConfig: {
            subjectNamesNormalized: ["mathematics"],
          },
          orderIndex: 1,
        },
        {
          ruleId: "r-grade",
          ruleTypeKey: "minimum_subject_grade",
          ruleConfig: {
            subjectNameNormalized: "mathematics",
            // Threshold 8 (A*). Mathematics is 7 (A) → fails.
            minimumGradeValue: 8,
          },
          orderIndex: 2,
        },
      ],
    },
  ]),
  expected: {
    finalStatus: "not_eligible" as const,
    primaryReasonKey: "blocking_group_failed",
    ruleOutcomes: {
      "r-count": "passed",
      "r-exists": "passed",
      "r-grade": "failed",
    },
  },
};

// ---------------------------------------------------------------------------
// GOLDEN CASE 3: conditional
// ---------------------------------------------------------------------------
// Student passes all blocking rules but fails a conditional group's
// minimum_subject_grade rule (Physics grade 6 (B) < required 7 (A)).

export const GOLDEN_CONDITIONAL = {
  label: "British student conditional — blocking passes but conditional group fails",
  prepared: makePrepared(),
  resolvedContext: makeResolvedContext([
    {
      ruleGroupId: "rg-blocking-1",
      groupKey: "core_requirements",
      groupSeverity: "blocking",
      groupEvaluationMode: "all_required",
      orderIndex: 0,
      rules: [
        {
          ruleId: "r-count",
          ruleTypeKey: "minimum_subject_count",
          ruleConfig: {
            segment: "a_level",
            minimumCount: 3,
          },
          orderIndex: 0,
        },
        {
          ruleId: "r-exists",
          ruleTypeKey: "required_subject_exists",
          ruleConfig: {
            subjectNamesNormalized: ["mathematics"],
          },
          orderIndex: 1,
        },
      ],
    },
    {
      ruleGroupId: "rg-conditional-1",
      groupKey: "preferred_grades",
      groupSeverity: "conditional",
      groupEvaluationMode: "all_required",
      orderIndex: 1,
      rules: [
        {
          ruleId: "r-grade-physics",
          ruleTypeKey: "minimum_subject_grade",
          ruleConfig: {
            subjectNameNormalized: "physics",
            // Threshold 7 (A). Physics is 6 (B) → fails.
            minimumGradeValue: 7,
          },
          orderIndex: 0,
        },
      ],
    },
  ]),
  expected: {
    finalStatus: "conditional" as const,
    primaryReasonKey: "conditional_group_failed",
    ruleOutcomes: {
      "r-count": "passed",
      "r-exists": "passed",
      "r-grade-physics": "failed",
    },
  },
};

// ---------------------------------------------------------------------------
// GOLDEN CASE 4: needs_review
// ---------------------------------------------------------------------------
// Student passes blocking requirements but fails a review-severity group's
// minimum_subject_grade rule (Chemistry grade 5 (C) < required 6 (B)).
// Review severity failure → needs_review.

export const GOLDEN_NEEDS_REVIEW = {
  label: "British student needs review — blocking passes but review-severity group fails",
  prepared: makePrepared(),
  resolvedContext: makeResolvedContext([
    {
      ruleGroupId: "rg-blocking-1",
      groupKey: "core_requirements",
      groupSeverity: "blocking",
      groupEvaluationMode: "all_required",
      orderIndex: 0,
      rules: [
        {
          ruleId: "r-count",
          ruleTypeKey: "minimum_subject_count",
          ruleConfig: {
            segment: "a_level",
            minimumCount: 3,
          },
          orderIndex: 0,
        },
        {
          ruleId: "r-exists",
          ruleTypeKey: "required_subject_exists",
          ruleConfig: {
            subjectNamesNormalized: ["mathematics"],
          },
          orderIndex: 1,
        },
      ],
    },
    {
      ruleGroupId: "rg-review-1",
      groupKey: "review_grade_check",
      groupSeverity: "review",
      groupEvaluationMode: "all_required",
      orderIndex: 1,
      rules: [
        {
          ruleId: "r-grade-chemistry",
          ruleTypeKey: "minimum_subject_grade",
          ruleConfig: {
            subjectNameNormalized: "chemistry",
            // Threshold 6 (B). Chemistry is 5 (C) → fails.
            minimumGradeValue: 6,
          },
          orderIndex: 0,
        },
      ],
    },
  ]),
  expected: {
    finalStatus: "needs_review" as const,
    primaryReasonKey: "review_group_failed",
    ruleOutcomes: {
      "r-count": "passed",
      "r-exists": "passed",
      "r-grade-chemistry": "failed",
    },
  },
};

// ---------------------------------------------------------------------------
// GOLDEN CASE 5: advisory non-downgrade
// ---------------------------------------------------------------------------
// Student passes all blocking rules. An advisory-severity group fails
// (minimum_subject_grade for Biology: 6 (B) < 7 (A)). Advisory failures do NOT
// downgrade final status away from eligible. Advisory notes should be present.

export const GOLDEN_ADVISORY_NON_DOWNGRADE = {
  label: "British student eligible despite advisory failure — advisory does not downgrade",
  prepared: makePrepared(),
  resolvedContext: makeResolvedContext([
    {
      ruleGroupId: "rg-blocking-1",
      groupKey: "core_requirements",
      groupSeverity: "blocking",
      groupEvaluationMode: "all_required",
      orderIndex: 0,
      rules: [
        {
          ruleId: "r-count",
          ruleTypeKey: "minimum_subject_count",
          ruleConfig: {
            segment: "a_level",
            minimumCount: 3,
          },
          orderIndex: 0,
        },
        {
          ruleId: "r-exists",
          ruleTypeKey: "required_subject_exists",
          ruleConfig: {
            subjectNamesNormalized: ["mathematics"],
          },
          orderIndex: 1,
        },
      ],
    },
    {
      ruleGroupId: "rg-advisory-1",
      groupKey: "preferred_biology_grade",
      groupSeverity: "advisory",
      groupEvaluationMode: "all_required",
      orderIndex: 1,
      rules: [
        {
          ruleId: "r-grade-biology",
          ruleTypeKey: "minimum_subject_grade",
          ruleConfig: {
            subjectNameNormalized: "biology",
            // Threshold 7 (A). Biology is 6 (B) → fails.
            minimumGradeValue: 7,
          },
          orderIndex: 0,
        },
      ],
    },
  ]),
  expected: {
    finalStatus: "eligible" as const,
    primaryReasonKey: "all_required_groups_satisfied",
    ruleOutcomes: {
      "r-count": "passed",
      "r-exists": "passed",
      "r-grade-biology": "failed",
    },
    advisoryGroupOutcome: "failed",
  },
};
