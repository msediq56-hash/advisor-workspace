/**
 * Pure evaluator tests for minimum_subject_grade rule type.
 *
 * Tests the narrow baseline: exact normalized subject-name matching,
 * normalizedGradeValue comparison against configured minimum threshold.
 * No fuzzy matching, no synonym expansion, no best-grade/dedup policy.
 */

import { describe, it, expect } from "vitest";
import { evaluateMinimumSubjectGradeRule } from "./evaluate-minimum-subject-grade-rule";
import type { PreparedBritishDirectEvaluation } from "@/types/prepared-british-direct-evaluation";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSubject(name: string, gradeValue: number) {
  return {
    subjectName: name,
    subjectLevel: "A-Level",
    segmentKey: "a_level" as const,
    subjectLevelKey: "a_level",
    grade: "A",
    gradeNormalizedKey: "a",
    normalizedGradeValue: gradeValue,
    isCountable: true,
    notesAr: null,
  };
}

function makePrepared(
  subjects: ReturnType<typeof makeSubject>[]
): PreparedBritishDirectEvaluation {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: {
      qualificationFamily: "british_curriculum",
      countryId: "c-1",
      notesAr: null,
      header: {
        curriculumLabel: "British",
        graduationYear: 2025,
        notesAr: null,
      },
      subjects,
    },
  };
}

const BASE_PARAMS = {
  ruleId: "rule-1",
  ruleTypeKey: "minimum_subject_grade",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("evaluateMinimumSubjectGradeRule", () => {
  // -----------------------------------------------------------------------
  // Pass / fail
  // -----------------------------------------------------------------------

  it("passes when matching subject meets the minimum grade threshold", () => {
    const prepared = makePrepared([makeSubject("mathematics", 80)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 70 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.matchedSubjectName).toBe("mathematics");
    expect(result.matchedGradeValue).toBe(80);
    expect(result.requiredMinimumGradeValue).toBe(70);
  });

  it("passes when matching subject exactly meets the threshold", () => {
    const prepared = makePrepared([makeSubject("physics", 75)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "physics", minimumGradeValue: 75 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.matchedGradeValue).toBe(75);
  });

  it("fails when matching subject is below the threshold", () => {
    const prepared = makePrepared([makeSubject("chemistry", 60)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "chemistry", minimumGradeValue: 70 },
    });

    expect(result.outcome).toBe("failed");
    expect(result.matchedSubjectName).toBe("chemistry");
    expect(result.matchedGradeValue).toBe(60);
    expect(result.requiredMinimumGradeValue).toBe(70);
  });

  it("fails when no matching subject exists", () => {
    const prepared = makePrepared([makeSubject("biology", 90)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 70 },
    });

    expect(result.outcome).toBe("failed");
    expect(result.matchedSubjectName).toBeNull();
    expect(result.matchedGradeValue).toBeNull();
    expect(result.requiredMinimumGradeValue).toBe(70);
  });

  // -----------------------------------------------------------------------
  // Normalization
  // -----------------------------------------------------------------------

  it("matches subject names case-insensitively", () => {
    const prepared = makePrepared([makeSubject("Mathematics", 80)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 70 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.matchedSubjectName).toBe("Mathematics");
  });

  it("trims whitespace from subject names for matching", () => {
    const prepared = makePrepared([makeSubject("  physics  ", 80)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "physics", minimumGradeValue: 70 },
    });

    expect(result.outcome).toBe("passed");
  });

  // -----------------------------------------------------------------------
  // Multiple subjects — uses first match
  // -----------------------------------------------------------------------

  it("uses the first matching subject when multiple exist", () => {
    const prepared = makePrepared([
      makeSubject("mathematics", 60),
      makeSubject("mathematics", 90),
    ]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 70 },
    });

    // First match has grade 60, below threshold
    expect(result.outcome).toBe("failed");
    expect(result.matchedGradeValue).toBe(60);
  });

  // -----------------------------------------------------------------------
  // Config validation
  // -----------------------------------------------------------------------

  it("throws on null config", () => {
    const prepared = makePrepared([]);
    expect(() =>
      evaluateMinimumSubjectGradeRule({
        ...BASE_PARAMS,
        prepared,
        ruleConfig: null,
      })
    ).toThrow("config must be a non-null object");
  });

  it("throws on missing subjectNameNormalized", () => {
    const prepared = makePrepared([]);
    expect(() =>
      evaluateMinimumSubjectGradeRule({
        ...BASE_PARAMS,
        prepared,
        ruleConfig: { minimumGradeValue: 70 },
      })
    ).toThrow("subjectNameNormalized");
  });

  it("throws on missing minimumGradeValue", () => {
    const prepared = makePrepared([]);
    expect(() =>
      evaluateMinimumSubjectGradeRule({
        ...BASE_PARAMS,
        prepared,
        ruleConfig: { subjectNameNormalized: "math" },
      })
    ).toThrow("minimumGradeValue");
  });

  it("throws on non-finite minimumGradeValue", () => {
    const prepared = makePrepared([]);
    expect(() =>
      evaluateMinimumSubjectGradeRule({
        ...BASE_PARAMS,
        prepared,
        ruleConfig: { subjectNameNormalized: "math", minimumGradeValue: NaN },
      })
    ).toThrow("minimumGradeValue");
  });

  // -----------------------------------------------------------------------
  // Wrong ruleTypeKey guard
  // -----------------------------------------------------------------------

  it("throws when called with wrong ruleTypeKey", () => {
    const prepared = makePrepared([]);
    expect(() =>
      evaluateMinimumSubjectGradeRule({
        prepared,
        ruleId: "rule-1",
        ruleTypeKey: "minimum_subject_count",
        ruleConfig: {},
      })
    ).toThrow("unsupported ruleTypeKey");
  });
});
