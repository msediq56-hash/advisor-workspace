/**
 * Server-side raw qualification profile validation for Direct Evaluation.
 *
 * Validates the unprocessed student qualification input shape.
 * Does not normalize, map grades, infer eligibility, or persist.
 *
 * Server-side only — do not import from client components.
 */

import type {
  QualificationFamilyKey,
  RawQualificationProfile,
  LanguageCertificate,
  LanguageTestTypeKey,
} from "@/types/qualification-raw-profile";

// ---------------------------------------------------------------------------
// Supported families
// ---------------------------------------------------------------------------

/** Exact list of qualification families supported in Direct Evaluation v1. */
export const SUPPORTED_QUALIFICATION_FAMILIES: readonly QualificationFamilyKey[] = [
  "arabic_secondary",
  "american_high_school",
  "british_curriculum",
  "international_baccalaureate",
] as const;

const supportedSet = new Set<string>(SUPPORTED_QUALIFICATION_FAMILIES);

/** Type guard: is the value a supported qualification family key? */
export function isSupportedQualificationFamily(
  value: string
): value is QualificationFamilyKey {
  return supportedSet.has(value);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function requireString(obj: Record<string, unknown>, key: string, label: string): string {
  const val = obj[key];
  if (typeof val !== "string" || val.length === 0) {
    throw new Error(`${label} is required and must be a non-empty string`);
  }
  return val;
}

function requireNumber(obj: Record<string, unknown>, key: string, label: string): number {
  const val = obj[key];
  if (typeof val !== "number" || !Number.isFinite(val)) {
    throw new Error(`${label} is required and must be a finite number`);
  }
  return val;
}

function optionalString(obj: Record<string, unknown>, key: string): string | null {
  const val = obj[key];
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val;
  return null;
}

function optionalNumber(obj: Record<string, unknown>, key: string): number | null {
  const val = obj[key];
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  return null;
}

// ---------------------------------------------------------------------------
// Optional language certificate (shared validator)
// ---------------------------------------------------------------------------

/** Allowed test type keys for the optional language certificate. */
const LANGUAGE_TEST_TYPE_KEYS: ReadonlySet<LanguageTestTypeKey> = new Set([
  "ielts",
  "toefl",
  "duolingo",
  "cambridge",
  "pte",
  "other",
]);

/**
 * Validate an optional language certificate value and return either the
 * validated typed object (when present and valid) or `undefined` (when
 * the field is absent — i.e. the input value is `undefined`). Throws on
 * invalid shape.
 *
 * Critical: this helper returns `undefined` (NOT `null`) for absent
 * input. Callers must spread the returned value conditionally so the
 * resulting raw/normalized object OMITS the field entirely when absent.
 *
 * Shared by:
 *   - the family-specific raw-profile validators below
 *   - the route's transport-shape parser in src/types/direct-evaluation-route.ts
 *
 * Validation rules (must match the Milestone 2D.1a contract):
 *   - testTypeKey ∈ {ielts, toefl, duolingo, cambridge, pte, other}
 *   - score is a finite number
 *   - overallScore (if present) is a finite number
 *   - testTypeOtherLabel (if present) is a string
 *   - notesAr (if present) is a string
 *   - testTypeKey === "other" REQUIRES a non-empty testTypeOtherLabel
 */
export function validateOptionalLanguageCertificate(
  value: unknown,
): LanguageCertificate | undefined {
  if (value === undefined || value === null) {
    // Absent field — explicitly do NOT synthesize a null/empty value.
    return undefined;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("languageCertificate must be an object when present");
  }
  const obj = value as Record<string, unknown>;

  const testTypeKeyRaw = obj["testTypeKey"];
  if (typeof testTypeKeyRaw !== "string") {
    throw new Error("languageCertificate.testTypeKey must be a string");
  }
  if (!LANGUAGE_TEST_TYPE_KEYS.has(testTypeKeyRaw as LanguageTestTypeKey)) {
    throw new Error(
      `languageCertificate.testTypeKey must be one of: ${[...LANGUAGE_TEST_TYPE_KEYS].join(", ")}`,
    );
  }
  const testTypeKey = testTypeKeyRaw as LanguageTestTypeKey;

  const scoreRaw = obj["score"];
  if (typeof scoreRaw !== "number" || !Number.isFinite(scoreRaw)) {
    throw new Error("languageCertificate.score must be a finite number");
  }

  // Build the validated object, omitting optional fields when absent so
  // the JSONB snapshot shape stays minimal.
  const validated: LanguageCertificate = {
    testTypeKey,
    score: scoreRaw,
  };

  if ("overallScore" in obj && obj["overallScore"] !== undefined) {
    const overall = obj["overallScore"];
    if (typeof overall !== "number" || !Number.isFinite(overall)) {
      throw new Error(
        "languageCertificate.overallScore must be a finite number when present",
      );
    }
    validated.overallScore = overall;
  }

  if ("testTypeOtherLabel" in obj && obj["testTypeOtherLabel"] !== undefined) {
    const label = obj["testTypeOtherLabel"];
    if (typeof label !== "string") {
      throw new Error(
        "languageCertificate.testTypeOtherLabel must be a string when present",
      );
    }
    validated.testTypeOtherLabel = label;
  }

  if ("notesAr" in obj && obj["notesAr"] !== undefined) {
    const notes = obj["notesAr"];
    if (typeof notes !== "string") {
      throw new Error(
        "languageCertificate.notesAr must be a string when present",
      );
    }
    validated.notesAr = notes;
  }

  // Cross-field invariant: "other" requires a non-empty label.
  if (testTypeKey === "other") {
    if (
      typeof validated.testTypeOtherLabel !== "string" ||
      validated.testTypeOtherLabel.trim().length === 0
    ) {
      throw new Error(
        'languageCertificate.testTypeKey === "other" requires a non-empty testTypeOtherLabel',
      );
    }
  }

  return validated;
}

// ---------------------------------------------------------------------------
// Family-specific validators
// ---------------------------------------------------------------------------

function validateArabicSecondary(obj: Record<string, unknown>): RawQualificationProfile {
  const cert = validateOptionalLanguageCertificate(obj["languageCertificate"]);
  return {
    qualificationFamily: "arabic_secondary",
    countryId: requireString(obj, "countryId", "countryId"),
    notesAr: optionalString(obj, "notesAr"),
    certificateName: requireString(obj, "certificateName", "certificateName"),
    finalAverage: requireNumber(obj, "finalAverage", "finalAverage"),
    gradingScale: requireString(obj, "gradingScale", "gradingScale"),
    graduationYear: requireNumber(obj, "graduationYear", "graduationYear"),
    // Conditional spread — absent → field omitted, NOT serialized as null.
    ...(cert !== undefined ? { languageCertificate: cert } : {}),
  };
}

function validateAmericanHighSchool(obj: Record<string, unknown>): RawQualificationProfile {
  const cert = validateOptionalLanguageCertificate(obj["languageCertificate"]);
  return {
    qualificationFamily: "american_high_school",
    countryId: requireString(obj, "countryId", "countryId"),
    notesAr: optionalString(obj, "notesAr"),
    gpa: requireNumber(obj, "gpa", "gpa"),
    gpaScale: requireString(obj, "gpaScale", "gpaScale"),
    graduationYear: requireNumber(obj, "graduationYear", "graduationYear"),
    satTotal: optionalNumber(obj, "satTotal"),
    ...(cert !== undefined ? { languageCertificate: cert } : {}),
  };
}

function validateBritishCurriculum(obj: Record<string, unknown>): RawQualificationProfile {
  const headerRaw = obj["header"];
  if (!headerRaw || typeof headerRaw !== "object" || Array.isArray(headerRaw)) {
    throw new Error("header is required and must be an object");
  }
  const h = headerRaw as Record<string, unknown>;

  const header = {
    curriculumLabel: requireString(h, "curriculumLabel", "header.curriculumLabel"),
    graduationYear: requireNumber(h, "graduationYear", "header.graduationYear"),
    notesAr: optionalString(h, "notesAr"),
  };

  const subjectsRaw = obj["subjects"];
  if (!Array.isArray(subjectsRaw)) {
    throw new Error("subjects is required and must be an array");
  }

  const subjects = subjectsRaw.map((s, i) => {
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      throw new Error(`subjects[${i}] must be an object`);
    }
    const sr = s as Record<string, unknown>;
    return {
      subjectName: requireString(sr, "subjectName", `subjects[${i}].subjectName`),
      subjectLevel: requireString(sr, "subjectLevel", `subjects[${i}].subjectLevel`),
      grade: requireString(sr, "grade", `subjects[${i}].grade`),
      notesAr: optionalString(sr, "notesAr"),
    };
  });

  const cert = validateOptionalLanguageCertificate(obj["languageCertificate"]);
  return {
    qualificationFamily: "british_curriculum",
    countryId: requireString(obj, "countryId", "countryId"),
    notesAr: optionalString(obj, "notesAr"),
    header,
    subjects,
    ...(cert !== undefined ? { languageCertificate: cert } : {}),
  };
}

function validateIBProfile(obj: Record<string, unknown>): RawQualificationProfile {
  const cert = validateOptionalLanguageCertificate(obj["languageCertificate"]);
  return {
    qualificationFamily: "international_baccalaureate",
    countryId: requireString(obj, "countryId", "countryId"),
    notesAr: optionalString(obj, "notesAr"),
    diplomaType: requireString(obj, "diplomaType", "diplomaType"),
    totalPoints: requireNumber(obj, "totalPoints", "totalPoints"),
    graduationYear: requireNumber(obj, "graduationYear", "graduationYear"),
    ...(cert !== undefined ? { languageCertificate: cert } : {}),
  };
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Validate an unknown input as a raw qualification profile.
 * Returns the typed profile on success.
 * Throws a clear error on invalid shape.
 */
export function validateRawQualificationProfile(
  input: unknown
): RawQualificationProfile {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Raw qualification profile must be a non-null object");
  }

  const obj = input as Record<string, unknown>;

  const family = obj["qualificationFamily"];
  if (typeof family !== "string" || family.length === 0) {
    throw new Error("qualificationFamily is required and must be a non-empty string");
  }

  if (!isSupportedQualificationFamily(family)) {
    throw new Error(`Unsupported qualification family: ${family}`);
  }

  switch (family) {
    case "arabic_secondary":
      return validateArabicSecondary(obj);
    case "american_high_school":
      return validateAmericanHighSchool(obj);
    case "british_curriculum":
      return validateBritishCurriculum(obj);
    case "international_baccalaureate":
      return validateIBProfile(obj);
  }
}

/**
 * Assert that the input is a valid raw qualification profile.
 * Throws on invalid shape.
 */
export function assertRawQualificationProfile(
  input: unknown
): asserts input is RawQualificationProfile {
  validateRawQualificationProfile(input);
}
