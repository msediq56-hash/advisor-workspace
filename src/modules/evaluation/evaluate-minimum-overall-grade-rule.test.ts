/**
 * Pure evaluator tests for minimum_overall_grade rule type.
 *
 * Tests the narrow baseline: reads existing normalized numeric overall-grade
 * fields from simple-form profiles and compares against a configured minimum.
 * No new normalization, no grade-scale conversion, no transcript reconstruction.
 */

import { describe, it, expect } from "vitest";
import { evaluateMinimumOverallGradeRule } from "./evaluate-minimum-overall-grade-rule";
import type { PreparedSimpleFormDirectEvaluation } from "@/types/prepared-simple-form-direct-evaluation";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeArabicSecondaryPrepared(finalAverage: number): PreparedSimpleFormDirectEvaluation {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: {
      qualificationFamily: "arabic_secondary",
      countryId: "c-1",
      certificateName: "ثانوية",
      finalAverage,
      gradingScale: "100",
      graduationYear: 2025,
      notesAr: null,
    },
  };
}

function makeAmericanPrepared(gpa: number): PreparedSimpleFormDirectEvaluation {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: {
      qualificationFamily: "american_high_school",
      countryId: "c-1",
      gpa,
      gpaScale: "4.0",
      graduationYear: 2025,
      satTotal: null,
      notesAr: null,
    },
  };
}

function makeIBPrepared(totalPoints: number): PreparedSimpleFormDirectEvaluation {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: {
      qualificationFamily: "international_baccalaureate",
      countryId: "c-1",
      diplomaType: "full",
      totalPoints,
      graduationYear: 2025,
      notesAr: null,
    },
  };
}

const BASE_PARAMS = {
  ruleId: "rule-1",
  ruleTypeKey: "minimum_overall_grade",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("evaluateMinimumOverallGradeRule", () => {
  // -----------------------------------------------------------------------
  // arabic_secondary — finalAverage
  // -----------------------------------------------------------------------

  it("passes when arabic_secondary finalAverage meets threshold", () => {
    const result = evaluateMinimumOverallGradeRule({
      ...BASE_PARAMS,
      prepared: makeArabicSecondaryPrepared(85),
      ruleConfig: { profileField: "finalAverage", minimumValue: 80 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.actualValue).toBe(85);
    expect(result.requiredMinimumValue).toBe(80);
  });

  it("fails when arabic_secondary finalAverage is below threshold", () => {
    const result = evaluateMinimumOverallGradeRule({
      ...BASE_PARAMS,
      prepared: makeArabicSecondaryPrepared(75),
      ruleConfig: { profileField: "finalAverage", minimumValue: 80 },
    });

    expect(result.outcome).toBe("failed");
    expect(result.actualValue).toBe(75);
    expect(result.requiredMinimumValue).toBe(80);
  });

  it("passes when arabic_secondary finalAverage exactly meets threshold", () => {
    const result = evaluateMinimumOverallGradeRule({
      ...BASE_PARAMS,
      prepared: makeArabicSecondaryPrepared(80),
      ruleConfig: { profileField: "finalAverage", minimumValue: 80 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.actualValue).toBe(80);
  });

  // -----------------------------------------------------------------------
  // american_high_school — gpa
  // -----------------------------------------------------------------------

  it("passes when american_high_school gpa meets threshold", () => {
    const result = evaluateMinimumOverallGradeRule({
      ...BASE_PARAMS,
      prepared: makeAmericanPrepared(3.5),
      ruleConfig: { profileField: "gpa", minimumValue: 3.0 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.actualValue).toBe(3.5);
    expect(result.requiredMinimumValue).toBe(3.0);
  });

  it("fails when american_high_school gpa is below threshold", () => {
    const result = evaluateMinimumOverallGradeRule({
      ...BASE_PARAMS,
      prepared: makeAmericanPrepared(2.5),
      ruleConfig: { profileField: "gpa", minimumValue: 3.0 },
    });

    expect(result.outcome).toBe("failed");
    expect(result.actualValue).toBe(2.5);
  });

  // -----------------------------------------------------------------------
  // international_baccalaureate — totalPoints
  // -----------------------------------------------------------------------

  it("passes when IB totalPoints meets threshold", () => {
    const result = evaluateMinimumOverallGradeRule({
      ...BASE_PARAMS,
      prepared: makeIBPrepared(35),
      ruleConfig: { profileField: "totalPoints", minimumValue: 30 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.actualValue).toBe(35);
    expect(result.requiredMinimumValue).toBe(30);
  });

  it("fails when IB totalPoints is below threshold", () => {
    const result = evaluateMinimumOverallGradeRule({
      ...BASE_PARAMS,
      prepared: makeIBPrepared(25),
      ruleConfig: { profileField: "totalPoints", minimumValue: 30 },
    });

    expect(result.outcome).toBe("failed");
    expect(result.actualValue).toBe(25);
  });

  // -----------------------------------------------------------------------
  // Family mismatch → skipped
  // -----------------------------------------------------------------------

  it("skips when profileField does not match the profile family", () => {
    // arabic_secondary profile but gpa field (american)
    const result = evaluateMinimumOverallGradeRule({
      ...BASE_PARAMS,
      prepared: makeArabicSecondaryPrepared(90),
      ruleConfig: { profileField: "gpa", minimumValue: 3.0 },
    });

    expect(result.outcome).toBe("skipped");
    expect(result.actualValue).toBeNull();
    expect(result.requiredMinimumValue).toBe(3.0);
  });

  // -----------------------------------------------------------------------
  // Config validation
  // -----------------------------------------------------------------------

  it("throws on null config", () => {
    expect(() =>
      evaluateMinimumOverallGradeRule({
        ...BASE_PARAMS,
        prepared: makeArabicSecondaryPrepared(90),
        ruleConfig: null,
      })
    ).toThrow("config must be a non-null object");
  });

  it("throws on missing profileField", () => {
    expect(() =>
      evaluateMinimumOverallGradeRule({
        ...BASE_PARAMS,
        prepared: makeArabicSecondaryPrepared(90),
        ruleConfig: { minimumValue: 80 },
      })
    ).toThrow("profileField");
  });

  it("throws on unrecognized profileField", () => {
    expect(() =>
      evaluateMinimumOverallGradeRule({
        ...BASE_PARAMS,
        prepared: makeArabicSecondaryPrepared(90),
        ruleConfig: { profileField: "unknownField", minimumValue: 80 },
      })
    ).toThrow("not a recognized profile field");
  });

  it("throws on missing minimumValue", () => {
    expect(() =>
      evaluateMinimumOverallGradeRule({
        ...BASE_PARAMS,
        prepared: makeArabicSecondaryPrepared(90),
        ruleConfig: { profileField: "finalAverage" },
      })
    ).toThrow("minimumValue");
  });

  it("throws on non-finite minimumValue", () => {
    expect(() =>
      evaluateMinimumOverallGradeRule({
        ...BASE_PARAMS,
        prepared: makeArabicSecondaryPrepared(90),
        ruleConfig: { profileField: "finalAverage", minimumValue: Infinity },
      })
    ).toThrow("minimumValue");
  });

  // -----------------------------------------------------------------------
  // Wrong ruleTypeKey guard
  // -----------------------------------------------------------------------

  it("throws when called with wrong ruleTypeKey", () => {
    expect(() =>
      evaluateMinimumOverallGradeRule({
        prepared: makeArabicSecondaryPrepared(90),
        ruleId: "rule-1",
        ruleTypeKey: "minimum_subject_count",
        ruleConfig: {},
      })
    ).toThrow("unsupported ruleTypeKey");
  });
});
