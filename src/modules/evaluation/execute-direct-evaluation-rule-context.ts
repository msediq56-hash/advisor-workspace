/**
 * Pure execution module for a resolved direct-evaluation rule context.
 *
 * Iterates resolved rule groups and rules in order, executes supported
 * rule types, and returns ordered execution traces. Does not resolve
 * rules, calculate final status, or persist anything.
 *
 * Accepts both British and simple-form prepared input. British-only
 * rule types (minimum_subject_count) are skipped for non-British input.
 *
 * Pure sync function — no DB access.
 */

import { evaluateMinimumSubjectCountRule } from "./evaluate-minimum-subject-count-rule";
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
 * Execute all rule groups in a resolved direct-evaluation context.
 * Returns ordered execution traces only.
 */
export function executeDirectEvaluationRuleContext(params: {
  prepared: PreparedDirectEvaluationInput;
  resolvedContext: ResolvedDirectEvaluationRuleContext;
}): ExecuteDirectEvaluationRuleContextResult {
  const { prepared, resolvedContext } = params;

  const britishPrepared = isBritishPreparedInput(prepared) ? prepared : null;

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
        groupOutcome: deriveGroupOutcome(ruleExecutions),
        ruleExecutions,
      };
    });

  return { groupExecutions };
}

/**
 * Derive group outcome from individual rule executions.
 * - failed if any rule failed
 * - passed if at least one rule passed (and none failed)
 * - skipped otherwise
 */
function deriveGroupOutcome(
  executions: readonly DirectEvaluationRuleExecution[]
): DirectEvaluationRuleExecutionOutcome {
  let hasPassed = false;

  for (const exec of executions) {
    if (exec.outcome === "failed") return "failed";
    if (exec.outcome === "passed") hasPassed = true;
  }

  return hasPassed ? "passed" : "skipped";
}
