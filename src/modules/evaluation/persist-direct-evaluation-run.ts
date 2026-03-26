/**
 * Server-side persistence baseline for direct evaluation runs/results/traces.
 *
 * Pure write service. Accepts a typed Supabase client and explicit
 * persistence payload from the caller. Does not resolve session,
 * org context, target context, or evaluation results internally.
 *
 * Inserts:
 * 1. One evaluation_runs row
 * 2. One evaluation_results row (linked by evaluation_run_id)
 * 3. Zero or more evaluation_rule_traces rows (linked by evaluation_result_id)
 *
 * Server-side only — do not import from client components.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PersistDirectEvaluationRunInput,
  PersistDirectEvaluationRunResult,
} from "@/types/direct-evaluation-persistence";

/**
 * Persist a direct evaluation run with its result and rule traces.
 *
 * The caller must provide:
 * - a typed Supabase client (server-side or admin)
 * - explicit persistence payload data
 *
 * Fails fast on any insert error.
 */
export async function persistDirectEvaluationRun(params: {
  supabase: SupabaseClient;
  input: PersistDirectEvaluationRunInput;
}): Promise<PersistDirectEvaluationRunResult> {
  const { supabase, input } = params;

  // 1. Insert evaluation_runs
  const { data: runRow, error: runError } = await supabase
    .from("evaluation_runs")
    .insert({
      organization_id: input.run.organization_id,
      actor_user_id: input.run.actor_user_id,
      flow_type: input.run.flow_type,
      source_profile_id: input.run.source_profile_id,
      qualification_type_id: input.run.qualification_type_id,
      normalized_profile_snapshot_jsonb: input.run.normalized_profile_snapshot_jsonb,
      request_context_jsonb: input.run.request_context_jsonb,
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    throw new Error(`Failed to insert evaluation_runs: ${runError?.message ?? "no row returned"}`);
  }

  const evaluationRunId: string = runRow.id;

  // 2. Insert evaluation_results
  const { data: resultRow, error: resultError } = await supabase
    .from("evaluation_results")
    .insert({
      evaluation_run_id: evaluationRunId,
      program_offering_id: input.result.program_offering_id,
      final_status: input.result.final_status,
      primary_reason_ar: input.result.primary_reason_ar,
      next_step_ar: input.result.next_step_ar,
      tuition_amount_snapshot: input.result.tuition_amount_snapshot,
      currency_code: input.result.currency_code,
      application_fee_snapshot: input.result.application_fee_snapshot,
      extra_fee_note_snapshot_ar: input.result.extra_fee_note_snapshot_ar,
      scholarship_note_snapshot_ar: input.result.scholarship_note_snapshot_ar,
      advisory_notes_jsonb: input.result.advisory_notes_jsonb,
      sort_bucket: input.result.sort_bucket,
      matched_rules_count: input.result.matched_rules_count,
      failed_groups_count: input.result.failed_groups_count,
      conditional_groups_count: input.result.conditional_groups_count,
      trace_summary_jsonb: input.result.trace_summary_jsonb,
    })
    .select("id")
    .single();

  if (resultError || !resultRow) {
    throw new Error(`Failed to insert evaluation_results: ${resultError?.message ?? "no row returned"}`);
  }

  const evaluationResultId: string = resultRow.id;

  // 3. Insert evaluation_rule_traces (if any)
  let persistedRuleTraceCount = 0;

  if (input.ruleTraces.length > 0) {
    const traceRows = input.ruleTraces.map((t) => ({
      evaluation_result_id: evaluationResultId,
      rule_set_version_id: t.rule_set_version_id,
      rule_group_id: t.rule_group_id,
      rule_id: t.rule_id,
      rule_type_key_snapshot: t.rule_type_key_snapshot,
      group_severity_snapshot: t.group_severity_snapshot,
      group_evaluation_mode_snapshot: t.group_evaluation_mode_snapshot,
      outcome: t.outcome,
      explanation_ar: t.explanation_ar,
    }));

    const { error: tracesError, count } = await supabase
      .from("evaluation_rule_traces")
      .insert(traceRows, { count: "exact" });

    if (tracesError) {
      throw new Error(`Failed to insert evaluation_rule_traces: ${tracesError.message}`);
    }

    persistedRuleTraceCount = count ?? input.ruleTraces.length;
  }

  return {
    evaluationRunId,
    evaluationResultId,
    persistedRuleTraceCount,
  };
}
