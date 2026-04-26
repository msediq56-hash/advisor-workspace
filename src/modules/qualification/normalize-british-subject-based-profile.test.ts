/**
 * Narrow tests that lock the canonical British runtime grade scale.
 *
 * The British normalizer is the single source of truth for the grade scale.
 * These tests verify each canonical letter maps to:
 *   - the documented ordinal numeric value
 *   - an UPPERCASE gradeNormalizedKey
 *
 * Scope is intentionally narrow — no level/segment/countability coverage,
 * no payload assembly, no evaluator semantics. This is a regression guard
 * after the Milestone 2B.1 fixture grade-scale alignment so that future
 * fixtures and rule-config thresholds cannot silently drift back to a
 * percentile-style or lowercase-key shape.
 */

import { describe, it, expect } from "vitest";
import { normalizeBritishSubjectBasedRawProfile } from "./normalize-british-subject-based-profile";
import type { RawBritishCurriculumProfile } from "@/types/qualification-raw-profile";

function makeRawProfileWithGrades(
  grades: readonly string[],
): RawBritishCurriculumProfile {
  return {
    qualificationFamily: "british_curriculum",
    countryId: "country-uk",
    notesAr: null,
    header: {
      curriculumLabel: "A Level",
      graduationYear: 2026,
      notesAr: null,
    },
    subjects: grades.map((grade, i) => ({
      subjectName: `Subject ${i + 1}`,
      subjectLevel: "A Level",
      grade,
      notesAr: null,
    })),
  };
}

describe("normalizeBritishSubjectBasedRawProfile — canonical grade scale", () => {
  it("maps each canonical letter to the documented ordinal value with uppercase key", () => {
    const expectedScale: Array<{ raw: string; key: string; value: number }> = [
      { raw: "A*", key: "A*", value: 8 },
      { raw: "A", key: "A", value: 7 },
      { raw: "B", key: "B", value: 6 },
      { raw: "C", key: "C", value: 5 },
      { raw: "D", key: "D", value: 4 },
      { raw: "E", key: "E", value: 3 },
      { raw: "F", key: "F", value: 2 },
      { raw: "G", key: "G", value: 1 },
      { raw: "U", key: "U", value: 0 },
    ];

    const normalized = normalizeBritishSubjectBasedRawProfile(
      makeRawProfileWithGrades(expectedScale.map((g) => g.raw)),
    );

    expect(normalized.subjects).toHaveLength(expectedScale.length);
    for (let i = 0; i < expectedScale.length; i++) {
      const expected = expectedScale[i];
      const actual = normalized.subjects[i];
      expect(actual.gradeNormalizedKey, `subject ${i} key`).toBe(expected.key);
      expect(actual.normalizedGradeValue, `subject ${i} value`).toBe(
        expected.value,
      );
    }
  });

  it("uppercases lowercase grade input and trims whitespace", () => {
    const normalized = normalizeBritishSubjectBasedRawProfile(
      makeRawProfileWithGrades(["a", "  b  ", "c"]),
    );

    expect(normalized.subjects[0].gradeNormalizedKey).toBe("A");
    expect(normalized.subjects[0].normalizedGradeValue).toBe(7);
    expect(normalized.subjects[1].gradeNormalizedKey).toBe("B");
    expect(normalized.subjects[1].normalizedGradeValue).toBe(6);
    expect(normalized.subjects[2].gradeNormalizedKey).toBe("C");
    expect(normalized.subjects[2].normalizedGradeValue).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Milestone 2D.1a — language certificate pass-through
//
// The normalizer is responsible for forwarding the optional
// languageCertificate from raw to normalized WITHOUT scale conversion or
// other transformation. Critical contract: when the raw profile does not
// carry a certificate, the normalized profile MUST OMIT the
// `languageCertificate` key entirely (NOT serialize it as null) so that
// existing JSONB normalized snapshots are unchanged for callers that do
// not provide one.
// ---------------------------------------------------------------------------

describe("normalizeBritishSubjectBasedRawProfile — languageCertificate pass-through", () => {
  it("passes a valid IELTS languageCertificate through unchanged", () => {
    const raw: RawBritishCurriculumProfile = {
      ...makeRawProfileWithGrades(["A"]),
      languageCertificate: { testTypeKey: "ielts", score: 7 },
    };

    const normalized = normalizeBritishSubjectBasedRawProfile(raw);

    expect(normalized.languageCertificate).toEqual({
      testTypeKey: "ielts",
      score: 7,
    });
  });

  it('passes a Duolingo languageCertificate with notesAr through unchanged (and not pre-normalizing the score scale)', () => {
    const raw: RawBritishCurriculumProfile = {
      ...makeRawProfileWithGrades(["B"]),
      languageCertificate: {
        testTypeKey: "duolingo",
        score: 110,
        notesAr: "نتيجة ديولينغو الرسمية",
      },
    };

    const normalized = normalizeBritishSubjectBasedRawProfile(raw);

    expect(normalized.languageCertificate).toEqual({
      testTypeKey: "duolingo",
      score: 110,
      notesAr: "نتيجة ديولينغو الرسمية",
    });
  });

  it("OMITS languageCertificate when the raw profile has none (snapshot-shape contract)", () => {
    const raw = makeRawProfileWithGrades(["A", "B", "C"]);
    const normalized = normalizeBritishSubjectBasedRawProfile(raw);

    expect(
      Object.prototype.hasOwnProperty.call(normalized, "languageCertificate"),
    ).toBe(false);
    expect(JSON.stringify(normalized)).not.toContain("languageCertificate");
  });
});
