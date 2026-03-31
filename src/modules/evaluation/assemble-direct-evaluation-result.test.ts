/**
 * Direct-evaluation result assembly integration test baseline.
 *
 * Tests final status derivation, summary counters, advisory non-downgrade,
 * and trace preservation. Pure input fixtures — no mocks needed.
 */

import { describe, it, expect } from "vitest";
import { assembleDirectEvaluationResult } from "./assemble-direct-evaluation-result";
import type { DirectEvaluationRuleGroupExecution, DirectEvaluationRuleExecutionOutcome } from "@/types/direct-evaluation-execution";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGroup(overrides: {
  ruleGroupId?: string;
  groupSeverity: string;
  groupOutcome: DirectEvaluationRuleExecutionOutcome;
  ruleExecutions?: Array<{ ruleId: string; ruleTypeKey: string; outcome: DirectEvaluationRuleExecutionOutcome }>;
}): DirectEvaluationRuleGroupExecution {
  return {
    ruleGroupId: overrides.ruleGroupId ?? "rg-1",
    groupSeverity: overrides.groupSeverity,
    groupEvaluationMode: "all_required",
    groupOutcome: overrides.groupOutcome,
    ruleExecutions: overrides.ruleExecutions ?? [
      { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", outcome: overrides.groupOutcome },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("assembleDirectEvaluationResult", () => {
  // -----------------------------------------------------------------------
  // Final status derivation
  // -----------------------------------------------------------------------

  it("returns eligible when all groups pass", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ groupSeverity: "blocking", groupOutcome: "passed" }),
        ],
      },
    });

    expect(result.finalStatus).toBe("eligible");
    expect(result.primaryReasonKey).toBe("all_required_groups_satisfied");
  });

  it("returns not_eligible when a blocking group fails", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ groupSeverity: "blocking", groupOutcome: "failed" }),
        ],
      },
    });

    expect(result.finalStatus).toBe("not_eligible");
    expect(result.primaryReasonKey).toBe("blocking_group_failed");
  });

  it("returns needs_review when a review group fails (no blocking failure)", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ groupSeverity: "review", groupOutcome: "failed" }),
        ],
      },
    });

    expect(result.finalStatus).toBe("needs_review");
    expect(result.primaryReasonKey).toBe("review_group_failed");
  });

  it("returns conditional when a conditional group fails (no blocking/review failure)", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ groupSeverity: "conditional", groupOutcome: "failed" }),
        ],
      },
    });

    expect(result.finalStatus).toBe("conditional");
    expect(result.primaryReasonKey).toBe("conditional_group_failed");
  });

  it("returns needs_review for empty execution (no groups)", () => {
    const result = assembleDirectEvaluationResult({
      execution: { groupExecutions: [] },
    });

    expect(result.finalStatus).toBe("needs_review");
    expect(result.primaryReasonKey).toBe("no_rule_groups_executed");
  });

  // -----------------------------------------------------------------------
  // Severity priority
  // -----------------------------------------------------------------------

  it("blocking takes priority over review", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ ruleGroupId: "rg-1", groupSeverity: "review", groupOutcome: "failed" }),
          makeGroup({ ruleGroupId: "rg-2", groupSeverity: "blocking", groupOutcome: "failed" }),
        ],
      },
    });

    expect(result.finalStatus).toBe("not_eligible");
  });

  it("review takes priority over conditional", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ ruleGroupId: "rg-1", groupSeverity: "conditional", groupOutcome: "failed" }),
          makeGroup({ ruleGroupId: "rg-2", groupSeverity: "review", groupOutcome: "failed" }),
        ],
      },
    });

    expect(result.finalStatus).toBe("needs_review");
  });

  // -----------------------------------------------------------------------
  // Advisory non-downgrade
  // -----------------------------------------------------------------------

  it("advisory failure does not downgrade eligible status", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ ruleGroupId: "rg-1", groupSeverity: "blocking", groupOutcome: "passed" }),
          makeGroup({ ruleGroupId: "rg-2", groupSeverity: "advisory", groupOutcome: "failed" }),
        ],
      },
    });

    expect(result.finalStatus).toBe("eligible");
    expect(result.primaryReasonKey).toBe("all_required_groups_satisfied");
  });

  it("advisory failure does not count in failedGroupsCount", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ ruleGroupId: "rg-1", groupSeverity: "advisory", groupOutcome: "failed" }),
        ],
      },
    });

    expect(result.failedGroupsCount).toBe(0);
    expect(result.conditionalGroupsCount).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Summary counters
  // -----------------------------------------------------------------------

  it("counts matched rules across all groups", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({
            ruleGroupId: "rg-1",
            groupSeverity: "blocking",
            groupOutcome: "passed",
            ruleExecutions: [
              { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", outcome: "passed" },
              { ruleId: "r-2", ruleTypeKey: "minimum_subject_count", outcome: "passed" },
            ],
          }),
          makeGroup({
            ruleGroupId: "rg-2",
            groupSeverity: "blocking",
            groupOutcome: "failed",
            ruleExecutions: [
              { ruleId: "r-3", ruleTypeKey: "minimum_subject_count", outcome: "passed" },
              { ruleId: "r-4", ruleTypeKey: "minimum_subject_count", outcome: "failed" },
            ],
          }),
        ],
      },
    });

    expect(result.matchedRulesCount).toBe(3);
  });

  it("counts failedGroupsCount for blocking and review failures", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ ruleGroupId: "rg-1", groupSeverity: "blocking", groupOutcome: "failed" }),
          makeGroup({ ruleGroupId: "rg-2", groupSeverity: "review", groupOutcome: "failed" }),
          makeGroup({ ruleGroupId: "rg-3", groupSeverity: "conditional", groupOutcome: "failed" }),
        ],
      },
    });

    expect(result.failedGroupsCount).toBe(2);
    expect(result.conditionalGroupsCount).toBe(1);
  });

  it("returns zero counters for all-passed groups", () => {
    const result = assembleDirectEvaluationResult({
      execution: {
        groupExecutions: [
          makeGroup({ groupSeverity: "blocking", groupOutcome: "passed" }),
        ],
      },
    });

    expect(result.matchedRulesCount).toBe(1);
    expect(result.failedGroupsCount).toBe(0);
    expect(result.conditionalGroupsCount).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Trace preservation
  // -----------------------------------------------------------------------

  it("preserves groupExecutions in output", () => {
    const groups = [
      makeGroup({ ruleGroupId: "rg-1", groupSeverity: "blocking", groupOutcome: "passed" }),
      makeGroup({ ruleGroupId: "rg-2", groupSeverity: "advisory", groupOutcome: "failed" }),
    ];

    const result = assembleDirectEvaluationResult({
      execution: { groupExecutions: groups },
    });

    expect(result.groupExecutions).toBe(groups);
    expect(result.groupExecutions).toHaveLength(2);
  });
});
