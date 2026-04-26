/**
 * Focused tests for the raw qualification profile validator and the
 * shared optional-language-certificate helper added in Milestone 2D.1a.
 *
 * Scope:
 *   - validateRawQualificationProfile: certificate round-trip per family
 *     (British + arabic_secondary), absent-field omission, "other"-label
 *     invariant.
 *   - validateOptionalLanguageCertificate: typed-shape checks invoked
 *     directly so failures cannot be hidden behind family-specific
 *     wrappers.
 *   - Snapshot-shape contract: when languageCertificate is absent, the
 *     validated raw profile MUST NOT contain the key (omitted, not null).
 *
 * Out of scope (deferred by design — Milestone 2D.1a is type/pass-through
 * only): no evaluator runs, no route handler runs, no seed/smoke change,
 * no schema migration. The simple-form HTTP answer-pipeline wiring of
 * `language_certificate` is also deferred — see the comment block in
 * scripts/smoke and src/types/direct-evaluation-route.ts. This file
 * exercises the validator/normalizer contract directly so simple-form
 * type readiness is demonstrably real, not just nominal.
 */

import { describe, it, expect } from "vitest";
import {
  validateRawQualificationProfile,
  validateOptionalLanguageCertificate,
} from "./direct-evaluation-raw-profile";
import { normalizeValidatedDirectEvaluationBundle } from "./normalize-direct-evaluation-profile";
import type { DirectEvaluationInputBundle } from "@/types/direct-evaluation-input-bundle";
import type { RawQualificationProfile } from "@/types/qualification-raw-profile";

// ---------------------------------------------------------------------------
// validateOptionalLanguageCertificate — direct unit tests
// ---------------------------------------------------------------------------

describe("validateOptionalLanguageCertificate", () => {
  it("returns undefined when the value is undefined (absent)", () => {
    expect(validateOptionalLanguageCertificate(undefined)).toBeUndefined();
  });

  it("returns undefined when the value is null (treated as absent)", () => {
    // The contract is OPTIONAL not nullable — but inputs may arrive with
    // an explicit null from JSON. We tolerate it on the input side and
    // surface as undefined so downstream conditional spreads omit the key.
    expect(validateOptionalLanguageCertificate(null)).toBeUndefined();
  });

  it("accepts a valid IELTS certificate", () => {
    const v = validateOptionalLanguageCertificate({
      testTypeKey: "ielts",
      score: 6.5,
    });
    expect(v).toEqual({ testTypeKey: "ielts", score: 6.5 });
  });

  it("accepts a valid Duolingo certificate with notes", () => {
    const v = validateOptionalLanguageCertificate({
      testTypeKey: "duolingo",
      score: 110,
      notesAr: "ملاحظة",
    });
    expect(v).toEqual({ testTypeKey: "duolingo", score: 110, notesAr: "ملاحظة" });
  });

  it("accepts overallScore when present and finite", () => {
    const v = validateOptionalLanguageCertificate({
      testTypeKey: "toefl",
      score: 25,
      overallScore: 95,
    });
    expect(v).toEqual({ testTypeKey: "toefl", score: 25, overallScore: 95 });
  });

  it("rejects unknown testTypeKey", () => {
    expect(() =>
      validateOptionalLanguageCertificate({ testTypeKey: "fce_legacy", score: 7 }),
    ).toThrow(/testTypeKey must be one of/);
  });

  it("rejects non-finite score (NaN)", () => {
    expect(() =>
      validateOptionalLanguageCertificate({ testTypeKey: "ielts", score: NaN }),
    ).toThrow(/score must be a finite number/);
  });

  it("rejects non-finite overallScore", () => {
    expect(() =>
      validateOptionalLanguageCertificate({
        testTypeKey: "toefl",
        score: 25,
        overallScore: Infinity,
      }),
    ).toThrow(/overallScore must be a finite number/);
  });

  it("rejects non-string notesAr when present", () => {
    expect(() =>
      validateOptionalLanguageCertificate({
        testTypeKey: "ielts",
        score: 7,
        notesAr: 123,
      }),
    ).toThrow(/notesAr must be a string/);
  });

  it("rejects non-string testTypeOtherLabel when present", () => {
    expect(() =>
      validateOptionalLanguageCertificate({
        testTypeKey: "other",
        score: 7,
        testTypeOtherLabel: 42,
      }),
    ).toThrow(/testTypeOtherLabel must be a string/);
  });

  it('rejects "other" without testTypeOtherLabel', () => {
    expect(() =>
      validateOptionalLanguageCertificate({ testTypeKey: "other", score: 7 }),
    ).toThrow(/"other" requires a non-empty testTypeOtherLabel/);
  });

  it('rejects "other" with empty/whitespace testTypeOtherLabel', () => {
    expect(() =>
      validateOptionalLanguageCertificate({
        testTypeKey: "other",
        score: 7,
        testTypeOtherLabel: "   ",
      }),
    ).toThrow(/"other" requires a non-empty testTypeOtherLabel/);
  });

  it('accepts "other" with a non-empty testTypeOtherLabel', () => {
    const v = validateOptionalLanguageCertificate({
      testTypeKey: "other",
      score: 7,
      testTypeOtherLabel: "Aptis (B2)",
    });
    expect(v).toEqual({
      testTypeKey: "other",
      score: 7,
      testTypeOtherLabel: "Aptis (B2)",
    });
  });

  it("rejects array values", () => {
    expect(() => validateOptionalLanguageCertificate([])).toThrow(
      /must be an object when present/,
    );
  });

  it("rejects primitive values", () => {
    expect(() => validateOptionalLanguageCertificate("ielts 6.5")).toThrow(
      /must be an object when present/,
    );
  });
});

// ---------------------------------------------------------------------------
// Family-validator round-trip (British)
// ---------------------------------------------------------------------------

describe("validateRawQualificationProfile — British", () => {
  const minimalBritish = {
    qualificationFamily: "british_curriculum",
    countryId: "country-uk",
    notesAr: null,
    header: {
      curriculumLabel: "British A-Level",
      graduationYear: 2026,
      notesAr: null,
    },
    subjects: [
      { subjectName: "Mathematics", subjectLevel: "A Level", grade: "A", notesAr: null },
    ],
  };

  it("accepts a British profile with a valid IELTS certificate and round-trips it", () => {
    const validated = validateRawQualificationProfile({
      ...minimalBritish,
      languageCertificate: { testTypeKey: "ielts", score: 7 },
    });
    expect(validated.qualificationFamily).toBe("british_curriculum");
    expect(validated.languageCertificate).toEqual({
      testTypeKey: "ielts",
      score: 7,
    });
  });

  it("OMITS languageCertificate from the validated profile when absent (not null)", () => {
    const validated = validateRawQualificationProfile(minimalBritish);
    // Critical snapshot-shape contract: absent → key is missing, NOT null.
    expect(Object.prototype.hasOwnProperty.call(validated, "languageCertificate")).toBe(
      false,
    );
    expect(JSON.stringify(validated)).not.toContain("languageCertificate");
  });

  it("OMITS languageCertificate when input has it as null", () => {
    // Tolerated on the input side; surfaces as omitted on the output side.
    const validated = validateRawQualificationProfile({
      ...minimalBritish,
      languageCertificate: null,
    });
    expect(Object.prototype.hasOwnProperty.call(validated, "languageCertificate")).toBe(
      false,
    );
  });

  it("rejects a British profile with an invalid certificate shape", () => {
    expect(() =>
      validateRawQualificationProfile({
        ...minimalBritish,
        languageCertificate: { testTypeKey: "fake", score: 7 },
      }),
    ).toThrow(/testTypeKey must be one of/);
  });
});

// ---------------------------------------------------------------------------
// Family-validator round-trip (Arabic secondary) — proves simple-form
// type-readiness at the validator + normalizer level even though the
// HTTP answer-pipeline is intentionally deferred in this slice.
// ---------------------------------------------------------------------------

describe("validateRawQualificationProfile — arabic_secondary (simple-form)", () => {
  const minimalArabic = {
    qualificationFamily: "arabic_secondary",
    countryId: "country-eg",
    notesAr: null,
    certificateName: "ثانوية عامة",
    finalAverage: 85,
    gradingScale: "100",
    graduationYear: 2026,
  };

  it("accepts an arabic_secondary profile with a Duolingo certificate", () => {
    const validated = validateRawQualificationProfile({
      ...minimalArabic,
      languageCertificate: { testTypeKey: "duolingo", score: 115 },
    });
    expect(validated.qualificationFamily).toBe("arabic_secondary");
    expect(validated.languageCertificate).toEqual({
      testTypeKey: "duolingo",
      score: 115,
    });
  });

  it("OMITS languageCertificate from the validated arabic_secondary profile when absent", () => {
    const validated = validateRawQualificationProfile(minimalArabic);
    expect(Object.prototype.hasOwnProperty.call(validated, "languageCertificate")).toBe(
      false,
    );
    expect(JSON.stringify(validated)).not.toContain("languageCertificate");
  });
});

// ---------------------------------------------------------------------------
// Simple-form normalizer pass-through (programmatic — bypasses HTTP
// answer-pipeline by design; see header note)
// ---------------------------------------------------------------------------

describe("normalizeValidatedDirectEvaluationBundle — language certificate pass-through", () => {
  function makeBundle(rawProfile: RawQualificationProfile): DirectEvaluationInputBundle {
    return {
      workspace: {} as never,
      target: {} as never,
      qualificationDefinition: {} as never,
      rawProfile,
    };
  }

  it("passes languageCertificate through into the normalized arabic_secondary profile", () => {
    const raw = validateRawQualificationProfile({
      qualificationFamily: "arabic_secondary",
      countryId: "country-eg",
      notesAr: null,
      certificateName: "ثانوية عامة",
      finalAverage: 85,
      gradingScale: "100",
      graduationYear: 2026,
      languageCertificate: { testTypeKey: "ielts", score: 6.5 },
    });

    const normalized = normalizeValidatedDirectEvaluationBundle(makeBundle(raw));
    expect(normalized.normalizedProfile.qualificationFamily).toBe("arabic_secondary");
    if (normalized.normalizedProfile.qualificationFamily === "arabic_secondary") {
      expect(normalized.normalizedProfile.languageCertificate).toEqual({
        testTypeKey: "ielts",
        score: 6.5,
      });
    }
  });

  it("OMITS languageCertificate from the normalized arabic_secondary profile when absent", () => {
    const raw = validateRawQualificationProfile({
      qualificationFamily: "arabic_secondary",
      countryId: "country-eg",
      notesAr: null,
      certificateName: "ثانوية عامة",
      finalAverage: 85,
      gradingScale: "100",
      graduationYear: 2026,
    });

    const normalized = normalizeValidatedDirectEvaluationBundle(makeBundle(raw));
    expect(
      Object.prototype.hasOwnProperty.call(
        normalized.normalizedProfile,
        "languageCertificate",
      ),
    ).toBe(false);
    expect(JSON.stringify(normalized.normalizedProfile)).not.toContain(
      "languageCertificate",
    );
  });

  it("passes languageCertificate through into the normalized american_high_school profile", () => {
    const raw = validateRawQualificationProfile({
      qualificationFamily: "american_high_school",
      countryId: "country-us",
      notesAr: null,
      gpa: 3.6,
      gpaScale: "4.0",
      graduationYear: 2026,
      satTotal: 1300,
      languageCertificate: { testTypeKey: "toefl", score: 27, overallScore: 100 },
    });

    const normalized = normalizeValidatedDirectEvaluationBundle(makeBundle(raw));
    if (normalized.normalizedProfile.qualificationFamily === "american_high_school") {
      expect(normalized.normalizedProfile.languageCertificate).toEqual({
        testTypeKey: "toefl",
        score: 27,
        overallScore: 100,
      });
    }
  });

  it("passes languageCertificate through into the normalized international_baccalaureate profile", () => {
    const raw = validateRawQualificationProfile({
      qualificationFamily: "international_baccalaureate",
      countryId: "country-ch",
      notesAr: null,
      diplomaType: "ib_diploma",
      totalPoints: 38,
      graduationYear: 2026,
      languageCertificate: {
        testTypeKey: "other",
        score: 200,
        testTypeOtherLabel: "Aptis (B2)",
      },
    });

    const normalized = normalizeValidatedDirectEvaluationBundle(makeBundle(raw));
    if (
      normalized.normalizedProfile.qualificationFamily === "international_baccalaureate"
    ) {
      expect(normalized.normalizedProfile.languageCertificate).toEqual({
        testTypeKey: "other",
        score: 200,
        testTypeOtherLabel: "Aptis (B2)",
      });
    }
  });
});
