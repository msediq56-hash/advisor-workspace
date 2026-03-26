/**
 * Direct evaluation persistence types.
 *
 * Row-level insert input types for evaluation_runs, evaluation_results,
 * and evaluation_rule_traces. Maps to the current Migration 1 schema exactly.
 * No UI types. No workflow types. No broader evaluator types.
 */

// ---------------------------------------------------------------------------
// evaluation_runs row input
// ---------------------------------------------------------------------------

export interface PersistEvaluationRunRowInput {
  organization_id: string;
  actor_user_id: string;
  flow_type: "direct_evaluation";
  source_profile_id: string | null;
  qualification_type_id: string;
  normalized_profile_snapshot_jsonb: unknown;
  request_context_jsonb: unknown;
}

// ---------------------------------------------------------------------------
// evaluation_results row input
// ---------------------------------------------------------------------------

export interface PersistEvaluationResultRowInput {
  program_offering_id: string;
  final_status: string;
  primary_reason_ar: string;
  next_step_ar: string | null;
  tuition_amount_snapshot: number | null;
  currency_code: string | null;
  application_fee_snapshot: number | null;
  extra_fee_note_snapshot_ar: string | null;
  scholarship_note_snapshot_ar: string | null;
  advisory_notes_jsonb: unknown | null;
  sort_bucket: string;
  matched_rules_count: number;
  failed_groups_count: number;
  conditional_groups_count: number;
  trace_summary_jsonb: unknown | null;
}

// ---------------------------------------------------------------------------
// evaluation_rule_traces row input
// ---------------------------------------------------------------------------

export interface PersistEvaluationRuleTraceRowInput {
  rule_set_version_id: string;
  rule_group_id: string;
  rule_id: string;
  rule_type_key_snapshot: string;
  group_severity_snapshot: string;
  group_evaluation_mode_snapshot: string;
  outcome: string;
  explanation_ar: string;
}

// ---------------------------------------------------------------------------
// Grouped persistence input
// ---------------------------------------------------------------------------

export interface PersistDirectEvaluationRunInput {
  run: PersistEvaluationRunRowInput;
  result: PersistEvaluationResultRowInput;
  ruleTraces: readonly PersistEvaluationRuleTraceRowInput[];
}

// ---------------------------------------------------------------------------
// Persistence result
// ---------------------------------------------------------------------------

export interface PersistDirectEvaluationRunResult {
  evaluationRunId: string;
  evaluationResultId: string;
  persistedRuleTraceCount: number;
}
