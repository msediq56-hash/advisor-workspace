/**
 * Direct evaluation result assembly types.
 *
 * Final status baseline and summary counters derived from execution traces.
 * No explanation text. No persistence types. No UI types.
 */

import type { DirectEvaluationRuleGroupExecution } from "./direct-evaluation-execution";

/** Final eligibility status for a direct evaluation. */
export type DirectEvaluationFinalStatus =
  | "eligible"
  | "conditional"
  | "not_eligible"
  | "needs_review";

/** Assembled direct evaluation result with final status and summary counters. */
export interface AssembledDirectEvaluationResult {
  finalStatus: DirectEvaluationFinalStatus;
  primaryReasonKey: string;
  matchedRulesCount: number;
  failedGroupsCount: number;
  conditionalGroupsCount: number;
  groupExecutions: readonly DirectEvaluationRuleGroupExecution[];
}
