/**
 * Pure result assembly for direct evaluation execution traces.
 *
 * Derives final status, primary reason key, and summary counters
 * from already-produced execution group traces. Does not execute rules,
 * render explanations, or persist anything.
 *
 * Pure sync function — no DB access.
 */

import type { ExecuteDirectEvaluationRuleContextResult } from "@/types/direct-evaluation-execution";
import type {
  AssembledDirectEvaluationResult,
  DirectEvaluationFinalStatus,
} from "@/types/direct-evaluation-result-assembly";

/**
 * Assemble a final direct evaluation result from execution traces.
 */
export function assembleDirectEvaluationResult(params: {
  execution: ExecuteDirectEvaluationRuleContextResult;
}): AssembledDirectEvaluationResult {
  const { groupExecutions } = params.execution;

  // No groups executed
  if (groupExecutions.length === 0) {
    return {
      finalStatus: "needs_review",
      primaryReasonKey: "no_rule_groups_executed",
      matchedRulesCount: 0,
      failedGroupsCount: 0,
      conditionalGroupsCount: 0,
      groupExecutions,
    };
  }

  // Classify failed groups by severity
  let hasBlockingFailed = false;
  let hasReviewFailed = false;
  let hasConditionalFailed = false;
  let failedGroupsCount = 0;
  let conditionalGroupsCount = 0;
  let matchedRulesCount = 0;

  for (const group of groupExecutions) {
    // Count passed rules across all groups
    for (const rule of group.ruleExecutions) {
      if (rule.outcome === "passed") {
        matchedRulesCount++;
      }
    }

    if (group.groupOutcome !== "failed") continue;

    switch (group.groupSeverity) {
      case "blocking":
        hasBlockingFailed = true;
        failedGroupsCount++;
        break;
      case "review":
        hasReviewFailed = true;
        failedGroupsCount++;
        break;
      case "conditional":
        hasConditionalFailed = true;
        conditionalGroupsCount++;
        break;
      // advisory failures do not affect final status or counters
    }
  }

  // Derive final status
  let finalStatus: DirectEvaluationFinalStatus;
  let primaryReasonKey: string;

  if (hasBlockingFailed) {
    finalStatus = "not_eligible";
    primaryReasonKey = "blocking_group_failed";
  } else if (hasReviewFailed) {
    finalStatus = "needs_review";
    primaryReasonKey = "review_group_failed";
  } else if (hasConditionalFailed) {
    finalStatus = "conditional";
    primaryReasonKey = "conditional_group_failed";
  } else {
    // Check if every group outcome is skipped — no real evaluation occurred
    const allSkipped = groupExecutions.every((g) => g.groupOutcome === "skipped");
    if (allSkipped) {
      finalStatus = "needs_review";
      primaryReasonKey = "no_rule_groups_executed";
    } else {
      finalStatus = "eligible";
      primaryReasonKey = "all_required_groups_satisfied";
    }
  }

  return {
    finalStatus,
    primaryReasonKey,
    matchedRulesCount,
    failedGroupsCount,
    conditionalGroupsCount,
    groupExecutions,
  };
}
