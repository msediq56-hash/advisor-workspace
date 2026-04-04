/**
 * Persistence write service integration test baseline.
 *
 * Tests the atomic RPC delegation, payload mapping, and failure behavior of
 * persistDirectEvaluationRun without hitting a real database.
 *
 * Mocks only the Supabase client rpc method used by this module.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { persistDirectEvaluationRun } from "./persist-direct-evaluation-run";
import type { PersistDirectEvaluationRunInput } from "@/types/direct-evaluation-persistence";

// ---------------------------------------------------------------------------
// Supabase RPC mock builder
// ---------------------------------------------------------------------------

function createMockSupabase(config?: {
  data?: unknown;
  error?: { message: string } | null;
}) {
  const defaultData = {
    evaluation_run_id: "run-1",
    evaluation_result_id: "result-1",
    persisted_rule_trace_count: 2,
  };
  const rpcMock = vi.fn().mockResolvedValue({
    data: config && "data" in config ? config.data : defaultData,
    error: config?.error ?? null,
  });

  return { supabase: { rpc: rpcMock } as never, rpcMock };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_INPUT: PersistDirectEvaluationRunInput = {
  run: {
    organization_id: "org-1",
    actor_user_id: "user-1",
    flow_type: "direct_evaluation",
    source_profile_id: "profile-1",
    qualification_type_id: "qt-1",
    normalized_profile_snapshot_jsonb: { family: "british_curriculum" },
    request_context_jsonb: { source: "test" },
  },
  result: {
    program_offering_id: "offering-1",
    final_status: "eligible",
    primary_reason_ar: "مؤهل",
    next_step_ar: "متابعة",
    tuition_amount_snapshot: 5000,
    currency_code: "SAR",
    application_fee_snapshot: 200,
    extra_fee_note_snapshot_ar: null,
    scholarship_note_snapshot_ar: null,
    advisory_notes_jsonb: null,
    sort_bucket: "eligible",
    matched_rules_count: 1,
    failed_groups_count: 0,
    conditional_groups_count: 0,
    trace_summary_jsonb: null,
  },
  ruleTraces: [
    {
      rule_set_version_id: "rsv-1",
      rule_group_id: "rg-1",
      rule_id: "r-1",
      rule_type_key_snapshot: "minimum_subject_count",
      group_severity_snapshot: "blocking",
      group_evaluation_mode_snapshot: "all_required",
      outcome: "passed",
      explanation_ar: "تحقق",
    },
    {
      rule_set_version_id: "rsv-1",
      rule_group_id: "rg-1",
      rule_id: "r-2",
      rule_type_key_snapshot: "minimum_subject_count",
      group_severity_snapshot: "blocking",
      group_evaluation_mode_snapshot: "all_required",
      outcome: "passed",
      explanation_ar: "تحقق أيضًا",
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("persistDirectEvaluationRun", () => {
  // -----------------------------------------------------------------------
  // Atomic delegation
  // -----------------------------------------------------------------------

  it("delegates all data through a single atomic RPC call", async () => {
    const { supabase, rpcMock } = createMockSupabase();

    await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(
      "persist_direct_evaluation_run_atomic",
      {
        p_run: BASE_INPUT.run,
        p_result: BASE_INPUT.result,
        p_traces: BASE_INPUT.ruleTraces,
      }
    );
  });

  // -----------------------------------------------------------------------
  // Payload mapping
  // -----------------------------------------------------------------------

  it("passes run fields through to the RPC", async () => {
    const { supabase, rpcMock } = createMockSupabase();

    await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    const callArgs = rpcMock.mock.calls[0][1];
    expect(callArgs.p_run.organization_id).toBe("org-1");
    expect(callArgs.p_run.actor_user_id).toBe("user-1");
    expect(callArgs.p_run.flow_type).toBe("direct_evaluation");
    expect(callArgs.p_run.source_profile_id).toBe("profile-1");
    expect(callArgs.p_run.qualification_type_id).toBe("qt-1");
  });

  it("passes result fields through to the RPC", async () => {
    const { supabase, rpcMock } = createMockSupabase();

    await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    const callArgs = rpcMock.mock.calls[0][1];
    expect(callArgs.p_result.program_offering_id).toBe("offering-1");
    expect(callArgs.p_result.final_status).toBe("eligible");
    expect(callArgs.p_result.primary_reason_ar).toBe("مؤهل");
    expect(callArgs.p_result.matched_rules_count).toBe(1);
  });

  it("passes trace rows through to the RPC", async () => {
    const { supabase, rpcMock } = createMockSupabase();

    await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    const callArgs = rpcMock.mock.calls[0][1];
    expect(callArgs.p_traces).toHaveLength(2);
    expect(callArgs.p_traces[0].rule_id).toBe("r-1");
    expect(callArgs.p_traces[1].rule_id).toBe("r-2");
  });

  // -----------------------------------------------------------------------
  // Result mapping
  // -----------------------------------------------------------------------

  it("returns run id, result id, and trace count from RPC response", async () => {
    const { supabase } = createMockSupabase({
      data: {
        evaluation_run_id: "run-abc",
        evaluation_result_id: "result-xyz",
        persisted_rule_trace_count: 3,
      },
    });

    const result = await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    expect(result.evaluationRunId).toBe("run-abc");
    expect(result.evaluationResultId).toBe("result-xyz");
    expect(result.persistedRuleTraceCount).toBe(3);
  });

  // -----------------------------------------------------------------------
  // Zero traces
  // -----------------------------------------------------------------------

  it("supports zero traces through the atomic RPC call", async () => {
    const inputNoTraces = { ...BASE_INPUT, ruleTraces: [] as const };
    const { supabase, rpcMock } = createMockSupabase({
      data: {
        evaluation_run_id: "run-1",
        evaluation_result_id: "result-1",
        persisted_rule_trace_count: 0,
      },
    });

    const result = await persistDirectEvaluationRun({ supabase, input: inputNoTraces });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const callArgs = rpcMock.mock.calls[0][1];
    expect(callArgs.p_traces).toHaveLength(0);
    expect(result.persistedRuleTraceCount).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Failure passthrough
  // -----------------------------------------------------------------------

  it("throws on RPC error", async () => {
    const { supabase } = createMockSupabase({
      data: null,
      error: { message: "transaction aborted" },
    });

    await expect(
      persistDirectEvaluationRun({ supabase, input: BASE_INPUT })
    ).rejects.toThrow("Failed to persist direct evaluation run: transaction aborted");
  });

  it("throws when RPC returns null data", async () => {
    const { supabase } = createMockSupabase({
      data: null,
      error: null,
    });

    await expect(
      persistDirectEvaluationRun({ supabase, input: BASE_INPUT })
    ).rejects.toThrow("Failed to persist direct evaluation run: no data returned");
  });
});
