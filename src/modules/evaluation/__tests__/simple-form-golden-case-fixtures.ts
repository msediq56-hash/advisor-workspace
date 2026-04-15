/**
 * Golden-case fixtures for simple-form direct-evaluation verification baseline.
 *
 * Each fixture defines a realistic PreparedSimpleFormDirectEvaluation and
 * ResolvedDirectEvaluationRuleContext that can be fed directly into the
 * execution → assembly → rendering path without DB access.
 *
 * Uses arabic_secondary as the representative simple-form family.
 * Covers the current supported simple-form rule surface:
 * - minimum_overall_grade
 */

import type { PreparedSimpleFormDirectEvaluation } from "@/types/prepared-simple-form-direct-evaluation";
import type { ResolvedDirectEvaluationRuleContext } from "@/types/direct-evaluation-resolved-rule-context";

// ---------------------------------------------------------------------------
// Shared simple-form student profile (arabic_secondary)
// ---------------------------------------------------------------------------

function makeArabicSecondaryProfile(finalAverage: number) {
  return {
    qualificationFamily: "arabic_secondary" as const,
    countryId: "country-sa",
    certificateName: "الثانوية العامة",
    finalAverage,
    gradingScale: "100",
    graduationYear: 2025,
    notesAr: null,
  };
}

function makePrepared(finalAverage: number): PreparedSimpleFormDirectEvaluation {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: makeArabicSecondaryProfile(finalAverage),
  };
}

function makeResolvedContext(
  ruleGroups: ResolvedDirectEvaluationRuleContext["ruleGroups"],
  normalizedProfile: ReturnType<typeof makeArabicSecondaryProfile>,
): ResolvedDirectEvaluationRuleContext {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: normalizedProfile as never,
    status: "supported",
    resolvedRuleSet: {
      ruleSetId: "rs-golden-sf",
      ruleSetVersionId: "rsv-golden-sf",
      targetScope: "offering",
      qualificationTypeId: "qt-arabic-sec",
    },
    ruleGroups,
  };
}

// ---------------------------------------------------------------------------
// GOLDEN CASE 1: eligible
// ---------------------------------------------------------------------------
// Student finalAverage 85 ≥ required 80. Blocking group passes.

const ELIGIBLE_AVERAGE = 85;

export const SF_GOLDEN_ELIGIBLE = {
  label: "Arabic secondary student eligible — overall grade meets blocking threshold",
  prepared: makePrepared(ELIGIBLE_AVERAGE),
  resolvedContext: makeResolvedContext(
    [
      {
        ruleGroupId: "rg-blocking-1",
        groupKey: "overall_grade_requirement",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        orderIndex: 0,
        rules: [
          {
            ruleId: "r-overall",
            ruleTypeKey: "minimum_overall_grade",
            ruleConfig: {
              profileField: "finalAverage",
              minimumValue: 80,
            },
            orderIndex: 0,
          },
        ],
      },
    ],
    makeArabicSecondaryProfile(ELIGIBLE_AVERAGE),
  ),
  expected: {
    finalStatus: "eligible" as const,
    primaryReasonKey: "all_required_groups_satisfied",
    ruleOutcomes: {
      "r-overall": "passed",
    },
  },
};

// ---------------------------------------------------------------------------
// GOLDEN CASE 2: not_eligible
// ---------------------------------------------------------------------------
// Student finalAverage 70 < required 80. Blocking group fails.

const NOT_ELIGIBLE_AVERAGE = 70;

export const SF_GOLDEN_NOT_ELIGIBLE = {
  label: "Arabic secondary student not eligible — overall grade below blocking threshold",
  prepared: makePrepared(NOT_ELIGIBLE_AVERAGE),
  resolvedContext: makeResolvedContext(
    [
      {
        ruleGroupId: "rg-blocking-1",
        groupKey: "overall_grade_requirement",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        orderIndex: 0,
        rules: [
          {
            ruleId: "r-overall",
            ruleTypeKey: "minimum_overall_grade",
            ruleConfig: {
              profileField: "finalAverage",
              minimumValue: 80,
            },
            orderIndex: 0,
          },
        ],
      },
    ],
    makeArabicSecondaryProfile(NOT_ELIGIBLE_AVERAGE),
  ),
  expected: {
    finalStatus: "not_eligible" as const,
    primaryReasonKey: "blocking_group_failed",
    ruleOutcomes: {
      "r-overall": "failed",
    },
  },
};

// ---------------------------------------------------------------------------
// GOLDEN CASE 3: conditional
// ---------------------------------------------------------------------------
// Student finalAverage 85 passes blocking (≥80) but fails conditional (≥90).

const CONDITIONAL_AVERAGE = 85;

export const SF_GOLDEN_CONDITIONAL = {
  label: "Arabic secondary student conditional — passes blocking but fails conditional threshold",
  prepared: makePrepared(CONDITIONAL_AVERAGE),
  resolvedContext: makeResolvedContext(
    [
      {
        ruleGroupId: "rg-blocking-1",
        groupKey: "minimum_grade",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        orderIndex: 0,
        rules: [
          {
            ruleId: "r-overall-blocking",
            ruleTypeKey: "minimum_overall_grade",
            ruleConfig: {
              profileField: "finalAverage",
              minimumValue: 80,
            },
            orderIndex: 0,
          },
        ],
      },
      {
        ruleGroupId: "rg-conditional-1",
        groupKey: "preferred_grade",
        groupSeverity: "conditional",
        groupEvaluationMode: "all_required",
        orderIndex: 1,
        rules: [
          {
            ruleId: "r-overall-conditional",
            ruleTypeKey: "minimum_overall_grade",
            ruleConfig: {
              profileField: "finalAverage",
              minimumValue: 90,
            },
            orderIndex: 0,
          },
        ],
      },
    ],
    makeArabicSecondaryProfile(CONDITIONAL_AVERAGE),
  ),
  expected: {
    finalStatus: "conditional" as const,
    primaryReasonKey: "conditional_group_failed",
    ruleOutcomes: {
      "r-overall-blocking": "passed",
      "r-overall-conditional": "failed",
    },
  },
};

// ---------------------------------------------------------------------------
// GOLDEN CASE 4: needs_review
// ---------------------------------------------------------------------------
// Student finalAverage 85 passes blocking (≥80) but fails review-severity (≥90).

const NEEDS_REVIEW_AVERAGE = 85;

export const SF_GOLDEN_NEEDS_REVIEW = {
  label: "Arabic secondary student needs review — passes blocking but review-severity group fails",
  prepared: makePrepared(NEEDS_REVIEW_AVERAGE),
  resolvedContext: makeResolvedContext(
    [
      {
        ruleGroupId: "rg-blocking-1",
        groupKey: "minimum_grade",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        orderIndex: 0,
        rules: [
          {
            ruleId: "r-overall-blocking",
            ruleTypeKey: "minimum_overall_grade",
            ruleConfig: {
              profileField: "finalAverage",
              minimumValue: 80,
            },
            orderIndex: 0,
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
            ruleId: "r-overall-review",
            ruleTypeKey: "minimum_overall_grade",
            ruleConfig: {
              profileField: "finalAverage",
              minimumValue: 90,
            },
            orderIndex: 0,
          },
        ],
      },
    ],
    makeArabicSecondaryProfile(NEEDS_REVIEW_AVERAGE),
  ),
  expected: {
    finalStatus: "needs_review" as const,
    primaryReasonKey: "review_group_failed",
    ruleOutcomes: {
      "r-overall-blocking": "passed",
      "r-overall-review": "failed",
    },
  },
};

// ---------------------------------------------------------------------------
// GOLDEN CASE 5: advisory non-downgrade
// ---------------------------------------------------------------------------
// Student finalAverage 85 passes blocking (≥80). Advisory-severity group fails
// (≥90). Advisory failure does NOT downgrade final status from eligible.

const ADVISORY_AVERAGE = 85;

export const SF_GOLDEN_ADVISORY_NON_DOWNGRADE = {
  label: "Arabic secondary student eligible despite advisory failure — advisory does not downgrade",
  prepared: makePrepared(ADVISORY_AVERAGE),
  resolvedContext: makeResolvedContext(
    [
      {
        ruleGroupId: "rg-blocking-1",
        groupKey: "minimum_grade",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        orderIndex: 0,
        rules: [
          {
            ruleId: "r-overall-blocking",
            ruleTypeKey: "minimum_overall_grade",
            ruleConfig: {
              profileField: "finalAverage",
              minimumValue: 80,
            },
            orderIndex: 0,
          },
        ],
      },
      {
        ruleGroupId: "rg-advisory-1",
        groupKey: "preferred_higher_grade",
        groupSeverity: "advisory",
        groupEvaluationMode: "all_required",
        orderIndex: 1,
        rules: [
          {
            ruleId: "r-overall-advisory",
            ruleTypeKey: "minimum_overall_grade",
            ruleConfig: {
              profileField: "finalAverage",
              minimumValue: 90,
            },
            orderIndex: 0,
          },
        ],
      },
    ],
    makeArabicSecondaryProfile(ADVISORY_AVERAGE),
  ),
  expected: {
    finalStatus: "eligible" as const,
    primaryReasonKey: "all_required_groups_satisfied",
    ruleOutcomes: {
      "r-overall-blocking": "passed",
      "r-overall-advisory": "failed",
    },
    advisoryGroupOutcome: "failed",
  },
};
