-- Migration 8: Atomic persistence function for direct evaluation runs.
--
-- Wraps the three-table insert (evaluation_runs, evaluation_results,
-- evaluation_rule_traces) in a single transactional function body so
-- that partial persisted state cannot occur.
--
-- Called via supabase.rpc('persist_direct_evaluation_run_atomic', {...})
-- from the application persistence service.

CREATE OR REPLACE FUNCTION persist_direct_evaluation_run_atomic(
  p_run    JSONB,
  p_result JSONB,
  p_traces JSONB  -- JSON array, may be empty '[]'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run_id       UUID;
  v_result_id    UUID;
  v_trace_count  INT := 0;
BEGIN
  -- 1. Insert evaluation_runs
  INSERT INTO evaluation_runs (
    organization_id,
    actor_user_id,
    flow_type,
    source_profile_id,
    qualification_type_id,
    normalized_profile_snapshot_jsonb,
    request_context_jsonb
  ) VALUES (
    (p_run->>'organization_id')::UUID,
    (p_run->>'actor_user_id')::UUID,
    (p_run->>'flow_type')::evaluation_flow_type,
    (p_run->>'source_profile_id')::UUID,
    (p_run->>'qualification_type_id')::UUID,
    (p_run->'normalized_profile_snapshot_jsonb'),
    (p_run->'request_context_jsonb')
  )
  RETURNING id INTO v_run_id;

  -- 2. Insert evaluation_results (linked to run)
  INSERT INTO evaluation_results (
    evaluation_run_id,
    program_offering_id,
    final_status,
    primary_reason_ar,
    next_step_ar,
    tuition_amount_snapshot,
    currency_code,
    application_fee_snapshot,
    extra_fee_note_snapshot_ar,
    scholarship_note_snapshot_ar,
    advisory_notes_jsonb,
    sort_bucket,
    matched_rules_count,
    failed_groups_count,
    conditional_groups_count,
    trace_summary_jsonb
  ) VALUES (
    v_run_id,
    (p_result->>'program_offering_id')::UUID,
    (p_result->>'final_status')::evaluation_final_status,
    (p_result->>'primary_reason_ar'),
    (p_result->>'next_step_ar'),
    (p_result->>'tuition_amount_snapshot')::NUMERIC(12,2),
    (p_result->>'currency_code'),
    (p_result->>'application_fee_snapshot')::NUMERIC(12,2),
    (p_result->>'extra_fee_note_snapshot_ar'),
    (p_result->>'scholarship_note_snapshot_ar'),
    (p_result->'advisory_notes_jsonb'),
    (p_result->>'sort_bucket'),
    (p_result->>'matched_rules_count')::INT,
    (p_result->>'failed_groups_count')::INT,
    (p_result->>'conditional_groups_count')::INT,
    (p_result->'trace_summary_jsonb')
  )
  RETURNING id INTO v_result_id;

  -- 3. Insert evaluation_rule_traces (if any)
  IF jsonb_array_length(p_traces) > 0 THEN
    INSERT INTO evaluation_rule_traces (
      evaluation_result_id,
      rule_set_version_id,
      rule_group_id,
      rule_id,
      rule_type_key_snapshot,
      group_severity_snapshot,
      group_evaluation_mode_snapshot,
      outcome,
      explanation_ar
    )
    SELECT
      v_result_id,
      (t->>'rule_set_version_id')::UUID,
      (t->>'rule_group_id')::UUID,
      (t->>'rule_id')::UUID,
      (t->>'rule_type_key_snapshot'),
      (t->>'group_severity_snapshot')::rule_group_severity,
      (t->>'group_evaluation_mode_snapshot')::rule_group_evaluation_mode,
      (t->>'outcome')::trace_outcome,
      (t->>'explanation_ar')
    FROM jsonb_array_elements(p_traces) AS t;

    GET DIAGNOSTICS v_trace_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'evaluation_run_id', v_run_id,
    'evaluation_result_id', v_result_id,
    'persisted_rule_trace_count', v_trace_count
  );
END;
$$;
