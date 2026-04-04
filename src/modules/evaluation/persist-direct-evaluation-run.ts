/**
 * Server-side persistence baseline for direct evaluation runs/results/traces.
 *
 * Pure write service. Accepts a typed Supabase client and explicit
 * persistence payload from the caller. Does not resolve session,
 * org context, target context, or evaluation results internally.
 *
 * Uses a single atomic database function (persist_direct_evaluation_run_atomic)
 * so that either the whole write succeeds (run + result + traces) or nothing
 * is persisted. No partial state is possible.
 *
 * Server-side only — do not import from client components.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PersistDirectEvaluationRunInput,
  PersistDirectEvaluationRunResult,
} from "@/types/direct-evaluation-persistence";

/**
 * Persist a direct evaluation run with its result and rule traces atomically.
 *
 * The caller must provide:
 * - a typed Supabase client (server-side or admin)
 * - explicit persistence payload data
 *
 * All three inserts (run, result, traces) happen in a single database
 * transaction via the persist_direct_evaluation_run_atomic RPC function.
 */
export async function persistDirectEvaluationRun(params: {
  supabase: SupabaseClient;
  input: PersistDirectEvaluationRunInput;
}): Promise<PersistDirectEvaluationRunResult> {
  const { supabase, input } = params;

  const { data, error } = await supabase.rpc(
    "persist_direct_evaluation_run_atomic",
    {
      p_run: input.run,
      p_result: input.result,
      p_traces: input.ruleTraces,
    }
  );

  if (error) {
    throw new Error(`Failed to persist direct evaluation run: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to persist direct evaluation run: no data returned");
  }

  return {
    evaluationRunId: data.evaluation_run_id,
    evaluationResultId: data.evaluation_result_id,
    persistedRuleTraceCount: data.persisted_rule_trace_count,
  };
}
