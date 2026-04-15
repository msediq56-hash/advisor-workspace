/**
 * Pure execution module for a resolved direct-evaluation rule context.
 *
 * Iterates resolved rule groups and rules in order, executes supported
 * rule types, and returns ordered execution traces. Does not resolve
 * rules, calculate final status, or persist anything.
 *
 * Accepts both British and simple-form prepared input. British-only
 * rule types (minimum_subject_count, required_subject_exists,
 * minimum_subject_grade) are skipped for non-British input.
 * Simple-form-only rule types (minimum_overall_grade) are skipped
 * for British input.
 *
 * Pure sync function — no DB access.
 */

import { evaluateMinimumSubjectCountRule } from "./evaluate-minimum-subject-count-rule";
import { evaluateRequiredSubjectExistsRule } from "./evaluate-required-subject-exists-rule";
import { evaluateMinimumSubjectGradeRule } from "./evaluate-minimum-subject-grade-rule";
import { evaluateAcceptedQualificationTypeRule } from "./evaluate-accepted-qualification-type-rule";
import { evaluateMinimumOverallGradeRule } from "./evaluate-minimum-overall-grade-rule";
import type { PreparedBritishDirectEvaluation } from "@/types/prepared-british-direct-evaluation";
import type { PreparedSimpleFormDirectEvaluation } from "@/types/prepared-simple-form-direct-evaluation";
import type { ResolvedDirectEvaluationRuleContext } from "@/types/direct-evaluation-resolved-rule-context";
import type {
  DirectEvaluationRuleExecution,
  DirectEvaluationRuleExecutionOutcome,
  DirectEvaluationRuleGroupExecution,
  ExecuteDirectEvaluationRuleContextResult,
} from "@/types/direct-evaluation-execution";

/** Union of accepted prepared input types. */
type PreparedDirectEvaluationInput =
  | PreparedBritishDirectEvaluation
  | PreparedSimpleFormDirectEvaluation;

/**
 * Type guard: check if the prepared input is British by inspecting
 * the normalized profile's qualificationFamily discriminant.
 */
function isBritishPreparedInput(
  prepared: PreparedDirectEvaluationInput
): prepared is PreparedBritishDirectEvaluation {
  return (
    prepared.normalizedProfile != null &&
    "qualificationFamily" in prepared.normalizedProfile &&
    prepared.normalizedProfile.qualificationFamily === "british_curriculum"
  );
}

/**
 * Type guard: check if the prepared input is simple-form (non-British).
 */
function isSimpleFormPreparedInput(
  prepared: PreparedDirectEvaluationInput
): prepared is PreparedSimpleFormDirectEvaluation {
  return !isBritishPreparedInput(prepared);
}

/**
 * Execute all rule groups in a resolved direct-evaluation context.
 * Returns ordered execution traces only.
 */
export function executeDirectEvaluationRuleContext(params: {
  prepared: PreparedDirectEvaluationInput;
  resolvedContext: ResolvedDirectEvaluationRuleContext;
}): ExecuteDirectEvaluationRuleContextResult {
  const { prepared, resolvedContext } = params;

  const britishPrepared = isBritishPreparedInput(prepared) ? prepared : null;
  const simpleFormPrepared = isSimpleFormPreparedInput(prepared) ? prepared : null;

  const groupExecutions: DirectEvaluationRuleGroupExecution[] =
    resolvedContext.ruleGroups.map((group) => {
      const ruleExecutions: DirectEvaluationRuleExecution[] = group.rules.map(
        (rule) => {
          if (rule.ruleTypeKey === "minimum_subject_count") {
            // British-only rule type — skip for non-British input
            if (!britishPrepared) {
              return {
                ruleId: rule.ruleId,
                ruleTypeKey: rule.ruleTypeKey,
                outcome: "skipped" as const,
              };
            }

            const result = evaluateMinimumSubjectCountRule({
              prepared: britishPrepared,
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              ruleConfig: rule.ruleConfig,
            });

            return {
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              outcome: result.outcome,
              matchedCount: result.matchedCount,
              requiredCount: result.requiredCount,
            };
          }

          if (rule.ruleTypeKey === "required_subject_exists") {
            // British-only rule type — skip for non-British input
            if (!britishPrepared) {
              return {
                ruleId: rule.ruleId,
                ruleTypeKey: rule.ruleTypeKey,
                outcome: "skipped" as const,
              };
            }

            const result = evaluateRequiredSubjectExistsRule({
              prepared: britishPrepared,
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              ruleConfig: rule.ruleConfig,
            });

            return {
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              outcome: result.outcome,
              matchedSubjectName: result.matchedSubjectName,
              requiredSubjectNames: result.requiredSubjectNames,
            };
          }

          if (rule.ruleTypeKey === "minimum_subject_grade") {
            // British-only rule type — skip for non-British input
            if (!britishPrepared) {
              return {
                ruleId: rule.ruleId,
                ruleTypeKey: rule.ruleTypeKey,
                outcome: "skipped" as const,
              };
            }

            const result = evaluateMinimumSubjectGradeRule({
              prepared: britishPrepared,
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              ruleConfig: rule.ruleConfig,
            });

            return {
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              outcome: result.outcome,
              matchedSubjectName: result.matchedSubjectName,
              matchedGradeValue: result.matchedGradeValue,
              requiredMinimumGradeValue: result.requiredMinimumGradeValue,
            };
          }

          if (rule.ruleTypeKey === "minimum_overall_grade") {
            // Simple-form-only rule type — skip for British input
            if (!simpleFormPrepared) {
              return {
                ruleId: rule.ruleId,
                ruleTypeKey: rule.ruleTypeKey,
                outcome: "skipped" as const,
              };
            }

            const result = evaluateMinimumOverallGradeRule({
              prepared: simpleFormPrepared,
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              ruleConfig: rule.ruleConfig,
            });

            return {
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              outcome: result.outcome,
              actualValue: result.actualValue,
              requiredMinimumValue: result.requiredMinimumValue,
            };
          }

          if (rule.ruleTypeKey === "accepted_qualification_type") {
            // Works for both British and simple-form — uses resolvedContext.qualificationDefinition
            const result = evaluateAcceptedQualificationTypeRule({
              qualificationDefinition: resolvedContext.qualificationDefinition,
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              ruleConfig: rule.ruleConfig,
            });

            return {
              ruleId: rule.ruleId,
              ruleTypeKey: rule.ruleTypeKey,
              outcome: result.outcome,
              actualQualificationTypeKey: result.actualQualificationTypeKey,
              acceptedQualificationTypeKeys: result.acceptedQualificationTypeKeys,
            };
          }

          // Unsupported rule type — skip
          return {
            ruleId: rule.ruleId,
            ruleTypeKey: rule.ruleTypeKey,
            outcome: "skipped" as const,
          };
        }
      );

      return {
        ruleGroupId: group.ruleGroupId,
        groupSeverity: group.groupSeverity,
        groupEvaluationMode: group.groupEvaluationMode,
        groupOutcome: deriveGroupOutcome(ruleExecutions, group.groupEvaluationMode),
        ruleExecutions,
      };
    });

  return { groupExecutions };
}

/**
 * Derive group outcome from individual rule executions and evaluation mode.
 *
 * all_required / advisory_only:
 *   - failed if any effective rule failed
 *   - passed if at least one rule passed (and none failed)
 *   - skipped if all rules are skipped
 *
 * any_of:
 *   - passed if at least one rule passed
 *   - failed if no rule passed and at least one effective rule failed
 *   - skipped if all rules are skipped
 */
function deriveGroupOutcome(
  executions: readonly DirectEvaluationRuleExecution[],
  groupEvaluationMode: string,
): DirectEvaluationRuleExecutionOutcome {
  let hasPassed = false;
  let hasFailed = false;

  for (const exec of executions) {
    if (exec.outcome === "passed") hasPassed = true;
    if (exec.outcome === "failed") hasFailed = true;
  }

  if (groupEvaluationMode === "any_of") {
    if (hasPassed) return "passed";
    if (hasFailed) return "failed";
    return "skipped";
  }

  // all_required / advisory_only
  if (hasFailed) return "failed";
  if (hasPassed) return "passed";
  return "skipped";
}
