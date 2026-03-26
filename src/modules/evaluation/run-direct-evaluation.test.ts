/**
 * Generic multi-family direct-evaluation orchestration test baseline.
 *
 * Tests the family routing behavior of runDirectEvaluation without
 * hitting real preparation, execution, or persistence layers.
 *
 * Mocks: runBritishDirectEvaluation, runSimpleFormDirectEvaluation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/evaluation/run-british-direct-evaluation", () => ({
  runBritishDirectEvaluation: vi.fn(),
}));

vi.mock("@/modules/evaluation/run-simple-form-direct-evaluation", () => ({
  runSimpleFormDirectEvaluation: vi.fn(),
}));

import { runDirectEvaluation } from "./run-direct-evaluation";
import { runBritishDirectEvaluation } from "@/modules/evaluation/run-british-direct-evaluation";
import { runSimpleFormDirectEvaluation } from "@/modules/evaluation/run-simple-form-direct-evaluation";

const mockBritish = vi.mocked(runBritishDirectEvaluation);
const mockSimpleForm = vi.mocked(runSimpleFormDirectEvaluation);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BRITISH_INPUT = {
  family: "british_curriculum" as const,
  offeringId: "off-1",
  qualificationTypeKey: "british_a_level",
  payload: { header: {}, subjects: [] },
  organizationId: "org-1",
  allowedRoles: ["owner" as const],
};

const MOCK_BRITISH_RESULT = {
  prepared: {} as never,
  resolvedContext: {} as never,
  execution: { groupExecutions: [] },
  assembled: {} as never,
  primaryReasonAr: "بريطاني",
  nextStepAr: "خطوة",
  advisoryNotesAr: [] as readonly string[],
};

function makeSimpleFormInput(family: "arabic_secondary" | "american_high_school" | "international_baccalaureate") {
  return {
    family,
    offeringId: "off-2",
    qualificationTypeKey: `${family}_key`,
    answers: [{ fieldKey: "gpa", value: "90" }],
    organizationId: "org-2",
    allowedRoles: ["advisor" as const],
  };
}

const MOCK_SIMPLE_FORM_RESULT = {
  prepared: {} as never,
  resolvedContext: {} as never,
  execution: { groupExecutions: [] },
  assembled: {} as never,
  primaryReasonAr: "بسيط",
  nextStepAr: "خطوة",
  advisoryNotesAr: [] as readonly string[],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runDirectEvaluation", () => {
  beforeEach(() => {
    mockBritish.mockReset();
    mockSimpleForm.mockReset();
  });

  // -----------------------------------------------------------------------
  // British routing
  // -----------------------------------------------------------------------

  it("routes british_curriculum to runBritishDirectEvaluation", async () => {
    mockBritish.mockResolvedValue(MOCK_BRITISH_RESULT);

    await runDirectEvaluation(BRITISH_INPUT);

    expect(mockBritish).toHaveBeenCalledOnce();
    expect(mockSimpleForm).not.toHaveBeenCalled();
  });

  it("passes exact params to British orchestrator", async () => {
    mockBritish.mockResolvedValue(MOCK_BRITISH_RESULT);

    await runDirectEvaluation(BRITISH_INPUT);

    expect(mockBritish).toHaveBeenCalledWith({
      offeringId: "off-1",
      qualificationTypeKey: "british_a_level",
      payload: BRITISH_INPUT.payload,
      organizationId: "org-1",
      allowedRoles: ["owner"],
    });
  });

  it("returns British result with family discriminant", async () => {
    mockBritish.mockResolvedValue(MOCK_BRITISH_RESULT);

    const result = await runDirectEvaluation(BRITISH_INPUT);

    expect(result.family).toBe("british_curriculum");
    expect(result.primaryReasonAr).toBe("بريطاني");
  });

  // -----------------------------------------------------------------------
  // Simple-form routing
  // -----------------------------------------------------------------------

  for (const family of [
    "arabic_secondary",
    "american_high_school",
    "international_baccalaureate",
  ] as const) {
    it(`routes ${family} to runSimpleFormDirectEvaluation`, async () => {
      mockSimpleForm.mockResolvedValue(MOCK_SIMPLE_FORM_RESULT);

      await runDirectEvaluation(makeSimpleFormInput(family));

      expect(mockSimpleForm).toHaveBeenCalledOnce();
      expect(mockBritish).not.toHaveBeenCalled();
    });

    it(`passes exact params to simple-form orchestrator for ${family}`, async () => {
      mockSimpleForm.mockResolvedValue(MOCK_SIMPLE_FORM_RESULT);
      const input = makeSimpleFormInput(family);

      await runDirectEvaluation(input);

      expect(mockSimpleForm).toHaveBeenCalledWith({
        offeringId: "off-2",
        qualificationTypeKey: `${family}_key`,
        answers: input.answers,
        organizationId: "org-2",
        allowedRoles: ["advisor"],
      });
    });

    it(`returns ${family} result with correct family discriminant`, async () => {
      mockSimpleForm.mockResolvedValue(MOCK_SIMPLE_FORM_RESULT);

      const result = await runDirectEvaluation(makeSimpleFormInput(family));

      expect(result.family).toBe(family);
      expect(result.primaryReasonAr).toBe("بسيط");
    });
  }

  // -----------------------------------------------------------------------
  // Error passthrough
  // -----------------------------------------------------------------------

  it("rethrows when British orchestrator throws", async () => {
    const err = new Error("British failure");
    mockBritish.mockRejectedValue(err);

    await expect(runDirectEvaluation(BRITISH_INPUT)).rejects.toThrow(err);
  });

  it("rethrows when simple-form orchestrator throws", async () => {
    const err = new Error("Simple-form failure");
    mockSimpleForm.mockRejectedValue(err);

    await expect(
      runDirectEvaluation(makeSimpleFormInput("arabic_secondary"))
    ).rejects.toThrow(err);
  });
});
