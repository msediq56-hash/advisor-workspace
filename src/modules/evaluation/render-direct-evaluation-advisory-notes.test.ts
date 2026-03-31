/**
 * Direct-evaluation advisory-notes renderer integration test baseline.
 *
 * Tests the exact Arabic note generation, return shape, and edge behavior
 * of renderDirectEvaluationAdvisoryNotes. Pure input fixtures — no mocks.
 */

import { describe, it, expect } from "vitest";
import { renderDirectEvaluationAdvisoryNotes } from "./render-direct-evaluation-advisory-notes";
import type { AssembledDirectEvaluationResult } from "@/types/direct-evaluation-result-assembly";
import type { DirectEvaluationRuleGroupExecution, DirectEvaluationRuleExecutionOutcome } from "@/types/direct-evaluation-execution";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGroup(overrides: {
  groupSeverity: string;
  groupOutcome: DirectEvaluationRuleExecutionOutcome;
}): DirectEvaluationRuleGroupExecution {
  return {
    ruleGroupId: "rg-1",
    groupSeverity: overrides.groupSeverity,
    groupEvaluationMode: "all_required",
    groupOutcome: overrides.groupOutcome,
    ruleExecutions: [],
  };
}

function makeAssembled(
  groups: DirectEvaluationRuleGroupExecution[]
): AssembledDirectEvaluationResult {
  return {
    finalStatus: "eligible",
    primaryReasonKey: "all_required_groups_satisfied",
    matchedRulesCount: 0,
    failedGroupsCount: 0,
    conditionalGroupsCount: 0,
    groupExecutions: groups,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("renderDirectEvaluationAdvisoryNotes", () => {
  // -----------------------------------------------------------------------
  // No notes
  // -----------------------------------------------------------------------

  it("returns empty array when no advisory failures and no skipped groups", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([
        makeGroup({ groupSeverity: "blocking", groupOutcome: "passed" }),
      ]),
    });

    expect(result.advisoryNotesAr).toEqual([]);
  });

  it("returns empty array for empty group executions", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([]),
    });

    expect(result.advisoryNotesAr).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Advisory failed note
  // -----------------------------------------------------------------------

  it("includes advisory note when an advisory group fails", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([
        makeGroup({ groupSeverity: "advisory", groupOutcome: "failed" }),
      ]),
    });

    expect(result.advisoryNotesAr).toContain(
      "توجد ملاحظات استشارية غير متحققة ينبغي أخذها بعين الاعتبار أثناء المراجعة."
    );
  });

  it("does not include advisory note when advisory group passes", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([
        makeGroup({ groupSeverity: "advisory", groupOutcome: "passed" }),
      ]),
    });

    expect(result.advisoryNotesAr).not.toContain(
      "توجد ملاحظات استشارية غير متحققة ينبغي أخذها بعين الاعتبار أثناء المراجعة."
    );
  });

  // -----------------------------------------------------------------------
  // Skipped group note
  // -----------------------------------------------------------------------

  it("includes skipped note when a group is skipped", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([
        makeGroup({ groupSeverity: "blocking", groupOutcome: "skipped" }),
      ]),
    });

    expect(result.advisoryNotesAr).toContain(
      "بعض مجموعات القواعد لم تُنفذ في هذه النسخة ويجب أخذ ذلك في الاعتبار عند مراجعة النتيجة."
    );
  });

  it("does not include skipped note when no groups are skipped", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([
        makeGroup({ groupSeverity: "blocking", groupOutcome: "passed" }),
        makeGroup({ groupSeverity: "blocking", groupOutcome: "failed" }),
      ]),
    });

    expect(result.advisoryNotesAr).not.toContain(
      "بعض مجموعات القواعد لم تُنفذ في هذه النسخة ويجب أخذ ذلك في الاعتبار عند مراجعة النتيجة."
    );
  });

  // -----------------------------------------------------------------------
  // Both notes
  // -----------------------------------------------------------------------

  it("includes both notes when advisory fails and a group is skipped", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([
        makeGroup({ groupSeverity: "advisory", groupOutcome: "failed" }),
        makeGroup({ groupSeverity: "blocking", groupOutcome: "skipped" }),
      ]),
    });

    expect(result.advisoryNotesAr).toHaveLength(2);
    expect(result.advisoryNotesAr[0]).toBe(
      "توجد ملاحظات استشارية غير متحققة ينبغي أخذها بعين الاعتبار أثناء المراجعة."
    );
    expect(result.advisoryNotesAr[1]).toBe(
      "بعض مجموعات القواعد لم تُنفذ في هذه النسخة ويجب أخذ ذلك في الاعتبار عند مراجعة النتيجة."
    );
  });

  // -----------------------------------------------------------------------
  // Note deduplication
  // -----------------------------------------------------------------------

  it("includes each note at most once even with multiple matching groups", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([
        makeGroup({ groupSeverity: "advisory", groupOutcome: "failed" }),
        makeGroup({ groupSeverity: "advisory", groupOutcome: "failed" }),
        makeGroup({ groupSeverity: "blocking", groupOutcome: "skipped" }),
        makeGroup({ groupSeverity: "conditional", groupOutcome: "skipped" }),
      ]),
    });

    expect(result.advisoryNotesAr).toHaveLength(2);
  });

  // -----------------------------------------------------------------------
  // Return shape
  // -----------------------------------------------------------------------

  it("preserves finalStatus and primaryReasonKey in output", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([]),
    });

    expect(result).toHaveProperty("finalStatus");
    expect(result).toHaveProperty("primaryReasonKey");
    expect(result).toHaveProperty("advisoryNotesAr");
    expect(Object.keys(result)).toHaveLength(3);
  });

  // -----------------------------------------------------------------------
  // Non-advisory failures do not trigger advisory note
  // -----------------------------------------------------------------------

  it("does not include advisory note for blocking/review/conditional failures", () => {
    const result = renderDirectEvaluationAdvisoryNotes({
      assembled: makeAssembled([
        makeGroup({ groupSeverity: "blocking", groupOutcome: "failed" }),
        makeGroup({ groupSeverity: "review", groupOutcome: "failed" }),
        makeGroup({ groupSeverity: "conditional", groupOutcome: "failed" }),
      ]),
    });

    expect(result.advisoryNotesAr).toEqual([]);
  });
});
