/**
 * Simple-form golden-case verification baseline.
 *
 * Exercises the real execution → assembly → rendering path with no mocking
 * of evaluator/assembly/rendering logic. Uses explicit fixtures that
 * represent realistic arabic_secondary direct-evaluation scenarios grounded
 * in the current supported simple-form rule surface:
 * - minimum_overall_grade
 *
 * This is not a unit-test slice — it is a higher-value integration
 * verification layer for the current simple-form direct-evaluation runtime.
 */

import { describe, it, expect } from "vitest";
import { executeDirectEvaluationRuleContext } from "../execute-direct-evaluation-rule-context";
import { assembleDirectEvaluationResult } from "../assemble-direct-evaluation-result";
import { renderDirectEvaluationPrimaryReason } from "../render-direct-evaluation-primary-reason";
import { renderDirectEvaluationNextStep } from "../render-direct-evaluation-next-step";
import { renderDirectEvaluationAdvisoryNotes } from "../render-direct-evaluation-advisory-notes";
import { renderDirectEvaluationRuleTraceExplanation } from "../render-direct-evaluation-rule-trace-explanation";

import {
  SF_GOLDEN_ELIGIBLE,
  SF_GOLDEN_NOT_ELIGIBLE,
  SF_GOLDEN_CONDITIONAL,
} from "./simple-form-golden-case-fixtures";

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
        actualValue: rule.actualValue,
        requiredMinimumValue: rule.requiredMinimumValue,
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

describe(`Golden: ${SF_GOLDEN_ELIGIBLE.label}`, () => {
  const result = runGoldenCase(SF_GOLDEN_ELIGIBLE);

  it("produces final status 'eligible'", () => {
    expect(result.assembled.finalStatus).toBe(SF_GOLDEN_ELIGIBLE.expected.finalStatus);
  });

  it("produces primary reason key 'all_required_groups_satisfied'", () => {
    expect(result.assembled.primaryReasonKey).toBe(SF_GOLDEN_ELIGIBLE.expected.primaryReasonKey);
  });

  it("renders Arabic primary reason", () => {
    expect(result.primaryReason.primaryReasonAr).toBeTruthy();
    expect(typeof result.primaryReason.primaryReasonAr).toBe("string");
  });

  it("renders Arabic next step", () => {
    expect(result.nextStep.nextStepAr).toBeTruthy();
  });

  it("produces correct rule outcome", () => {
    const ruleExec = result.execution.groupExecutions[0].ruleExecutions[0];
    expect(ruleExec.outcome).toBe("passed");
    expect(ruleExec.ruleId).toBe("r-overall");
  });

  it("renders dedicated trace explanation with actual value and threshold", () => {
    const explanation = result.traceExplanations["r-overall"];
    expect(explanation).toBeTruthy();
    expect(explanation).toContain("85");
    expect(explanation).toContain("80");
  });

  it("has correct counters", () => {
    expect(result.assembled.failedGroupsCount).toBe(0);
    expect(result.assembled.conditionalGroupsCount).toBe(0);
    expect(result.assembled.matchedRulesCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN CASE 2: not_eligible
// ---------------------------------------------------------------------------

describe(`Golden: ${SF_GOLDEN_NOT_ELIGIBLE.label}`, () => {
  const result = runGoldenCase(SF_GOLDEN_NOT_ELIGIBLE);

  it("produces final status 'not_eligible'", () => {
    expect(result.assembled.finalStatus).toBe(SF_GOLDEN_NOT_ELIGIBLE.expected.finalStatus);
  });

  it("produces primary reason key 'blocking_group_failed'", () => {
    expect(result.assembled.primaryReasonKey).toBe(SF_GOLDEN_NOT_ELIGIBLE.expected.primaryReasonKey);
  });

  it("renders Arabic primary reason for not_eligible", () => {
    expect(result.primaryReason.primaryReasonAr).toBeTruthy();
  });

  it("produces correct rule outcome — overall grade fails", () => {
    const ruleExec = result.execution.groupExecutions[0].ruleExecutions[0];
    expect(ruleExec.outcome).toBe("failed");
  });

  it("trace explanation contains the actual and required values", () => {
    const explanation = result.traceExplanations["r-overall"];
    expect(explanation).toBeTruthy();
    expect(explanation).toContain("70");
    expect(explanation).toContain("80");
  });

  it("has one failed blocking group", () => {
    expect(result.assembled.failedGroupsCount).toBe(1);
    expect(result.assembled.conditionalGroupsCount).toBe(0);
    expect(result.assembled.matchedRulesCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN CASE 3: conditional
// ---------------------------------------------------------------------------

describe(`Golden: ${SF_GOLDEN_CONDITIONAL.label}`, () => {
  const result = runGoldenCase(SF_GOLDEN_CONDITIONAL);

  it("produces final status 'conditional'", () => {
    expect(result.assembled.finalStatus).toBe(SF_GOLDEN_CONDITIONAL.expected.finalStatus);
  });

  it("produces primary reason key 'conditional_group_failed'", () => {
    expect(result.assembled.primaryReasonKey).toBe(SF_GOLDEN_CONDITIONAL.expected.primaryReasonKey);
  });

  it("renders Arabic primary reason for conditional", () => {
    expect(result.primaryReason.primaryReasonAr).toBeTruthy();
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
        const expectedOutcome = SF_GOLDEN_CONDITIONAL.expected.ruleOutcomes[rule.ruleId as keyof typeof SF_GOLDEN_CONDITIONAL.expected.ruleOutcomes];
        expect(rule.outcome, `rule ${rule.ruleId}`).toBe(expectedOutcome);
      }
    }
  });

  it("conditional rule trace shows actual vs required values", () => {
    const explanation = result.traceExplanations["r-overall-conditional"];
    expect(explanation).toBeTruthy();
    expect(explanation).toContain("85");
    expect(explanation).toContain("90");
  });

  it("has zero failed blocking groups and one conditional group", () => {
    expect(result.assembled.failedGroupsCount).toBe(0);
    expect(result.assembled.conditionalGroupsCount).toBe(1);
    // blocking rule passes = 1 matched
    expect(result.assembled.matchedRulesCount).toBe(1);
  });
});
