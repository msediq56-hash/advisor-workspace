/**
 * Simple-form direct-evaluation orchestration integration test baseline.
 *
 * Tests the composition sequence and result passthrough of
 * runSimpleFormDirectEvaluation without hitting real preparation,
 * execution, or rendering layers.
 *
 * Mocks all 7 composed modules.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/qualification/prepare-simple-form-direct-evaluation", () => ({
  prepareSimpleFormDirectEvaluation: vi.fn(),
}));

vi.mock("@/modules/evaluation/resolve-direct-evaluation-rule-context", () => ({
  resolveDirectEvaluationRuleContextFromPrepared: vi.fn(),
}));

vi.mock("@/modules/evaluation/execute-direct-evaluation-rule-context", () => ({
  executeDirectEvaluationRuleContext: vi.fn(),
}));

vi.mock("@/modules/evaluation/assemble-direct-evaluation-result", () => ({
  assembleDirectEvaluationResult: vi.fn(),
}));

vi.mock("@/modules/evaluation/render-direct-evaluation-primary-reason", () => ({
  renderDirectEvaluationPrimaryReason: vi.fn(),
}));

vi.mock("@/modules/evaluation/render-direct-evaluation-next-step", () => ({
  renderDirectEvaluationNextStep: vi.fn(),
}));

vi.mock("@/modules/evaluation/render-direct-evaluation-advisory-notes", () => ({
  renderDirectEvaluationAdvisoryNotes: vi.fn(),
}));

import { runSimpleFormDirectEvaluation } from "./run-simple-form-direct-evaluation";
import { prepareSimpleFormDirectEvaluation } from "@/modules/qualification/prepare-simple-form-direct-evaluation";
import { resolveDirectEvaluationRuleContextFromPrepared } from "@/modules/evaluation/resolve-direct-evaluation-rule-context";
import { executeDirectEvaluationRuleContext } from "@/modules/evaluation/execute-direct-evaluation-rule-context";
import { assembleDirectEvaluationResult } from "@/modules/evaluation/assemble-direct-evaluation-result";
import { renderDirectEvaluationPrimaryReason } from "@/modules/evaluation/render-direct-evaluation-primary-reason";
import { renderDirectEvaluationNextStep } from "@/modules/evaluation/render-direct-evaluation-next-step";
import { renderDirectEvaluationAdvisoryNotes } from "@/modules/evaluation/render-direct-evaluation-advisory-notes";

const mockPrepare = vi.mocked(prepareSimpleFormDirectEvaluation);
const mockResolve = vi.mocked(resolveDirectEvaluationRuleContextFromPrepared);
const mockExecute = vi.mocked(executeDirectEvaluationRuleContext);
const mockAssemble = vi.mocked(assembleDirectEvaluationResult);
const mockPrimaryReason = vi.mocked(renderDirectEvaluationPrimaryReason);
const mockNextStep = vi.mocked(renderDirectEvaluationNextStep);
const mockAdvisoryNotes = vi.mocked(renderDirectEvaluationAdvisoryNotes);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PARAMS = {
  offeringId: "off-1",
  qualificationTypeKey: "arabic_sec",
  answers: [{ fieldKey: "gpa", value: "90" }],
  organizationId: "org-1",
  allowedRoles: ["advisor" as const],
};

const MOCK_PREPARED = { __tag: "simple-form-prepared" } as never;
const MOCK_RESOLVED = { __tag: "resolved" } as never;
const MOCK_EXECUTION = { groupExecutions: [] };
const MOCK_ASSEMBLED = {
  finalStatus: "eligible" as const,
  primaryReasonKey: "all_required_groups_satisfied",
  matchedRulesCount: 0,
  failedGroupsCount: 0,
  conditionalGroupsCount: 0,
  groupExecutions: [],
};

function setupSuccessMocks() {
  mockPrepare.mockResolvedValue(MOCK_PREPARED);
  mockResolve.mockResolvedValue(MOCK_RESOLVED);
  mockExecute.mockReturnValue(MOCK_EXECUTION as never);
  mockAssemble.mockReturnValue(MOCK_ASSEMBLED);
  mockPrimaryReason.mockReturnValue({
    finalStatus: "eligible",
    primaryReasonKey: "all_required_groups_satisfied",
    primaryReasonAr: "مؤهل",
  });
  mockNextStep.mockReturnValue({
    finalStatus: "eligible",
    primaryReasonKey: "all_required_groups_satisfied",
    nextStepAr: "متابعة",
  });
  mockAdvisoryNotes.mockReturnValue({
    finalStatus: "eligible",
    primaryReasonKey: "all_required_groups_satisfied",
    advisoryNotesAr: [],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runSimpleFormDirectEvaluation", () => {
  beforeEach(() => {
    mockPrepare.mockReset();
    mockResolve.mockReset();
    mockExecute.mockReset();
    mockAssemble.mockReset();
    mockPrimaryReason.mockReset();
    mockNextStep.mockReset();
    mockAdvisoryNotes.mockReset();
  });

  // -----------------------------------------------------------------------
  // Composition sequence
  // -----------------------------------------------------------------------

  it("calls preparation with the input params", async () => {
    setupSuccessMocks();

    await runSimpleFormDirectEvaluation(PARAMS);

    expect(mockPrepare).toHaveBeenCalledWith(PARAMS);
  });

  it("passes prepared output to the prepared-input resolver path", async () => {
    setupSuccessMocks();

    await runSimpleFormDirectEvaluation(PARAMS);

    expect(mockResolve).toHaveBeenCalledWith(MOCK_PREPARED);
  });

  it("passes prepared + resolved context to executor", async () => {
    setupSuccessMocks();

    await runSimpleFormDirectEvaluation(PARAMS);

    expect(mockExecute).toHaveBeenCalledWith({
      prepared: MOCK_PREPARED,
      resolvedContext: MOCK_RESOLVED,
    });
  });

  it("passes execution output to assembler", async () => {
    setupSuccessMocks();

    await runSimpleFormDirectEvaluation(PARAMS);

    expect(mockAssemble).toHaveBeenCalledWith({ execution: MOCK_EXECUTION });
  });

  it("passes assembled output to all three renderers", async () => {
    setupSuccessMocks();

    await runSimpleFormDirectEvaluation(PARAMS);

    expect(mockPrimaryReason).toHaveBeenCalledWith({ assembled: MOCK_ASSEMBLED });
    expect(mockNextStep).toHaveBeenCalledWith({ assembled: MOCK_ASSEMBLED });
    expect(mockAdvisoryNotes).toHaveBeenCalledWith({ assembled: MOCK_ASSEMBLED });
  });

  // -----------------------------------------------------------------------
  // Result shape
  // -----------------------------------------------------------------------

  it("returns composed result with all expected fields", async () => {
    setupSuccessMocks();

    const result = await runSimpleFormDirectEvaluation(PARAMS);

    expect(result.prepared).toBe(MOCK_PREPARED);
    expect(result.resolvedContext).toBe(MOCK_RESOLVED);
    expect(result.execution).toBe(MOCK_EXECUTION);
    expect(result.assembled).toBe(MOCK_ASSEMBLED);
    expect(result.primaryReasonAr).toBe("مؤهل");
    expect(result.nextStepAr).toBe("متابعة");
    expect(result.advisoryNotesAr).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Failure passthrough
  // -----------------------------------------------------------------------

  it("rethrows when preparation throws", async () => {
    const err = new Error("preparation failure");
    mockPrepare.mockRejectedValue(err);

    await expect(runSimpleFormDirectEvaluation(PARAMS)).rejects.toThrow(err);
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("rethrows when rule-context resolution throws", async () => {
    mockPrepare.mockResolvedValue(MOCK_PREPARED);
    const err = new Error("resolution failure");
    mockResolve.mockRejectedValue(err);

    await expect(runSimpleFormDirectEvaluation(PARAMS)).rejects.toThrow(err);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("rethrows when execution throws", async () => {
    mockPrepare.mockResolvedValue(MOCK_PREPARED);
    mockResolve.mockResolvedValue(MOCK_RESOLVED);
    const err = new Error("execution failure");
    mockExecute.mockImplementation(() => { throw err; });

    await expect(runSimpleFormDirectEvaluation(PARAMS)).rejects.toThrow(err);
    expect(mockAssemble).not.toHaveBeenCalled();
  });

  it("rethrows when assembly throws", async () => {
    mockPrepare.mockResolvedValue(MOCK_PREPARED);
    mockResolve.mockResolvedValue(MOCK_RESOLVED);
    mockExecute.mockReturnValue(MOCK_EXECUTION as never);
    const err = new Error("assembly failure");
    mockAssemble.mockImplementation(() => { throw err; });

    await expect(runSimpleFormDirectEvaluation(PARAMS)).rejects.toThrow(err);
    expect(mockPrimaryReason).not.toHaveBeenCalled();
  });

  it("rethrows when primary-reason renderer throws", async () => {
    setupSuccessMocks();
    const err = new Error("primary reason failure");
    mockPrimaryReason.mockImplementation(() => { throw err; });

    await expect(runSimpleFormDirectEvaluation(PARAMS)).rejects.toThrow(err);
  });

  it("rethrows when next-step renderer throws", async () => {
    setupSuccessMocks();
    const err = new Error("next step failure");
    mockNextStep.mockImplementation(() => { throw err; });

    await expect(runSimpleFormDirectEvaluation(PARAMS)).rejects.toThrow(err);
  });

  it("rethrows when advisory-notes renderer throws", async () => {
    setupSuccessMocks();
    const err = new Error("advisory notes failure");
    mockAdvisoryNotes.mockImplementation(() => { throw err; });

    await expect(runSimpleFormDirectEvaluation(PARAMS)).rejects.toThrow(err);
  });
});
