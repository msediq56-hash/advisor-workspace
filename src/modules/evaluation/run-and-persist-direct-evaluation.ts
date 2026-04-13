/**
 * Server-side direct-evaluation run-and-persist workflow baseline.
 *
 * Composes the existing generic orchestrator with the existing persistence
 * write service and the dedicated trace explanation renderer.
 * Maps runtime result fields into persistence payload, accepting only
 * caller-owned metadata that is not derivable from the runtime result.
 *
 * Does not add UI, routes, API handlers, session/org lookup, or new
 * evaluation logic. Does not generate trace explanation text inline —
 * sources it from the dedicated trace explanation renderer only.
 *
 * Server-side only — do not import from client components.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { runDirectEvaluation } from "@/modules/evaluation/run-direct-evaluation";
import { persistDirectEvaluationRun } from "@/modules/evaluation/persist-direct-evaluation-run";
import { renderDirectEvaluationRuleTraceExplanation } from "@/modules/evaluation/render-direct-evaluation-rule-trace-explanation";
import type {
  RunAndPersistDirectEvaluationInput,
  RunAndPersistDirectEvaluationResult,
} from "@/types/direct-evaluation-run-and-persist";
import type {
  PersistDirectEvaluationRunInput,
  PersistEvaluationRuleTraceRowInput,
} from "@/types/direct-evaluation-persistence";
import type { DirectEvaluationRuleGroupExecution } from "@/types/direct-evaluation-execution";

/**
 * Run a direct evaluation end-to-end and persist the result.
 *
 * 1. Calls the existing generic direct-evaluation orchestrator
 * 2. Maps the runtime result into persistence write input
 * 3. Sources per-trace explanation_ar from the dedicated renderer
 * 4. Writes run/result/traces through the existing persistence service
 * 5. Returns both the runtime result and persistence outcome
 */
export async function runAndPersistDirectEvaluation(params: {
  supabase: SupabaseClient;
  input: RunAndPersistDirectEvaluationInput;
}): Promise<RunAndPersistDirectEvaluationResult> {
  const { supabase, input } = params;

  // 1. Run the generic direct-evaluation orchestrator
  const runtime = await runDirectEvaluation(input.evaluation);

  // 2. Map runtime result into persistence payload
  const meta = input.persistenceMetadata;
  const ctx = runtime.resolvedContext;
  const offering = ctx.target.offering;

  const persistInput: PersistDirectEvaluationRunInput = {
    run: {
      organization_id: meta.organizationId,
      actor_user_id: meta.actorUserId,
      flow_type: "direct_evaluation",
      source_profile_id: meta.sourceProfileId,
      qualification_type_id: ctx.qualificationDefinition.qualificationType.id,
      normalized_profile_snapshot_jsonb: ctx.normalizedProfile,
      request_context_jsonb: meta.requestContextJsonb,
    },
    result: {
      program_offering_id: offering.id,
      final_status: runtime.assembled.finalStatus,
      primary_reason_ar: runtime.primaryReasonAr,
      next_step_ar: runtime.nextStepAr,
      tuition_amount_snapshot: offering.annualTuitionAmount,
      currency_code: offering.currencyCode,
      application_fee_snapshot: offering.applicationFeeAmount,
      extra_fee_note_snapshot_ar: offering.extraFeeNoteAr,
      scholarship_note_snapshot_ar: offering.scholarshipNoteAr,
      advisory_notes_jsonb: runtime.advisoryNotesAr.length > 0 ? runtime.advisoryNotesAr : null,
      sort_bucket: runtime.assembled.finalStatus,
      matched_rules_count: runtime.assembled.matchedRulesCount,
      failed_groups_count: runtime.assembled.failedGroupsCount,
      conditional_groups_count: runtime.assembled.conditionalGroupsCount,
      trace_summary_jsonb: runtime.assembled.groupExecutions,
    },
    ruleTraces: mapRuleTraces(
      ctx.resolvedRuleSet?.ruleSetVersionId ?? null,
      runtime.execution.groupExecutions,
    ),
  };

  // 3. Persist
  const persistence = await persistDirectEvaluationRun({ supabase, input: persistInput });

  return { runtime, persistence };
}

// ---------------------------------------------------------------------------
// Internal trace mapping
// ---------------------------------------------------------------------------

/**
 * Map execution group traces into flat persistence trace rows.
 * Sources `explanation_ar` from the dedicated trace explanation renderer
 * for supported rule types. Uses a fixed compatibility string for
 * unsupported rule types regardless of outcome.
 */
function mapRuleTraces(
  ruleSetVersionId: string | null,
  groupExecutions: readonly DirectEvaluationRuleGroupExecution[],
): PersistEvaluationRuleTraceRowInput[] {
  if (!ruleSetVersionId) {
    return [];
  }

  const traces: PersistEvaluationRuleTraceRowInput[] = [];

  for (const group of groupExecutions) {
    for (const rule of group.ruleExecutions) {
      const explanationAr = resolveTraceExplanationAr(rule);

      traces.push({
        rule_set_version_id: ruleSetVersionId,
        rule_group_id: group.ruleGroupId,
        rule_id: rule.ruleId,
        rule_type_key_snapshot: rule.ruleTypeKey,
        group_severity_snapshot: group.groupSeverity,
        group_evaluation_mode_snapshot: group.groupEvaluationMode,
        outcome: rule.outcome,
        explanation_ar: explanationAr,
      });
    }
  }

  return traces;
}

const UNSUPPORTED_EXPLANATION_AR =
  "تم تخطي القاعدة — نوع القاعدة غير مدعوم حاليًا في شرح التتبع.";

/**
 * Resolve explanation_ar for one rule trace.
 * - Supported rule types: delegate to dedicated renderer.
 * - Unsupported rule types (any outcome): fixed compatibility string.
 */
function resolveTraceExplanationAr(rule: {
  ruleTypeKey: string;
  outcome: string;
  matchedCount?: number;
  requiredCount?: number;
  matchedSubjectName?: string | null;
  requiredSubjectNames?: readonly string[];
  matchedGradeValue?: number | null;
  requiredMinimumGradeValue?: number;
}): string {
  if (rule.ruleTypeKey === "minimum_subject_count") {
    return renderDirectEvaluationRuleTraceExplanation({
      ruleTypeKey: rule.ruleTypeKey,
      outcome: rule.outcome as "passed" | "failed" | "skipped",
      matchedCount: rule.matchedCount,
      requiredCount: rule.requiredCount,
    }).explanationAr;
  }

  if (rule.ruleTypeKey === "required_subject_exists") {
    return renderDirectEvaluationRuleTraceExplanation({
      ruleTypeKey: rule.ruleTypeKey,
      outcome: rule.outcome as "passed" | "failed" | "skipped",
      matchedSubjectName: rule.matchedSubjectName,
      requiredSubjectNames: rule.requiredSubjectNames,
    }).explanationAr;
  }

  if (rule.ruleTypeKey === "minimum_subject_grade") {
    return renderDirectEvaluationRuleTraceExplanation({
      ruleTypeKey: rule.ruleTypeKey,
      outcome: rule.outcome as "passed" | "failed" | "skipped",
      matchedSubjectName: rule.matchedSubjectName,
      matchedGradeValue: rule.matchedGradeValue,
      requiredMinimumGradeValue: rule.requiredMinimumGradeValue,
    }).explanationAr;
  }

  return UNSUPPORTED_EXPLANATION_AR;
}
