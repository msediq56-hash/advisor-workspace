/**
 * Persistence write service integration test baseline.
 *
 * Tests the sequencing, insert payload mapping, and failure behavior of
 * persistDirectEvaluationRun without hitting a real database.
 *
 * Mocks only the Supabase client chain used by this module.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { persistDirectEvaluationRun } from "./persist-direct-evaluation-run";
import type { PersistDirectEvaluationRunInput } from "@/types/direct-evaluation-persistence";

// ---------------------------------------------------------------------------
// Supabase chain mock builder
// ---------------------------------------------------------------------------

interface MockInsertChain {
  fromCalls: Array<{ table: string; insertData: unknown; options?: unknown }>;
  runResponse: { data: unknown; error: unknown };
  resultResponse: { data: unknown; error: unknown };
  tracesResponse: { error: unknown; count: number | null };
}

function createMockSupabase(config: Partial<MockInsertChain> = {}) {
  const fromCalls: MockInsertChain["fromCalls"] = [];
  let callIndex = 0;

  const runResponse = config.runResponse ?? { data: { id: "run-1" }, error: null };
  const resultResponse = config.resultResponse ?? { data: { id: "result-1" }, error: null };
  const tracesResponse = config.tracesResponse ?? { error: null, count: 2 };

  const supabase = {
    from: vi.fn((table: string) => {
      const currentCall = callIndex++;

      return {
        insert: vi.fn((insertData: unknown, options?: unknown) => {
          fromCalls.push({ table, insertData, options });

          // Run insert (first call) — chain: .select().single()
          if (currentCall === 0) {
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve(runResponse)),
              })),
            };
          }

          // Result insert (second call) — chain: .select().single()
          if (currentCall === 1) {
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve(resultResponse)),
              })),
            };
          }

          // Traces insert (third call) — returns { error, count } directly
          return Promise.resolve(tracesResponse);
        }),
      };
    }),
  };

  return { supabase: supabase as never, fromCalls };
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
  // Success with traces
  // -----------------------------------------------------------------------

  it("inserts run, result, then traces in order", async () => {
    const { supabase, fromCalls } = createMockSupabase();

    await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    expect(fromCalls).toHaveLength(3);
    expect(fromCalls[0].table).toBe("evaluation_runs");
    expect(fromCalls[1].table).toBe("evaluation_results");
    expect(fromCalls[2].table).toBe("evaluation_rule_traces");
  });

  it("maps run insert fields correctly", async () => {
    const { supabase, fromCalls } = createMockSupabase();

    await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    const runData = fromCalls[0].insertData as Record<string, unknown>;
    expect(runData.organization_id).toBe("org-1");
    expect(runData.actor_user_id).toBe("user-1");
    expect(runData.flow_type).toBe("direct_evaluation");
    expect(runData.source_profile_id).toBe("profile-1");
    expect(runData.qualification_type_id).toBe("qt-1");
  });

  it("links result to run id", async () => {
    const { supabase, fromCalls } = createMockSupabase({
      runResponse: { data: { id: "run-abc" }, error: null },
    });

    await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    const resultData = fromCalls[1].insertData as Record<string, unknown>;
    expect(resultData.evaluation_run_id).toBe("run-abc");
    expect(resultData.program_offering_id).toBe("offering-1");
    expect(resultData.final_status).toBe("eligible");
  });

  it("links traces to result id", async () => {
    const { supabase, fromCalls } = createMockSupabase({
      resultResponse: { data: { id: "result-xyz" }, error: null },
    });

    await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    const traceRows = fromCalls[2].insertData as Array<Record<string, unknown>>;
    expect(traceRows).toHaveLength(2);
    expect(traceRows[0].evaluation_result_id).toBe("result-xyz");
    expect(traceRows[1].evaluation_result_id).toBe("result-xyz");
    expect(traceRows[0].rule_id).toBe("r-1");
    expect(traceRows[1].rule_id).toBe("r-2");
  });

  it("returns run id, result id, and trace count", async () => {
    const { supabase } = createMockSupabase({
      runResponse: { data: { id: "run-1" }, error: null },
      resultResponse: { data: { id: "result-1" }, error: null },
      tracesResponse: { error: null, count: 2 },
    });

    const result = await persistDirectEvaluationRun({ supabase, input: BASE_INPUT });

    expect(result.evaluationRunId).toBe("run-1");
    expect(result.evaluationResultId).toBe("result-1");
    expect(result.persistedRuleTraceCount).toBe(2);
  });

  // -----------------------------------------------------------------------
  // Success with zero traces
  // -----------------------------------------------------------------------

  it("skips trace insert and returns count 0 when no traces", async () => {
    const inputNoTraces = { ...BASE_INPUT, ruleTraces: [] };
    const { supabase, fromCalls } = createMockSupabase();

    const result = await persistDirectEvaluationRun({ supabase, input: inputNoTraces });

    expect(fromCalls).toHaveLength(2);
    expect(fromCalls[0].table).toBe("evaluation_runs");
    expect(fromCalls[1].table).toBe("evaluation_results");
    expect(result.persistedRuleTraceCount).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Failure passthrough
  // -----------------------------------------------------------------------

  it("throws on run insert error", async () => {
    const { supabase } = createMockSupabase({
      runResponse: { data: null, error: { message: "run insert failed" } },
    });

    await expect(
      persistDirectEvaluationRun({ supabase, input: BASE_INPUT })
    ).rejects.toThrow("Failed to insert evaluation_runs: run insert failed");
  });

  it("throws on result insert error", async () => {
    const { supabase } = createMockSupabase({
      resultResponse: { data: null, error: { message: "result insert failed" } },
    });

    await expect(
      persistDirectEvaluationRun({ supabase, input: BASE_INPUT })
    ).rejects.toThrow("Failed to insert evaluation_results: result insert failed");
  });

  it("throws on traces insert error", async () => {
    const { supabase } = createMockSupabase({
      tracesResponse: { error: { message: "traces insert failed" }, count: null },
    });

    await expect(
      persistDirectEvaluationRun({ supabase, input: BASE_INPUT })
    ).rejects.toThrow("Failed to insert evaluation_rule_traces: traces insert failed");
  });
});
