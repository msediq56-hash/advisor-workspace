/**
 * Server-side direct-evaluation run-and-persist workflow baseline.
 *
 * Composes the existing generic orchestrator with the existing persistence
 * write service. Maps runtime result fields into persistence payload,
 * accepting only caller-owned metadata that is not derivable from the
 * runtime result.
 *
 * Does not add UI, routes, API handlers, session/org lookup, or new
 * evaluation logic. Pure service-layer composition only.
 *
 * Server-side only — do not import from client components.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { runDirectEvaluation } from "@/modules/evaluation/run-direct-evaluation";
import { persistDirectEvaluationRun } from "@/modules/evaluation/persist-direct-evaluation-run";
import type {
  RunAndPersistDirectEvaluationInput,
  RunAndPersistDirectEvaluationResult,
} from "@/types/direct-evaluation-run-and-persist";
import type {
  PersistDirectEvaluationRunInput,
  PersistEvaluationRuleTraceRowInput,
} from "@/types/direct-evaluation-persistence";

/**
 * Run a direct evaluation end-to-end and persist the result.
 *
 * 1. Calls the existing generic direct-evaluation orchestrator
 * 2. Maps the runtime result into persistence write input
 * 3. Writes run/result/traces through the existing persistence service
 * 4. Returns both the runtime result and persistence outcome
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
    ruleTraces: mapRuleTraces(runtime),
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
 * Generates a minimal `explanation_ar` per rule from available trace data.
 */
function mapRuleTraces(
  runtime: { resolvedContext: { resolvedRuleSet: { ruleSetVersionId: string } | null }; execution: { groupExecutions: readonly import("@/types/direct-evaluation-execution").DirectEvaluationRuleGroupExecution[] } }
): PersistEvaluationRuleTraceRowInput[] {
  const ruleSetVersionId = runtime.resolvedContext.resolvedRuleSet?.ruleSetVersionId;
  if (!ruleSetVersionId) {
    return [];
  }

  const traces: PersistEvaluationRuleTraceRowInput[] = [];

  for (const group of runtime.execution.groupExecutions) {
    for (const rule of group.ruleExecutions) {
      traces.push({
        rule_set_version_id: ruleSetVersionId,
        rule_group_id: group.ruleGroupId,
        rule_id: rule.ruleId,
        rule_type_key_snapshot: rule.ruleTypeKey,
        group_severity_snapshot: group.groupSeverity,
        group_evaluation_mode_snapshot: group.groupEvaluationMode,
        outcome: rule.outcome,
        explanation_ar: buildTraceExplanationAr(rule),
      });
    }
  }

  return traces;
}

/**
 * Build a minimal Arabic explanation for a single rule trace.
 * Uses only the fields already available from the execution trace.
 */
function buildTraceExplanationAr(rule: {
  ruleTypeKey: string;
  outcome: string;
  matchedCount?: number;
  requiredCount?: number;
}): string {
  if (rule.outcome === "skipped") {
    return `تم تخطي القاعدة (${rule.ruleTypeKey}) — نوع القاعدة غير مدعوم في هذه النسخة.`;
  }

  if (rule.ruleTypeKey === "minimum_subject_count") {
    const matched = rule.matchedCount ?? 0;
    const required = rule.requiredCount ?? 0;
    if (rule.outcome === "passed") {
      return `عدد المواد المطابقة (${matched}) يحقق الحد الأدنى المطلوب (${required}).`;
    }
    return `عدد المواد المطابقة (${matched}) لا يحقق الحد الأدنى المطلوب (${required}).`;
  }

  if (rule.outcome === "passed") {
    return `القاعدة (${rule.ruleTypeKey}) تحققت.`;
  }
  return `القاعدة (${rule.ruleTypeKey}) لم تتحقق.`;
}
