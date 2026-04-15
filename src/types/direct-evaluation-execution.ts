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

/** Detailed result of a minimum_subject_grade rule execution. */
export interface MinimumSubjectGradeRuleExecutionResult {
  outcome: DirectEvaluationRuleExecutionOutcome;
  matchedSubjectName: string | null;
  matchedGradeValue: number | null;
  requiredMinimumGradeValue: number;
}

/** Detailed result of a minimum_overall_grade rule execution. */
export interface MinimumOverallGradeRuleExecutionResult {
  outcome: DirectEvaluationRuleExecutionOutcome;
  actualValue: number | null;
  requiredMinimumValue: number;
}

/** Detailed result of an accepted_qualification_type rule execution. */
export interface AcceptedQualificationTypeRuleExecutionResult {
  outcome: DirectEvaluationRuleExecutionOutcome;
  actualQualificationTypeKey: string;
  acceptedQualificationTypeKeys: readonly string[];
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
  matchedGradeValue?: number | null;
  requiredMinimumGradeValue?: number;
  actualValue?: number | null;
  requiredMinimumValue?: number;
  actualQualificationTypeKey?: string;
  acceptedQualificationTypeKeys?: readonly string[];
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
