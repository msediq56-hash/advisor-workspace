/**
 * Direct-evaluation next-step renderer integration test baseline.
 *
 * Tests the exact Arabic mapping, return shape, and unknown-key behavior
 * of renderDirectEvaluationNextStep. Pure input fixtures — no mocks.
 */

import { describe, it, expect } from "vitest";
import { renderDirectEvaluationNextStep } from "./render-direct-evaluation-next-step";
import type { AssembledDirectEvaluationResult } from "@/types/direct-evaluation-result-assembly";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeAssembled(
  finalStatus: AssembledDirectEvaluationResult["finalStatus"],
  primaryReasonKey: string
): AssembledDirectEvaluationResult {
  return {
    finalStatus,
    primaryReasonKey,
    matchedRulesCount: 0,
    failedGroupsCount: 0,
    conditionalGroupsCount: 0,
    groupExecutions: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("renderDirectEvaluationNextStep", () => {
  // -----------------------------------------------------------------------
  // Supported key mappings
  // -----------------------------------------------------------------------

  it("renders no_rule_groups_executed correctly", () => {
    const result = renderDirectEvaluationNextStep({
      assembled: makeAssembled("needs_review", "no_rule_groups_executed"),
    });

    expect(result.finalStatus).toBe("needs_review");
    expect(result.primaryReasonKey).toBe("no_rule_groups_executed");
    expect(result.nextStepAr).toBe(
      "يجب تحويل الحالة إلى مراجعة داخلية للتأكد من إعداد القواعد المنشورة قبل إصدار قرار نهائي."
    );
  });

  it("renders blocking_group_failed correctly", () => {
    const result = renderDirectEvaluationNextStep({
      assembled: makeAssembled("not_eligible", "blocking_group_failed"),
    });

    expect(result.nextStepAr).toBe(
      "يجب إيقاف المتابعة على أنها مؤهلة ومراجعة الشروط المانعة غير المتحققة."
    );
  });

  it("renders review_group_failed correctly", () => {
    const result = renderDirectEvaluationNextStep({
      assembled: makeAssembled("needs_review", "review_group_failed"),
    });

    expect(result.nextStepAr).toBe(
      "يجب تحويل الحالة إلى مراجعة بشرية قبل اعتماد القرار النهائي."
    );
  });

  it("renders conditional_group_failed correctly", () => {
    const result = renderDirectEvaluationNextStep({
      assembled: makeAssembled("conditional", "conditional_group_failed"),
    });

    expect(result.nextStepAr).toBe(
      "يجب متابعة الحالة على أنها مشروطة وطلب استكمال الشروط غير المتحققة."
    );
  });

  it("renders all_required_groups_satisfied correctly", () => {
    const result = renderDirectEvaluationNextStep({
      assembled: makeAssembled("eligible", "all_required_groups_satisfied"),
    });

    expect(result.nextStepAr).toBe(
      "يمكن متابعة الحالة على أنها مؤهلة ضمن الشروط الحالية."
    );
  });

  // -----------------------------------------------------------------------
  // Return shape
  // -----------------------------------------------------------------------

  it("preserves finalStatus and primaryReasonKey in output", () => {
    const result = renderDirectEvaluationNextStep({
      assembled: makeAssembled("eligible", "all_required_groups_satisfied"),
    });

    expect(result).toHaveProperty("finalStatus");
    expect(result).toHaveProperty("primaryReasonKey");
    expect(result).toHaveProperty("nextStepAr");
    expect(Object.keys(result)).toHaveLength(3);
  });

  // -----------------------------------------------------------------------
  // Unknown key handling
  // -----------------------------------------------------------------------

  it("throws on unknown primaryReasonKey", () => {
    expect(() =>
      renderDirectEvaluationNextStep({
        assembled: makeAssembled("eligible", "unknown_key"),
      })
    ).toThrow('Unknown primaryReasonKey "unknown_key"');
  });
});
