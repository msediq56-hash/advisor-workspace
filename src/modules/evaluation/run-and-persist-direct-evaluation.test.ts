/**
 * Run-and-persist workflow integration test baseline.
 *
 * Tests the composition, mapping, and delegation behavior of
 * runAndPersistDirectEvaluation without hitting real evaluation or DB.
 *
 * Mocks: runDirectEvaluation, persistDirectEvaluationRun,
 *        renderDirectEvaluationRuleTraceExplanation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/evaluation/run-direct-evaluation", () => ({
  runDirectEvaluation: vi.fn(),
}));

vi.mock("@/modules/evaluation/persist-direct-evaluation-run", () => ({
  persistDirectEvaluationRun: vi.fn(),
}));

vi.mock(
  "@/modules/evaluation/render-direct-evaluation-rule-trace-explanation",
  () => ({
    renderDirectEvaluationRuleTraceExplanation: vi.fn(),
  })
);

import { runAndPersistDirectEvaluation } from "./run-and-persist-direct-evaluation";
import { runDirectEvaluation } from "@/modules/evaluation/run-direct-evaluation";
import { persistDirectEvaluationRun } from "@/modules/evaluation/persist-direct-evaluation-run";
import { renderDirectEvaluationRuleTraceExplanation } from "@/modules/evaluation/render-direct-evaluation-rule-trace-explanation";

const mockRun = vi.mocked(runDirectEvaluation);
const mockPersist = vi.mocked(persistDirectEvaluationRun);
const mockRenderTrace = vi.mocked(renderDirectEvaluationRuleTraceExplanation);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_SUPABASE = { __mock: "supabase" } as never;

const MOCK_METADATA = {
  organizationId: "org-1",
  actorUserId: "user-1",
  sourceProfileId: "profile-1" as string | null,
  requestContextJsonb: { source: "server_invocation_baseline" },
};

const MOCK_EVALUATION_INPUT = {
  family: "british_curriculum" as const,
  offeringId: "offering-1",
  qualificationTypeKey: "british_a_level",
  payload: {
    header: {
      countryId: "c-1",
      notesAr: null,
      curriculumLabel: null,
      graduationYear: null,
      headerNotesAr: null,
    },
    subjects: [],
  },
};

function makeRuntimeResult(overrides?: {
  groupExecutions?: readonly unknown[];
  ruleSetVersionId?: string | null;
}) {
  return {
    family: "british_curriculum" as const,
    prepared: {} as never,
    resolvedContext: {
      workspace: {} as never,
      target: {
        workspace: {} as never,
        country: {} as never,
        universityType: {} as never,
        university: {} as never,
        degree: {} as never,
        program: {} as never,
        offering: {
          id: "offering-1",
          programId: "prog-1",
          intakeLabelAr: "الفصل الأول",
          intakeTermKey: "fall",
          intakeYear: 2025,
          campusNameAr: "الحرم الرئيسي",
          studyModeKey: "full_time",
          durationMonths: 36,
          teachingLanguageKey: "en",
          annualTuitionAmount: 5000,
          currencyCode: "SAR",
          applicationFeeAmount: 200,
          extraFeeNoteAr: null,
          scholarshipNoteAr: null,
        },
      },
      qualificationDefinition: {
        workspace: {} as never,
        family: { id: "fam-1", key: "british_curriculum", nameAr: "بريطاني", academicStageKey: "secondary" },
        qualificationType: { id: "qt-1", familyId: "fam-1", key: "british_a_level", nameAr: "A Level", complexityModel: "subject_based" },
        questions: [],
      },
      rawProfile: {} as never,
      normalizedProfile: { qualificationFamily: "british_curriculum" } as never,
      status: "supported" as const,
      resolvedRuleSet: overrides?.ruleSetVersionId !== undefined
        ? (overrides.ruleSetVersionId
            ? { ruleSetId: "rs-1", ruleSetVersionId: overrides.ruleSetVersionId, targetScope: "offering", qualificationTypeId: "qt-1" }
            : null)
        : { ruleSetId: "rs-1", ruleSetVersionId: "rsv-1", targetScope: "offering", qualificationTypeId: "qt-1" },
      ruleGroups: [],
    },
    execution: {
      groupExecutions: (overrides?.groupExecutions ?? []) as never,
    },
    assembled: {
      finalStatus: "eligible" as const,
      primaryReasonKey: "all_required_groups_satisfied",
      matchedRulesCount: 1,
      failedGroupsCount: 0,
      conditionalGroupsCount: 0,
      groupExecutions: (overrides?.groupExecutions ?? []) as never,
    },
    primaryReasonAr: "الحالة مؤهلة",
    nextStepAr: "يمكن المتابعة",
    advisoryNotesAr: [] as readonly string[],
  };
}

const MOCK_PERSIST_RESULT = {
  evaluationRunId: "run-1",
  evaluationResultId: "result-1",
  persistedRuleTraceCount: 1,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runAndPersistDirectEvaluation", () => {
  beforeEach(() => {
    mockRun.mockReset();
    mockPersist.mockReset();
    mockRenderTrace.mockReset();
  });

  // -------------------------------------------------------------------------
  // Delegation
  // -------------------------------------------------------------------------

  it("calls runDirectEvaluation with the evaluation input", async () => {
    mockRun.mockResolvedValue(makeRuntimeResult() as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRun).toHaveBeenCalledWith(MOCK_EVALUATION_INPUT);
  });

  it("returns runtime and persistence unchanged", async () => {
    const runtimeResult = makeRuntimeResult();
    mockRun.mockResolvedValue(runtimeResult as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);

    const result = await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(result.runtime).toBe(runtimeResult);
    expect(result.persistence).toBe(MOCK_PERSIST_RESULT);
  });

  // -------------------------------------------------------------------------
  // Metadata passthrough
  // -------------------------------------------------------------------------

  it("passes caller metadata into persistence run input", async () => {
    mockRun.mockResolvedValue(makeRuntimeResult() as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.run.organization_id).toBe("org-1");
    expect(persistCall.input.run.actor_user_id).toBe("user-1");
    expect(persistCall.input.run.source_profile_id).toBe("profile-1");
    expect(persistCall.input.run.request_context_jsonb).toEqual({ source: "server_invocation_baseline" });
  });

  it("persists flow_type as direct_evaluation", async () => {
    mockRun.mockResolvedValue(makeRuntimeResult() as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.run.flow_type).toBe("direct_evaluation");
  });

  it("maps runtime fields into persistence result input", async () => {
    mockRun.mockResolvedValue(makeRuntimeResult() as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.result.program_offering_id).toBe("offering-1");
    expect(persistCall.input.result.final_status).toBe("eligible");
    expect(persistCall.input.result.primary_reason_ar).toBe("الحالة مؤهلة");
    expect(persistCall.input.result.next_step_ar).toBe("يمكن المتابعة");
    expect(persistCall.input.result.tuition_amount_snapshot).toBe(5000);
    expect(persistCall.input.result.currency_code).toBe("SAR");
    expect(persistCall.input.result.matched_rules_count).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Trace explanation: supported minimum_subject_count
  // -------------------------------------------------------------------------

  it("sources explanation_ar from dedicated renderer for minimum_subject_count traces", async () => {
    const groupExecutions = [
      {
        ruleGroupId: "rg-1",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        groupOutcome: "passed",
        ruleExecutions: [
          { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", outcome: "passed", matchedCount: 5, requiredCount: 3 },
        ],
      },
    ];

    mockRun.mockResolvedValue(makeRuntimeResult({ groupExecutions }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);
    mockRenderTrace.mockReturnValue({ explanationAr: "تحقق الحد الأدنى" });

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRenderTrace).toHaveBeenCalledWith({
      ruleTypeKey: "minimum_subject_count",
      outcome: "passed",
      matchedCount: 5,
      requiredCount: 3,
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces).toHaveLength(1);
    expect(persistCall.input.ruleTraces[0].explanation_ar).toBe("تحقق الحد الأدنى");
  });

  // -------------------------------------------------------------------------
  // Trace explanation: unsupported skipped compatibility
  // -------------------------------------------------------------------------

  it("uses fixed compatibility string for unsupported skipped traces", async () => {
    const groupExecutions = [
      {
        ruleGroupId: "rg-1",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        groupOutcome: "skipped",
        ruleExecutions: [
          { ruleId: "r-1", ruleTypeKey: "unknown_rule_type", outcome: "skipped" },
        ],
      },
    ];

    mockRun.mockResolvedValue(makeRuntimeResult({ groupExecutions }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRenderTrace).not.toHaveBeenCalled();

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces[0].explanation_ar).toBe(
      "تم تخطي القاعدة — نوع القاعدة غير مدعوم حاليًا في شرح التتبع."
    );
  });

  // -------------------------------------------------------------------------
  // Trace explanation: required_subject_exists passed
  // -------------------------------------------------------------------------

  it("sources explanation_ar from dedicated renderer for required_subject_exists passed traces", async () => {
    const groupExecutions = [
      {
        ruleGroupId: "rg-1",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        groupOutcome: "passed",
        ruleExecutions: [
          { ruleId: "r-1", ruleTypeKey: "required_subject_exists", outcome: "passed", matchedSubjectName: "mathematics", requiredSubjectNames: ["mathematics"] },
        ],
      },
    ];

    mockRun.mockResolvedValue(makeRuntimeResult({ groupExecutions }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);
    mockRenderTrace.mockReturnValue({ explanationAr: "تم العثور على المادة المطلوبة (mathematics)." });

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRenderTrace).toHaveBeenCalledWith({
      ruleTypeKey: "required_subject_exists",
      outcome: "passed",
      matchedSubjectName: "mathematics",
      requiredSubjectNames: ["mathematics"],
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces[0].explanation_ar).toBe("تم العثور على المادة المطلوبة (mathematics).");
  });

  // -------------------------------------------------------------------------
  // Trace explanation: required_subject_exists failed
  // -------------------------------------------------------------------------

  it("sources explanation_ar from dedicated renderer for required_subject_exists failed traces", async () => {
    const groupExecutions = [
      {
        ruleGroupId: "rg-1",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        groupOutcome: "failed",
        ruleExecutions: [
          { ruleId: "r-1", ruleTypeKey: "required_subject_exists", outcome: "failed", matchedSubjectName: null, requiredSubjectNames: ["mathematics"] },
        ],
      },
    ];

    mockRun.mockResolvedValue(makeRuntimeResult({ groupExecutions }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);
    mockRenderTrace.mockReturnValue({ explanationAr: "لم يتم العثور على المادة المطلوبة: mathematics." });

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRenderTrace).toHaveBeenCalledWith({
      ruleTypeKey: "required_subject_exists",
      outcome: "failed",
      matchedSubjectName: null,
      requiredSubjectNames: ["mathematics"],
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces[0].explanation_ar).toBe("لم يتم العثور على المادة المطلوبة: mathematics.");
  });

  // -------------------------------------------------------------------------
  // Trace explanation: supported minimum_subject_grade
  // -------------------------------------------------------------------------

  it("sources explanation_ar from dedicated renderer for minimum_subject_grade passed traces", async () => {
    const groupExecutions = [
      {
        ruleGroupId: "rg-1",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        groupOutcome: "passed",
        ruleExecutions: [
          { ruleId: "r-1", ruleTypeKey: "minimum_subject_grade", outcome: "passed", matchedSubjectName: "mathematics", matchedGradeValue: 80, requiredMinimumGradeValue: 70 },
        ],
      },
    ];

    mockRun.mockResolvedValue(makeRuntimeResult({ groupExecutions }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);
    mockRenderTrace.mockReturnValue({ explanationAr: "المادة تحقق الحد الأدنى للدرجة" });

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRenderTrace).toHaveBeenCalledWith({
      ruleTypeKey: "minimum_subject_grade",
      outcome: "passed",
      matchedSubjectName: "mathematics",
      matchedGradeValue: 80,
      requiredMinimumGradeValue: 70,
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces[0].explanation_ar).toBe("المادة تحقق الحد الأدنى للدرجة");
  });

  it("sources explanation_ar from dedicated renderer for minimum_subject_grade failed traces", async () => {
    const groupExecutions = [
      {
        ruleGroupId: "rg-1",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        groupOutcome: "failed",
        ruleExecutions: [
          { ruleId: "r-1", ruleTypeKey: "minimum_subject_grade", outcome: "failed", matchedSubjectName: "mathematics", matchedGradeValue: 50, requiredMinimumGradeValue: 70 },
        ],
      },
    ];

    mockRun.mockResolvedValue(makeRuntimeResult({ groupExecutions }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);
    mockRenderTrace.mockReturnValue({ explanationAr: "المادة لا تحقق الحد الأدنى" });

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRenderTrace).toHaveBeenCalledWith({
      ruleTypeKey: "minimum_subject_grade",
      outcome: "failed",
      matchedSubjectName: "mathematics",
      matchedGradeValue: 50,
      requiredMinimumGradeValue: 70,
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces[0].explanation_ar).toBe("المادة لا تحقق الحد الأدنى");
  });

  // -------------------------------------------------------------------------
  // Trace explanation: supported minimum_overall_grade
  // -------------------------------------------------------------------------

  it("sources explanation_ar from dedicated renderer for minimum_overall_grade passed traces", async () => {
    const groupExecutions = [
      {
        ruleGroupId: "rg-1",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        groupOutcome: "passed",
        ruleExecutions: [
          { ruleId: "r-1", ruleTypeKey: "minimum_overall_grade", outcome: "passed", actualValue: 85, requiredMinimumValue: 80 },
        ],
      },
    ];

    mockRun.mockResolvedValue(makeRuntimeResult({ groupExecutions }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);
    mockRenderTrace.mockReturnValue({ explanationAr: "المعدل العام يحقق الحد الأدنى" });

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRenderTrace).toHaveBeenCalledWith({
      ruleTypeKey: "minimum_overall_grade",
      outcome: "passed",
      actualValue: 85,
      requiredMinimumValue: 80,
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces[0].explanation_ar).toBe("المعدل العام يحقق الحد الأدنى");
  });

  it("sources explanation_ar from dedicated renderer for minimum_overall_grade failed traces", async () => {
    const groupExecutions = [
      {
        ruleGroupId: "rg-1",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        groupOutcome: "failed",
        ruleExecutions: [
          { ruleId: "r-1", ruleTypeKey: "minimum_overall_grade", outcome: "failed", actualValue: 70, requiredMinimumValue: 80 },
        ],
      },
    ];

    mockRun.mockResolvedValue(makeRuntimeResult({ groupExecutions }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);
    mockRenderTrace.mockReturnValue({ explanationAr: "المعدل العام لا يحقق الحد الأدنى" });

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRenderTrace).toHaveBeenCalledWith({
      ruleTypeKey: "minimum_overall_grade",
      outcome: "failed",
      actualValue: 70,
      requiredMinimumValue: 80,
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces[0].explanation_ar).toBe("المعدل العام لا يحقق الحد الأدنى");
  });

  // -------------------------------------------------------------------------
  // Trace explanation: unsupported non-skipped uses compatibility string
  // -------------------------------------------------------------------------

  it("uses compatibility string for unsupported non-skipped traces instead of throwing", async () => {
    const groupExecutions = [
      {
        ruleGroupId: "rg-1",
        groupSeverity: "blocking",
        groupEvaluationMode: "all_required",
        groupOutcome: "failed",
        ruleExecutions: [
          { ruleId: "r-1", ruleTypeKey: "unknown_rule_type", outcome: "failed" },
        ],
      },
    ];

    mockRun.mockResolvedValue(makeRuntimeResult({ groupExecutions }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);

    const result = await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    expect(mockRenderTrace).not.toHaveBeenCalled();

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces[0].explanation_ar).toBe(
      "تم تخطي القاعدة — نوع القاعدة غير مدعوم حاليًا في شرح التتبع."
    );

    expect(result.persistence).toBe(MOCK_PERSIST_RESULT);
  });

  // -------------------------------------------------------------------------
  // No rule set version → empty traces
  // -------------------------------------------------------------------------

  it("produces empty traces when resolvedRuleSet is null", async () => {
    mockRun.mockResolvedValue(makeRuntimeResult({ ruleSetVersionId: null }) as never);
    mockPersist.mockResolvedValue(MOCK_PERSIST_RESULT);

    await runAndPersistDirectEvaluation({
      supabase: MOCK_SUPABASE,
      input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
    });

    const persistCall = mockPersist.mock.calls[0][0];
    expect(persistCall.input.ruleTraces).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Failure passthrough
  // -------------------------------------------------------------------------

  it("rethrows when runDirectEvaluation throws", async () => {
    const err = new Error("runtime failure");
    mockRun.mockRejectedValue(err);

    await expect(
      runAndPersistDirectEvaluation({
        supabase: MOCK_SUPABASE,
        input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
      })
    ).rejects.toThrow(err);

    expect(mockPersist).not.toHaveBeenCalled();
  });

  it("rethrows when persistDirectEvaluationRun throws", async () => {
    mockRun.mockResolvedValue(makeRuntimeResult() as never);
    const err = new Error("persist failure");
    mockPersist.mockRejectedValue(err);

    await expect(
      runAndPersistDirectEvaluation({
        supabase: MOCK_SUPABASE,
        input: { evaluation: MOCK_EVALUATION_INPUT, persistenceMetadata: MOCK_METADATA },
      })
    ).rejects.toThrow(err);
  });
});
