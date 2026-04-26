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

// gradeValue is on the canonical British runtime ordinal scale
// (A* = 8, A = 7, B = 6, C = 5, D = 4, E = 3, F = 2, G = 1, U = 0).
// gradeNormalizedKey is uppercase, matching the real normalizer.
function makeSubject(name: string, gradeValue: number) {
  return {
    subjectName: name,
    subjectLevel: "A-Level",
    segmentKey: "a_level" as const,
    subjectLevelKey: "a_level",
    grade: "A",
    gradeNormalizedKey: "A",
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
    // mathematics A (7) ≥ threshold B (6)
    const prepared = makePrepared([makeSubject("mathematics", 7)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 6 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.matchedSubjectName).toBe("mathematics");
    expect(result.matchedGradeValue).toBe(7);
    expect(result.requiredMinimumGradeValue).toBe(6);
  });

  it("passes when matching subject exactly meets the threshold", () => {
    // physics B (6) == threshold B (6)
    const prepared = makePrepared([makeSubject("physics", 6)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "physics", minimumGradeValue: 6 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.matchedGradeValue).toBe(6);
  });

  it("fails when matching subject is below the threshold", () => {
    // chemistry C (5) < threshold B (6)
    const prepared = makePrepared([makeSubject("chemistry", 5)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "chemistry", minimumGradeValue: 6 },
    });

    expect(result.outcome).toBe("failed");
    expect(result.matchedSubjectName).toBe("chemistry");
    expect(result.matchedGradeValue).toBe(5);
    expect(result.requiredMinimumGradeValue).toBe(6);
  });

  it("fails when no matching subject exists", () => {
    // Profile only has biology (irrelevant grade); rule requires mathematics.
    const prepared = makePrepared([makeSubject("biology", 8)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 6 },
    });

    expect(result.outcome).toBe("failed");
    expect(result.matchedSubjectName).toBeNull();
    expect(result.matchedGradeValue).toBeNull();
    expect(result.requiredMinimumGradeValue).toBe(6);
  });

  // -----------------------------------------------------------------------
  // Normalization
  // -----------------------------------------------------------------------

  it("matches subject names case-insensitively", () => {
    // mathematics A (7) ≥ threshold B (6)
    const prepared = makePrepared([makeSubject("Mathematics", 7)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 6 },
    });

    expect(result.outcome).toBe("passed");
    expect(result.matchedSubjectName).toBe("Mathematics");
  });

  it("trims whitespace from subject names for matching", () => {
    // physics A (7) ≥ threshold B (6)
    const prepared = makePrepared([makeSubject("  physics  ", 7)]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "physics", minimumGradeValue: 6 },
    });

    expect(result.outcome).toBe("passed");
  });

  // -----------------------------------------------------------------------
  // Multiple subjects — uses first match
  // -----------------------------------------------------------------------

  it("uses the first matching subject when multiple exist", () => {
    // First mathematics is C (5), second is A* (8); threshold is B (6).
    // The evaluator must use the first match, so the result is failed.
    const prepared = makePrepared([
      makeSubject("mathematics", 5),
      makeSubject("mathematics", 8),
    ]);
    const result = evaluateMinimumSubjectGradeRule({
      ...BASE_PARAMS,
      prepared,
      ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 6 },
    });

    // First match has grade 5 (C), below threshold 6 (B)
    expect(result.outcome).toBe("failed");
    expect(result.matchedGradeValue).toBe(5);
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
        ruleConfig: { minimumGradeValue: 6 },
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
