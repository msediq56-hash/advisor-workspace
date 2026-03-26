/**
 * Direct-evaluation primary-reason renderer integration test baseline.
 *
 * Tests the exact Arabic mapping, return shape, and unknown-key behavior
 * of renderDirectEvaluationPrimaryReason. Pure input fixtures — no mocks.
 */

import { describe, it, expect } from "vitest";
import { renderDirectEvaluationPrimaryReason } from "./render-direct-evaluation-primary-reason";
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

describe("renderDirectEvaluationPrimaryReason", () => {
  // -----------------------------------------------------------------------
  // Supported key mappings
  // -----------------------------------------------------------------------

  it("renders no_rule_groups_executed correctly", () => {
    const result = renderDirectEvaluationPrimaryReason({
      assembled: makeAssembled("needs_review", "no_rule_groups_executed"),
    });

    expect(result.finalStatus).toBe("needs_review");
    expect(result.primaryReasonKey).toBe("no_rule_groups_executed");
    expect(result.primaryReasonAr).toBe(
      "لا توجد مجموعات قواعد منشورة مطابقة لهذا السياق، لذلك تحتاج الحالة إلى مراجعة."
    );
  });

  it("renders blocking_group_failed correctly", () => {
    const result = renderDirectEvaluationPrimaryReason({
      assembled: makeAssembled("not_eligible", "blocking_group_failed"),
    });

    expect(result.primaryReasonAr).toBe(
      "الحالة غير مؤهلة لأن مجموعة شروط مانعة لم تتحقق."
    );
  });

  it("renders review_group_failed correctly", () => {
    const result = renderDirectEvaluationPrimaryReason({
      assembled: makeAssembled("needs_review", "review_group_failed"),
    });

    expect(result.primaryReasonAr).toBe(
      "الحالة تحتاج إلى مراجعة لأن مجموعة شروط مراجعة لم تتحقق."
    );
  });

  it("renders conditional_group_failed correctly", () => {
    const result = renderDirectEvaluationPrimaryReason({
      assembled: makeAssembled("conditional", "conditional_group_failed"),
    });

    expect(result.primaryReasonAr).toBe(
      "الحالة مشروطة لأن بعض الشروط المشروطة لم تتحقق."
    );
  });

  it("renders all_required_groups_satisfied correctly", () => {
    const result = renderDirectEvaluationPrimaryReason({
      assembled: makeAssembled("eligible", "all_required_groups_satisfied"),
    });

    expect(result.primaryReasonAr).toBe(
      "الحالة مؤهلة لأن جميع مجموعات الشروط المطلوبة تحققت."
    );
  });

  // -----------------------------------------------------------------------
  // Return shape
  // -----------------------------------------------------------------------

  it("preserves finalStatus and primaryReasonKey in output", () => {
    const result = renderDirectEvaluationPrimaryReason({
      assembled: makeAssembled("eligible", "all_required_groups_satisfied"),
    });

    expect(result).toHaveProperty("finalStatus");
    expect(result).toHaveProperty("primaryReasonKey");
    expect(result).toHaveProperty("primaryReasonAr");
    expect(Object.keys(result)).toHaveLength(3);
  });

  // -----------------------------------------------------------------------
  // Unknown key handling
  // -----------------------------------------------------------------------

  it("throws on unknown primaryReasonKey", () => {
    expect(() =>
      renderDirectEvaluationPrimaryReason({
        assembled: makeAssembled("eligible", "unknown_key"),
      })
    ).toThrow('Unknown primaryReasonKey "unknown_key"');
  });
});
