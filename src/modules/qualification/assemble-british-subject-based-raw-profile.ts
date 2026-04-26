/**
 * Server-side British subject-based answer payload to raw profile assembler.
 *
 * Converts a British subject-based answer payload into a validated
 * RawBritishCurriculumProfile. Does not normalize grades, classify subjects,
 * or count them. That belongs to later specialized phases.
 *
 * Server-side only — do not import from client components.
 */

import { requireActiveQualificationDefinition } from "@/modules/qualification/active-qualification-definition";
import { validateRawQualificationProfile } from "@/modules/qualification/direct-evaluation-raw-profile";
import type { MembershipRole } from "@/types/enums";
import type { ActiveQualificationDefinitionRead } from "@/types/qualification-definition-read";
import type { RawBritishCurriculumProfile } from "@/types/qualification-raw-profile";
import type {
  BritishSubjectBasedAnswerPayload,
  AssembledBritishRawProfile,
} from "@/types/british-subject-answer-payload";

// ---------------------------------------------------------------------------
// Internal validation helpers
// ---------------------------------------------------------------------------

function requireStringField(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is required and must be a non-empty string`);
  }
  return value;
}

function requireNumberField(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} is required and must be a finite number`);
  }
  return value;
}

function optionalStringField(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return null;
}

// ---------------------------------------------------------------------------
// Payload validation
// ---------------------------------------------------------------------------

function validatePayload(payload: BritishSubjectBasedAnswerPayload): void {
  if (!payload.header) {
    throw new Error("British answer payload header is required");
  }
  if (!Array.isArray(payload.subjects)) {
    throw new Error("British answer payload subjects must be an array");
  }
  if (payload.subjects.length === 0) {
    throw new Error("British answer payload subjects must not be empty");
  }

  for (let i = 0; i < payload.subjects.length; i++) {
    const s = payload.subjects[i];
    if (!s || typeof s !== "object") {
      throw new Error(`subjects[${i}] must be an object`);
    }
    if (typeof s.subjectName !== "string" || (s.subjectName as string).length === 0) {
      throw new Error(`subjects[${i}].subjectName is required and must be a non-empty string`);
    }
    if (typeof s.subjectLevel !== "string" || (s.subjectLevel as string).length === 0) {
      throw new Error(`subjects[${i}].subjectLevel is required and must be a non-empty string`);
    }
    if (typeof s.grade !== "string" || (s.grade as string).length === 0) {
      throw new Error(`subjects[${i}].grade is required and must be a non-empty string`);
    }
  }
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Assemble a validated British subject-based raw profile from a qualification
 * definition and subject-based answer payload. Pure function — no DB access.
 *
 * Throws if:
 * - definition is not british_curriculum / subject_based
 * - payload is structurally invalid
 * - assembled profile fails raw profile validation
 */
export function assembleValidatedBritishSubjectBasedRawProfile(
  definition: ActiveQualificationDefinitionRead,
  payload: BritishSubjectBasedAnswerPayload,
): RawBritishCurriculumProfile {
  // Gate: must be British subject-based
  if (definition.family.key !== "british_curriculum") {
    throw new Error(
      `Expected british_curriculum family but got "${definition.family.key}". ` +
      "Use the simple-form assembler for non-British families."
    );
  }
  if (definition.qualificationType.complexityModel !== "subject_based") {
    throw new Error(
      `Expected subject_based complexity model but got "${definition.qualificationType.complexityModel}". ` +
      "British qualification types must use subject_based complexity."
    );
  }

  // Validate payload structure
  validatePayload(payload);

  const h = payload.header;

  // Assemble candidate. Pass languageCertificate through ONLY when present
  // (Milestone 2D.1a). Absent → omitted from the candidate so the raw
  // profile and downstream JSONB snapshot do not gain a `languageCertificate`
  // key. The raw profile validator's shared validateOptionalLanguageCertificate
  // helper is responsible for shape validation; here we only forward.
  const hasLanguageCertificate =
    "languageCertificate" in payload && payload.languageCertificate !== undefined;

  const candidate: Record<string, unknown> = {
    qualificationFamily: "british_curriculum" as const,
    countryId: h.countryId,
    notesAr: optionalStringField(h.notesAr),
    header: {
      curriculumLabel: requireStringField(h.curriculumLabel, "header.curriculumLabel"),
      graduationYear: requireNumberField(h.graduationYear, "header.graduationYear"),
      notesAr: optionalStringField(h.headerNotesAr),
    },
    subjects: payload.subjects.map((s, i) => ({
      subjectName: requireStringField(s.subjectName, `subjects[${i}].subjectName`),
      subjectLevel: requireStringField(s.subjectLevel, `subjects[${i}].subjectLevel`),
      grade: requireStringField(s.grade, `subjects[${i}].grade`),
      notesAr: optionalStringField(s.notesAr),
    })),
  };

  if (hasLanguageCertificate) {
    candidate.languageCertificate = payload.languageCertificate;
  }

  // Validate through existing raw profile validator
  const validated = validateRawQualificationProfile(candidate);

  // Type narrowing: the validator returns a union, but we know it's British
  if (validated.qualificationFamily !== "british_curriculum") {
    throw new Error("Unexpected: validated profile is not british_curriculum");
  }

  return validated;
}

/**
 * Full pipeline: resolve definition then assemble and validate British raw profile.
 * Throws on missing access, non-British definition, invalid payload,
 * or raw profile validation failure.
 */
export async function assembleBritishSubjectBasedRawProfile(
  params: {
    qualificationTypeKey: string;
    payload: BritishSubjectBasedAnswerPayload;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<AssembledBritishRawProfile> {
  const definition = await requireActiveQualificationDefinition({
    qualificationTypeKey: params.qualificationTypeKey,
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  const rawProfile = assembleValidatedBritishSubjectBasedRawProfile(
    definition,
    params.payload,
  );

  return {
    workspace: definition.workspace,
    qualificationDefinition: definition,
    rawProfile,
  };
}
