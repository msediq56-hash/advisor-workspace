/**
 * Trace-level Arabic explanation renderer tests.
 *
 * Tests the dedicated renderer for supported rule types.
 * Pure input fixtures, no mocks, no DB.
 */

import { describe, it, expect } from "vitest";
import { renderDirectEvaluationRuleTraceExplanation } from "./render-direct-evaluation-rule-trace-explanation";

describe("renderDirectEvaluationRuleTraceExplanation — minimum_subject_grade", () => {
  // -----------------------------------------------------------------------
  // passed
  // -----------------------------------------------------------------------

  it("renders passed with matched subject and grade context", () => {
    const result = renderDirectEvaluationRuleTraceExplanation({
      ruleTypeKey: "minimum_subject_grade",
      outcome: "passed",
      matchedSubjectName: "mathematics",
      matchedGradeValue: 80,
      requiredMinimumGradeValue: 70,
    });

    expect(result.explanationAr).toContain("mathematics");
    expect(result.explanationAr).toContain("80");
    expect(result.explanationAr).toContain("70");
    expect(typeof result.explanationAr).toBe("string");
  });

  // -----------------------------------------------------------------------
  // failed — subject matched but below threshold
  // -----------------------------------------------------------------------

  it("renders failed when matched subject is below threshold", () => {
    const result = renderDirectEvaluationRuleTraceExplanation({
      ruleTypeKey: "minimum_subject_grade",
      outcome: "failed",
      matchedSubjectName: "chemistry",
      matchedGradeValue: 60,
      requiredMinimumGradeValue: 70,
    });

    expect(result.explanationAr).toContain("chemistry");
    expect(result.explanationAr).toContain("60");
    expect(result.explanationAr).toContain("70");
    expect(typeof result.explanationAr).toBe("string");
  });

  // -----------------------------------------------------------------------
  // failed — no matching subject found
  // -----------------------------------------------------------------------

  it("renders failed when no matching subject found", () => {
    const result = renderDirectEvaluationRuleTraceExplanation({
      ruleTypeKey: "minimum_subject_grade",
      outcome: "failed",
      matchedSubjectName: null,
      matchedGradeValue: null,
      requiredMinimumGradeValue: 70,
    });

    expect(result.explanationAr).toBeTruthy();
    expect(result.explanationAr).not.toContain("null");
    expect(typeof result.explanationAr).toBe("string");
  });

  // -----------------------------------------------------------------------
  // skipped
  // -----------------------------------------------------------------------

  it("renders skipped explanation", () => {
    const result = renderDirectEvaluationRuleTraceExplanation({
      ruleTypeKey: "minimum_subject_grade",
      outcome: "skipped",
    });

    expect(result.explanationAr).toBeTruthy();
    expect(typeof result.explanationAr).toBe("string");
  });

  // -----------------------------------------------------------------------
  // distinguishes two failed shapes
  // -----------------------------------------------------------------------

  it("produces different explanations for below-threshold vs no-match failures", () => {
    const belowThreshold = renderDirectEvaluationRuleTraceExplanation({
      ruleTypeKey: "minimum_subject_grade",
      outcome: "failed",
      matchedSubjectName: "physics",
      matchedGradeValue: 50,
      requiredMinimumGradeValue: 70,
    });

    const noMatch = renderDirectEvaluationRuleTraceExplanation({
      ruleTypeKey: "minimum_subject_grade",
      outcome: "failed",
      matchedSubjectName: null,
      matchedGradeValue: null,
      requiredMinimumGradeValue: 70,
    });

    expect(belowThreshold.explanationAr).not.toBe(noMatch.explanationAr);
  });
});

describe("renderDirectEvaluationRuleTraceExplanation — unsupported type", () => {
  it("throws on unsupported rule type", () => {
    expect(() =>
      renderDirectEvaluationRuleTraceExplanation({
        ruleTypeKey: "totally_unknown",
        outcome: "passed",
      })
    ).toThrow("Unsupported rule type");
  });
});
