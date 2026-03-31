/**
 * Pure evaluator verification baseline for required_subject_exists.
 *
 * Tests pass/fail matching, trim/lowercase normalization, payload fields,
 * invalid config rejection, and wrong ruleTypeKey guard.
 * Pure input fixtures — no mocks.
 */

import { describe, it, expect } from "vitest";
import { evaluateRequiredSubjectExistsRule } from "./evaluate-required-subject-exists-rule";
import type { NormalizedBritishSubjectRecord } from "@/types/normalized-british-profile";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSubject(
  overrides: Partial<NormalizedBritishSubjectRecord> & { subjectName: string }
): NormalizedBritishSubjectRecord {
  return {
    subjectLevel: "A Level",
    segmentKey: "a_level",
    subjectLevelKey: "a_level",
    grade: "A",
    gradeNormalizedKey: "a",
    normalizedGradeValue: 7,
    isCountable: true,
    notesAr: null,
    ...overrides,
  };
}

function makePrepared(subjects: NormalizedBritishSubjectRecord[]) {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: {
      qualificationFamily: "british_curriculum" as const,
      countryId: "c-1",
      notesAr: null,
      header: { curriculumLabel: "A Level", graduationYear: 2024, notesAr: null },
      subjects,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("evaluateRequiredSubjectExistsRule", () => {
  // -----------------------------------------------------------------------
  // Pass / fail
  // -----------------------------------------------------------------------

  it("passes when a matching subject exists", () => {
    const result = evaluateRequiredSubjectExistsRule({
      prepared: makePrepared([makeSubject({ subjectName: "mathematics" })]),
      ruleId: "r-1",
      ruleTypeKey: "required_subject_exists",
      ruleConfig: { subjectNamesNormalized: ["mathematics"] },
    });

    expect(result.outcome).toBe("passed");
    expect(result.matchedSubjectName).toBe("mathematics");
  });

  it("fails when no subject matches", () => {
    const result = evaluateRequiredSubjectExistsRule({
      prepared: makePrepared([makeSubject({ subjectName: "physics" })]),
      ruleId: "r-1",
      ruleTypeKey: "required_subject_exists",
      ruleConfig: { subjectNamesNormalized: ["mathematics"] },
    });

    expect(result.outcome).toBe("failed");
    expect(result.matchedSubjectName).toBeNull();
  });

  it("passes when any one of multiple required names matches", () => {
    const result = evaluateRequiredSubjectExistsRule({
      prepared: makePrepared([makeSubject({ subjectName: "chemistry" })]),
      ruleId: "r-1",
      ruleTypeKey: "required_subject_exists",
      ruleConfig: { subjectNamesNormalized: ["physics", "chemistry", "biology"] },
    });

    expect(result.outcome).toBe("passed");
    expect(result.matchedSubjectName).toBe("chemistry");
  });

  it("fails when none of multiple required names match", () => {
    const result = evaluateRequiredSubjectExistsRule({
      prepared: makePrepared([
        makeSubject({ subjectName: "english" }),
        makeSubject({ subjectName: "history" }),
      ]),
      ruleId: "r-1",
      ruleTypeKey: "required_subject_exists",
      ruleConfig: { subjectNamesNormalized: ["mathematics", "physics"] },
    });

    expect(result.outcome).toBe("failed");
    expect(result.matchedSubjectName).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Normalization (trim + lowercase)
  // -----------------------------------------------------------------------

  it("matches case-insensitively", () => {
    const result = evaluateRequiredSubjectExistsRule({
      prepared: makePrepared([makeSubject({ subjectName: "Mathematics" })]),
      ruleId: "r-1",
      ruleTypeKey: "required_subject_exists",
      ruleConfig: { subjectNamesNormalized: ["mathematics"] },
    });

    expect(result.outcome).toBe("passed");
  });

  it("trims whitespace before matching", () => {
    const result = evaluateRequiredSubjectExistsRule({
      prepared: makePrepared([makeSubject({ subjectName: "  physics  " })]),
      ruleId: "r-1",
      ruleTypeKey: "required_subject_exists",
      ruleConfig: { subjectNamesNormalized: ["physics"] },
    });

    expect(result.outcome).toBe("passed");
  });

  it("trims and lowercases config names too", () => {
    const result = evaluateRequiredSubjectExistsRule({
      prepared: makePrepared([makeSubject({ subjectName: "biology" })]),
      ruleId: "r-1",
      ruleTypeKey: "required_subject_exists",
      ruleConfig: { subjectNamesNormalized: ["  Biology  "] },
    });

    expect(result.outcome).toBe("passed");
  });

  // -----------------------------------------------------------------------
  // Payload fields
  // -----------------------------------------------------------------------

  it("returns requiredSubjectNames from config", () => {
    const result = evaluateRequiredSubjectExistsRule({
      prepared: makePrepared([]),
      ruleId: "r-1",
      ruleTypeKey: "required_subject_exists",
      ruleConfig: { subjectNamesNormalized: ["mathematics", "physics"] },
    });

    expect(result.requiredSubjectNames).toEqual(["mathematics", "physics"]);
  });

  it("returns first matching subject name from profile (not config)", () => {
    const result = evaluateRequiredSubjectExistsRule({
      prepared: makePrepared([
        makeSubject({ subjectName: "Physics" }),
        makeSubject({ subjectName: "Chemistry" }),
      ]),
      ruleId: "r-1",
      ruleTypeKey: "required_subject_exists",
      ruleConfig: { subjectNamesNormalized: ["physics", "chemistry"] },
    });

    // Should return the profile's casing, not config's
    expect(result.matchedSubjectName).toBe("Physics");
  });

  // -----------------------------------------------------------------------
  // Invalid config
  // -----------------------------------------------------------------------

  it("throws when config is null", () => {
    expect(() =>
      evaluateRequiredSubjectExistsRule({
        prepared: makePrepared([]),
        ruleId: "r-1",
        ruleTypeKey: "required_subject_exists",
        ruleConfig: null,
      })
    ).toThrow("config must be a non-null object");
  });

  it("throws when subjectNamesNormalized is missing", () => {
    expect(() =>
      evaluateRequiredSubjectExistsRule({
        prepared: makePrepared([]),
        ruleId: "r-1",
        ruleTypeKey: "required_subject_exists",
        ruleConfig: {},
      })
    ).toThrow("non-empty subjectNamesNormalized array");
  });

  it("throws when subjectNamesNormalized is empty", () => {
    expect(() =>
      evaluateRequiredSubjectExistsRule({
        prepared: makePrepared([]),
        ruleId: "r-1",
        ruleTypeKey: "required_subject_exists",
        ruleConfig: { subjectNamesNormalized: [] },
      })
    ).toThrow("non-empty subjectNamesNormalized array");
  });

  it("throws when subjectNamesNormalized contains non-string", () => {
    expect(() =>
      evaluateRequiredSubjectExistsRule({
        prepared: makePrepared([]),
        ruleId: "r-1",
        ruleTypeKey: "required_subject_exists",
        ruleConfig: { subjectNamesNormalized: [123] },
      })
    ).toThrow("must be a string");
  });

  // -----------------------------------------------------------------------
  // Wrong ruleTypeKey guard
  // -----------------------------------------------------------------------

  it("throws when called with wrong ruleTypeKey", () => {
    expect(() =>
      evaluateRequiredSubjectExistsRule({
        prepared: makePrepared([]),
        ruleId: "r-1",
        ruleTypeKey: "minimum_subject_count",
        ruleConfig: { subjectNamesNormalized: ["math"] },
      })
    ).toThrow('unsupported ruleTypeKey "minimum_subject_count"');
  });
});
