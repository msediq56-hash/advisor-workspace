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
// Family-specific validators
// ---------------------------------------------------------------------------

function validateArabicSecondary(obj: Record<string, unknown>): RawQualificationProfile {
  return {
    qualificationFamily: "arabic_secondary",
    countryId: requireString(obj, "countryId", "countryId"),
    notesAr: optionalString(obj, "notesAr"),
    certificateName: requireString(obj, "certificateName", "certificateName"),
    finalAverage: requireNumber(obj, "finalAverage", "finalAverage"),
    gradingScale: requireString(obj, "gradingScale", "gradingScale"),
    graduationYear: requireNumber(obj, "graduationYear", "graduationYear"),
  };
}

function validateAmericanHighSchool(obj: Record<string, unknown>): RawQualificationProfile {
  return {
    qualificationFamily: "american_high_school",
    countryId: requireString(obj, "countryId", "countryId"),
    notesAr: optionalString(obj, "notesAr"),
    gpa: requireNumber(obj, "gpa", "gpa"),
    gpaScale: requireString(obj, "gpaScale", "gpaScale"),
    graduationYear: requireNumber(obj, "graduationYear", "graduationYear"),
    satTotal: optionalNumber(obj, "satTotal"),
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

  return {
    qualificationFamily: "british_curriculum",
    countryId: requireString(obj, "countryId", "countryId"),
    notesAr: optionalString(obj, "notesAr"),
    header,
    subjects,
  };
}

function validateIBProfile(obj: Record<string, unknown>): RawQualificationProfile {
  return {
    qualificationFamily: "international_baccalaureate",
    countryId: requireString(obj, "countryId", "countryId"),
    notesAr: optionalString(obj, "notesAr"),
    diplomaType: requireString(obj, "diplomaType", "diplomaType"),
    totalPoints: requireNumber(obj, "totalPoints", "totalPoints"),
    graduationYear: requireNumber(obj, "graduationYear", "graduationYear"),
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
