/**
 * British golden-case verification baseline.
 *
 * Exercises the real execution → assembly → rendering path with no mocking
 * of evaluator/assembly/rendering logic. Uses explicit fixtures that
 * represent realistic British direct-evaluation scenarios grounded in
 * the current supported rule surface:
 * - minimum_subject_count
 * - required_subject_exists
 * - minimum_subject_grade
 *
 * This is not a unit-test slice — it is a higher-value integration
 * verification layer for the current British direct-evaluation runtime.
 */

import { describe, it, expect } from "vitest";
import { executeDirectEvaluationRuleContext } from "../execute-direct-evaluation-rule-context";
import { assembleDirectEvaluationResult } from "../assemble-direct-evaluation-result";
import { renderDirectEvaluationPrimaryReason } from "../render-direct-evaluation-primary-reason";
import { renderDirectEvaluationNextStep } from "../render-direct-evaluation-next-step";
import { renderDirectEvaluationAdvisoryNotes } from "../render-direct-evaluation-advisory-notes";
import { renderDirectEvaluationRuleTraceExplanation } from "../render-direct-evaluation-rule-trace-explanation";

import {
  GOLDEN_ELIGIBLE,
  GOLDEN_NOT_ELIGIBLE,
  GOLDEN_CONDITIONAL,
  GOLDEN_NEEDS_REVIEW,
  GOLDEN_ADVISORY_NON_DOWNGRADE,
} from "./british-golden-case-fixtures";

// ---------------------------------------------------------------------------
// Helper: run the full execution → assembly → rendering path
// ---------------------------------------------------------------------------

function runGoldenCase(goldenCase: {
  prepared: Parameters<typeof executeDirectEvaluationRuleContext>[0]["prepared"];
  resolvedContext: Parameters<typeof executeDirectEvaluationRuleContext>[0]["resolvedContext"];
}) {
  const execution = executeDirectEvaluationRuleContext({
    prepared: goldenCase.prepared,
    resolvedContext: goldenCase.resolvedContext,
  });

  const assembled = assembleDirectEvaluationResult({ execution });

  const primaryReason = renderDirectEvaluationPrimaryReason({ assembled });
  const nextStep = renderDirectEvaluationNextStep({ assembled });
  const advisoryNotes = renderDirectEvaluationAdvisoryNotes({ assembled });

  // Render trace explanations for each rule execution
  const traceExplanations: Record<string, string> = {};
  for (const group of execution.groupExecutions) {
    for (const rule of group.ruleExecutions) {
      traceExplanations[rule.ruleId] = renderDirectEvaluationRuleTraceExplanation({
        ruleTypeKey: rule.ruleTypeKey,
        outcome: rule.outcome,
        matchedCount: rule.matchedCount,
        requiredCount: rule.requiredCount,
        matchedSubjectName: rule.matchedSubjectName,
        requiredSubjectNames: rule.requiredSubjectNames,
        matchedGradeValue: rule.matchedGradeValue,
        requiredMinimumGradeValue: rule.requiredMinimumGradeValue,
      }).explanationAr;
    }
  }

  return {
    execution,
    assembled,
    primaryReason,
    nextStep,
    advisoryNotes,
    traceExplanations,
  };
}

// ---------------------------------------------------------------------------
// GOLDEN CASE 1: eligible
// ---------------------------------------------------------------------------

describe(`Golden: ${GOLDEN_ELIGIBLE.label}`, () => {
  const result = runGoldenCase(GOLDEN_ELIGIBLE);

  it("produces final status 'eligible'", () => {
    expect(result.assembled.finalStatus).toBe(GOLDEN_ELIGIBLE.expected.finalStatus);
  });

  it("produces primary reason key 'all_required_groups_satisfied'", () => {
    expect(result.assembled.primaryReasonKey).toBe(GOLDEN_ELIGIBLE.expected.primaryReasonKey);
  });

  it("renders Arabic primary reason", () => {
    expect(result.primaryReason.primaryReasonAr).toBeTruthy();
    expect(typeof result.primaryReason.primaryReasonAr).toBe("string");
  });

  it("renders Arabic next step", () => {
    expect(result.nextStep.nextStepAr).toBeTruthy();
    expect(typeof result.nextStep.nextStepAr).toBe("string");
  });

  it("produces correct rule outcomes", () => {
    for (const group of result.execution.groupExecutions) {
      for (const rule of group.ruleExecutions) {
        const expectedOutcome = GOLDEN_ELIGIBLE.expected.ruleOutcomes[rule.ruleId as keyof typeof GOLDEN_ELIGIBLE.expected.ruleOutcomes];
        expect(rule.outcome, `rule ${rule.ruleId}`).toBe(expectedOutcome);
      }
    }
  });

  it("renders dedicated trace explanations for all supported rules", () => {
    expect(Object.keys(result.traceExplanations)).toHaveLength(3);
    for (const [ruleId, explanation] of Object.entries(result.traceExplanations)) {
      expect(explanation, `trace for ${ruleId}`).toBeTruthy();
      expect(typeof explanation).toBe("string");
    }
  });

  it("has zero failed groups and correct counters", () => {
    expect(result.assembled.failedGroupsCount).toBe(0);
    expect(result.assembled.conditionalGroupsCount).toBe(0);
    expect(result.assembled.matchedRulesCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN CASE 2: not_eligible
// ---------------------------------------------------------------------------

describe(`Golden: ${GOLDEN_NOT_ELIGIBLE.label}`, () => {
  const result = runGoldenCase(GOLDEN_NOT_ELIGIBLE);

  it("produces final status 'not_eligible'", () => {
    expect(result.assembled.finalStatus).toBe(GOLDEN_NOT_ELIGIBLE.expected.finalStatus);
  });

  it("produces primary reason key 'blocking_group_failed'", () => {
    expect(result.assembled.primaryReasonKey).toBe(GOLDEN_NOT_ELIGIBLE.expected.primaryReasonKey);
  });

  it("renders Arabic primary reason for not_eligible", () => {
    expect(result.primaryReason.primaryReasonAr).toBeTruthy();
    expect(typeof result.primaryReason.primaryReasonAr).toBe("string");
  });

  it("produces correct rule outcomes — count and exists pass, grade fails", () => {
    for (const group of result.execution.groupExecutions) {
      for (const rule of group.ruleExecutions) {
        const expectedOutcome = GOLDEN_NOT_ELIGIBLE.expected.ruleOutcomes[rule.ruleId as keyof typeof GOLDEN_NOT_ELIGIBLE.expected.ruleOutcomes];
        expect(rule.outcome, `rule ${rule.ruleId}`).toBe(expectedOutcome);
      }
    }
  });

  it("grade rule trace explanation contains the actual and required grade values", () => {
    const gradeExplanation = result.traceExplanations["r-grade"];
    expect(gradeExplanation).toBeTruthy();
    // Student has grade 7 (A), threshold is 8 (A*) on the canonical British ordinal scale.
    expect(gradeExplanation).toContain("7");
    expect(gradeExplanation).toContain("8");
  });

  it("has one failed blocking group", () => {
    expect(result.assembled.failedGroupsCount).toBe(1);
    expect(result.assembled.conditionalGroupsCount).toBe(0);
    // count and exists pass, grade fails
    expect(result.assembled.matchedRulesCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN CASE 3: conditional
// ---------------------------------------------------------------------------

describe(`Golden: ${GOLDEN_CONDITIONAL.label}`, () => {
  const result = runGoldenCase(GOLDEN_CONDITIONAL);

  it("produces final status 'conditional'", () => {
    expect(result.assembled.finalStatus).toBe(GOLDEN_CONDITIONAL.expected.finalStatus);
  });

  it("produces primary reason key 'conditional_group_failed'", () => {
    expect(result.assembled.primaryReasonKey).toBe(GOLDEN_CONDITIONAL.expected.primaryReasonKey);
  });

  it("renders Arabic primary reason for conditional", () => {
    expect(result.primaryReason.primaryReasonAr).toBeTruthy();
    expect(typeof result.primaryReason.primaryReasonAr).toBe("string");
  });

  it("blocking group passes but conditional group fails", () => {
    expect(result.execution.groupExecutions).toHaveLength(2);

    const blockingGroup = result.execution.groupExecutions[0];
    expect(blockingGroup.groupOutcome).toBe("passed");

    const conditionalGroup = result.execution.groupExecutions[1];
    expect(conditionalGroup.groupOutcome).toBe("failed");
  });

  it("produces correct rule outcomes across both groups", () => {
    for (const group of result.execution.groupExecutions) {
      for (const rule of group.ruleExecutions) {
        const expectedOutcome = GOLDEN_CONDITIONAL.expected.ruleOutcomes[rule.ruleId as keyof typeof GOLDEN_CONDITIONAL.expected.ruleOutcomes];
        expect(rule.outcome, `rule ${rule.ruleId}`).toBe(expectedOutcome);
      }
    }
  });

  it("physics grade trace explanation shows the grade gap", () => {
    const physicsExplanation = result.traceExplanations["r-grade-physics"];
    expect(physicsExplanation).toBeTruthy();
    // Physics grade is 6 (B), threshold is 7 (A) on the canonical British ordinal scale.
    expect(physicsExplanation).toContain("6");
    expect(physicsExplanation).toContain("7");
  });

  it("has zero failed blocking groups and one conditional group", () => {
    expect(result.assembled.failedGroupsCount).toBe(0);
    expect(result.assembled.conditionalGroupsCount).toBe(1);
    // count + exists pass in blocking group = 2 matched
    expect(result.assembled.matchedRulesCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN CASE 4: needs_review
// ---------------------------------------------------------------------------

describe(`Golden: ${GOLDEN_NEEDS_REVIEW.label}`, () => {
  const result = runGoldenCase(GOLDEN_NEEDS_REVIEW);

  it("produces final status 'needs_review'", () => {
    expect(result.assembled.finalStatus).toBe(GOLDEN_NEEDS_REVIEW.expected.finalStatus);
  });

  it("produces primary reason key 'review_group_failed'", () => {
    expect(result.assembled.primaryReasonKey).toBe(GOLDEN_NEEDS_REVIEW.expected.primaryReasonKey);
  });

  it("renders Arabic primary reason for needs_review", () => {
    expect(result.primaryReason.primaryReasonAr).toBeTruthy();
    expect(typeof result.primaryReason.primaryReasonAr).toBe("string");
  });

  it("renders Arabic next step for needs_review", () => {
    expect(result.nextStep.nextStepAr).toBeTruthy();
    expect(typeof result.nextStep.nextStepAr).toBe("string");
  });

  it("blocking group passes but review group fails", () => {
    expect(result.execution.groupExecutions).toHaveLength(2);

    const blockingGroup = result.execution.groupExecutions[0];
    expect(blockingGroup.groupOutcome).toBe("passed");

    const reviewGroup = result.execution.groupExecutions[1];
    expect(reviewGroup.groupOutcome).toBe("failed");
  });

  it("produces correct rule outcomes across both groups", () => {
    for (const group of result.execution.groupExecutions) {
      for (const rule of group.ruleExecutions) {
        const expectedOutcome = GOLDEN_NEEDS_REVIEW.expected.ruleOutcomes[rule.ruleId as keyof typeof GOLDEN_NEEDS_REVIEW.expected.ruleOutcomes];
        expect(rule.outcome, `rule ${rule.ruleId}`).toBe(expectedOutcome);
      }
    }
  });

  it("chemistry grade trace explanation shows the grade gap", () => {
    const chemExplanation = result.traceExplanations["r-grade-chemistry"];
    expect(chemExplanation).toBeTruthy();
    // Chemistry grade is 5 (C), threshold is 6 (B) on the canonical British ordinal scale.
    expect(chemExplanation).toContain("5");
    expect(chemExplanation).toContain("6");
  });

  it("has one failed review group and zero conditional groups", () => {
    expect(result.assembled.failedGroupsCount).toBe(1);
    expect(result.assembled.conditionalGroupsCount).toBe(0);
    // count + exists pass = 2 matched
    expect(result.assembled.matchedRulesCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN CASE 5: advisory non-downgrade
// ---------------------------------------------------------------------------

describe(`Golden: ${GOLDEN_ADVISORY_NON_DOWNGRADE.label}`, () => {
  const result = runGoldenCase(GOLDEN_ADVISORY_NON_DOWNGRADE);

  it("produces final status 'eligible' despite advisory failure", () => {
    expect(result.assembled.finalStatus).toBe(GOLDEN_ADVISORY_NON_DOWNGRADE.expected.finalStatus);
  });

  it("produces primary reason key 'all_required_groups_satisfied'", () => {
    expect(result.assembled.primaryReasonKey).toBe(GOLDEN_ADVISORY_NON_DOWNGRADE.expected.primaryReasonKey);
  });

  it("renders Arabic primary reason for eligible", () => {
    expect(result.primaryReason.primaryReasonAr).toBeTruthy();
    expect(typeof result.primaryReason.primaryReasonAr).toBe("string");
  });

  it("blocking group passes and advisory group fails", () => {
    expect(result.execution.groupExecutions).toHaveLength(2);

    const blockingGroup = result.execution.groupExecutions[0];
    expect(blockingGroup.groupOutcome).toBe("passed");

    const advisoryGroup = result.execution.groupExecutions[1];
    expect(advisoryGroup.groupOutcome).toBe("failed");
    expect(advisoryGroup.groupSeverity).toBe("advisory");
  });

  it("advisory failure does NOT downgrade final status away from eligible", () => {
    // This is the key assertion: advisory failures must not change the final status
    expect(result.assembled.finalStatus).toBe("eligible");
    expect(result.assembled.failedGroupsCount).toBe(0);
    expect(result.assembled.conditionalGroupsCount).toBe(0);
  });

  it("advisory notes contain the advisory failure note", () => {
    expect(result.advisoryNotes.advisoryNotesAr.length).toBeGreaterThan(0);
    expect(result.advisoryNotes.advisoryNotesAr.some(
      (note: string) => note.length > 0
    )).toBe(true);
  });

  it("produces correct rule outcomes across both groups", () => {
    for (const group of result.execution.groupExecutions) {
      for (const rule of group.ruleExecutions) {
        const expectedOutcome = GOLDEN_ADVISORY_NON_DOWNGRADE.expected.ruleOutcomes[rule.ruleId as keyof typeof GOLDEN_ADVISORY_NON_DOWNGRADE.expected.ruleOutcomes];
        expect(rule.outcome, `rule ${rule.ruleId}`).toBe(expectedOutcome);
      }
    }
  });

  it("biology grade trace explanation shows the grade gap", () => {
    const bioExplanation = result.traceExplanations["r-grade-biology"];
    expect(bioExplanation).toBeTruthy();
    // Biology grade is 6 (B), threshold is 7 (A) on the canonical British ordinal scale.
    expect(bioExplanation).toContain("6");
    expect(bioExplanation).toContain("7");
  });

  it("matched rules count reflects only blocking group passes", () => {
    // count + exists pass in blocking = 2; biology fails in advisory = not counted
    expect(result.assembled.matchedRulesCount).toBe(2);
  });
});
