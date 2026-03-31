/**
 * Direct evaluation execution trace types.
 *
 * Ordered execution traces only — no final eligibility status,
 * no result assembly, no explanation rendering, no persistence.
 */

import type { NormalizedBritishSubjectRecord } from "./normalized-british-profile";

/** Outcome of a single rule or group execution. */
export type DirectEvaluationRuleExecutionOutcome = "passed" | "failed" | "skipped";

/** Detailed result of a minimum_subject_count rule execution. */
export interface MinimumSubjectCountRuleExecutionResult {
  outcome: DirectEvaluationRuleExecutionOutcome;
  matchedCount: number;
  requiredCount: number;
  matchedSubjects: readonly NormalizedBritishSubjectRecord[];
}

/** Detailed result of a required_subject_exists rule execution. */
export interface RequiredSubjectExistsRuleExecutionResult {
  outcome: DirectEvaluationRuleExecutionOutcome;
  matchedSubjectName: string | null;
  requiredSubjectNames: readonly string[];
}

/** Trace entry for one executed rule within a group. */
export interface DirectEvaluationRuleExecution {
  ruleId: string;
  ruleTypeKey: string;
  outcome: DirectEvaluationRuleExecutionOutcome;
  matchedCount?: number;
  requiredCount?: number;
  matchedSubjectName?: string | null;
  requiredSubjectNames?: readonly string[];
}

/** Trace entry for one executed rule group. */
export interface DirectEvaluationRuleGroupExecution {
  ruleGroupId: string;
  groupSeverity: string;
  groupEvaluationMode: string;
  groupOutcome: DirectEvaluationRuleExecutionOutcome;
  ruleExecutions: readonly DirectEvaluationRuleExecution[];
}

/** Result of executing all rule groups in a resolved direct-evaluation context. */
export interface ExecuteDirectEvaluationRuleContextResult {
  groupExecutions: readonly DirectEvaluationRuleGroupExecution[];
}
