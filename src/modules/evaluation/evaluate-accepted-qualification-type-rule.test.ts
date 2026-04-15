/**
 * Pure evaluator tests for accepted_qualification_type rule type.
 *
 * Tests the narrow baseline: exact string matching of the student's
 * qualification type key against configured accepted keys.
 * No aliases, no equivalence classes, no family inference.
 */

import { describe, it, expect } from "vitest";
import { evaluateAcceptedQualificationTypeRule } from "./evaluate-accepted-qualification-type-rule";
import type { ActiveQualificationDefinitionRead } from "@/types/qualification-definition-read";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeQualificationDefinition(key: string): ActiveQualificationDefinitionRead {
  return {
    workspace: {} as never,
    family: {
      id: "fam-1",
      key: "british_curriculum",
      nameAr: "بريطاني",
      academicStageKey: "secondary",
    },
    qualificationType: {
      id: "qt-1",
      familyId: "fam-1",
      key,
      nameAr: "نوع اختبار",
      complexityModel: "subject_based",
    },
    questions: [],
  };
}

const BASE_PARAMS = {
  ruleId: "rule-1",
  ruleTypeKey: "accepted_qualification_type",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("evaluateAcceptedQualificationTypeRule", () => {
  // -----------------------------------------------------------------------
  // Pass / fail
  // -----------------------------------------------------------------------

  it("passes when qualification type key is in accepted list", () => {
    const result = evaluateAcceptedQualificationTypeRule({
      ...BASE_PARAMS,
      qualificationDefinition: makeQualificationDefinition("british_a_level"),
      ruleConfig: { acceptedQualificationTypeKeys: ["british_a_level", "british_gcse"] },
    });

    expect(result.outcome).toBe("passed");
    expect(result.actualQualificationTypeKey).toBe("british_a_level");
    expect(result.acceptedQualificationTypeKeys).toEqual(["british_a_level", "british_gcse"]);
  });

  it("fails when qualification type key is not in accepted list", () => {
    const result = evaluateAcceptedQualificationTypeRule({
      ...BASE_PARAMS,
      qualificationDefinition: makeQualificationDefinition("british_gcse"),
      ruleConfig: { acceptedQualificationTypeKeys: ["british_a_level"] },
    });

    expect(result.outcome).toBe("failed");
    expect(result.actualQualificationTypeKey).toBe("british_gcse");
    expect(result.acceptedQualificationTypeKeys).toEqual(["british_a_level"]);
  });

  it("passes with single accepted key", () => {
    const result = evaluateAcceptedQualificationTypeRule({
      ...BASE_PARAMS,
      qualificationDefinition: makeQualificationDefinition("arabic_sec"),
      ruleConfig: { acceptedQualificationTypeKeys: ["arabic_sec"] },
    });

    expect(result.outcome).toBe("passed");
  });

  it("uses exact string matching only — no partial or case-insensitive match", () => {
    const result = evaluateAcceptedQualificationTypeRule({
      ...BASE_PARAMS,
      qualificationDefinition: makeQualificationDefinition("British_A_Level"),
      ruleConfig: { acceptedQualificationTypeKeys: ["british_a_level"] },
    });

    expect(result.outcome).toBe("failed");
  });

  // -----------------------------------------------------------------------
  // Config validation
  // -----------------------------------------------------------------------

  it("throws on null config", () => {
    expect(() =>
      evaluateAcceptedQualificationTypeRule({
        ...BASE_PARAMS,
        qualificationDefinition: makeQualificationDefinition("test"),
        ruleConfig: null,
      })
    ).toThrow("config must be a non-null object");
  });

  it("throws on missing acceptedQualificationTypeKeys", () => {
    expect(() =>
      evaluateAcceptedQualificationTypeRule({
        ...BASE_PARAMS,
        qualificationDefinition: makeQualificationDefinition("test"),
        ruleConfig: {},
      })
    ).toThrow("acceptedQualificationTypeKeys");
  });

  it("throws on empty acceptedQualificationTypeKeys array", () => {
    expect(() =>
      evaluateAcceptedQualificationTypeRule({
        ...BASE_PARAMS,
        qualificationDefinition: makeQualificationDefinition("test"),
        ruleConfig: { acceptedQualificationTypeKeys: [] },
      })
    ).toThrow("acceptedQualificationTypeKeys");
  });

  it("throws on non-string element in acceptedQualificationTypeKeys", () => {
    expect(() =>
      evaluateAcceptedQualificationTypeRule({
        ...BASE_PARAMS,
        qualificationDefinition: makeQualificationDefinition("test"),
        ruleConfig: { acceptedQualificationTypeKeys: [123] },
      })
    ).toThrow("acceptedQualificationTypeKeys[0] must be a string");
  });

  // -----------------------------------------------------------------------
  // Wrong ruleTypeKey guard
  // -----------------------------------------------------------------------

  it("throws when called with wrong ruleTypeKey", () => {
    expect(() =>
      evaluateAcceptedQualificationTypeRule({
        qualificationDefinition: makeQualificationDefinition("test"),
        ruleId: "rule-1",
        ruleTypeKey: "minimum_subject_count",
        ruleConfig: {},
      })
    ).toThrow("unsupported ruleTypeKey");
  });
});
