/**
 * Server-side simple-form answer payload to raw profile assembler.
 *
 * Converts a simple-form answer payload into a validated RawQualificationProfile
 * by resolving the active qualification definition, validating answer keys
 * against the active question set, and assembling the family-specific shape.
 *
 * Subject-based (British) profiles are explicitly unsupported in this baseline.
 *
 * Does not normalize, evaluate, or persist.
 *
 * Server-side only — do not import from client components.
 */

import { requireActiveQualificationDefinition } from "@/modules/qualification/active-qualification-definition";
import { validateRawQualificationProfile } from "@/modules/qualification/direct-evaluation-raw-profile";
import type { MembershipRole } from "@/types/enums";
import type { ActiveQualificationDefinitionRead } from "@/types/qualification-definition-read";
import type { RawQualificationProfile } from "@/types/qualification-raw-profile";
import type {
  QualificationAnswerPayload,
  AssembledSimpleFormRawProfile,
} from "@/types/qualification-answer-payload";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a lookup map from answers, rejecting duplicates. */
function buildAnswerMap(answers: QualificationAnswerPayload): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const entry of answers) {
    if (map.has(entry.fieldKey)) {
      throw new Error(`Duplicate answer fieldKey: "${entry.fieldKey}"`);
    }
    map.set(entry.fieldKey, entry.value);
  }
  return map;
}

/** Validate answer keys against the active question set. */
function validateAnswerKeys(
  answerMap: Map<string, unknown>,
  definition: ActiveQualificationDefinitionRead,
): void {
  const activeFieldKeys = new Set(definition.questions.map((q) => q.fieldKey));

  // Check for unknown keys
  for (const key of answerMap.keys()) {
    if (!activeFieldKeys.has(key)) {
      throw new Error(`Unknown answer fieldKey "${key}" — not in active question set`);
    }
  }

  // Check for missing required keys
  for (const question of definition.questions) {
    if (question.isRequired && !answerMap.has(question.fieldKey)) {
      throw new Error(`Missing required answer for fieldKey "${question.fieldKey}"`);
    }
  }
}

/** Get a value from the answer map, returning undefined if absent. */
function getAnswer(answerMap: Map<string, unknown>, key: string): unknown {
  return answerMap.get(key);
}

// ---------------------------------------------------------------------------
// Family-specific assembly
// ---------------------------------------------------------------------------

function assembleArabicSecondary(
  answerMap: Map<string, unknown>,
): Record<string, unknown> {
  return {
    qualificationFamily: "arabic_secondary",
    countryId: getAnswer(answerMap, "countryId"),
    notesAr: getAnswer(answerMap, "notesAr") ?? null,
    certificateName: getAnswer(answerMap, "certificateName"),
    finalAverage: getAnswer(answerMap, "finalAverage"),
    gradingScale: getAnswer(answerMap, "gradingScale"),
    graduationYear: getAnswer(answerMap, "graduationYear"),
  };
}

function assembleAmericanHighSchool(
  answerMap: Map<string, unknown>,
): Record<string, unknown> {
  return {
    qualificationFamily: "american_high_school",
    countryId: getAnswer(answerMap, "countryId"),
    notesAr: getAnswer(answerMap, "notesAr") ?? null,
    gpa: getAnswer(answerMap, "gpa"),
    gpaScale: getAnswer(answerMap, "gpaScale"),
    graduationYear: getAnswer(answerMap, "graduationYear"),
    satTotal: getAnswer(answerMap, "satTotal") ?? null,
  };
}

function assembleIB(
  answerMap: Map<string, unknown>,
): Record<string, unknown> {
  return {
    qualificationFamily: "international_baccalaureate",
    countryId: getAnswer(answerMap, "countryId"),
    notesAr: getAnswer(answerMap, "notesAr") ?? null,
    diplomaType: getAnswer(answerMap, "diplomaType"),
    totalPoints: getAnswer(answerMap, "totalPoints"),
    graduationYear: getAnswer(answerMap, "graduationYear"),
  };
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Assemble a validated simple-form raw profile from a qualification definition
 * and answer payload. Pure function — no DB access.
 *
 * Throws if:
 * - definition is subject_based or british_curriculum
 * - answer keys are invalid or missing required fields
 * - assembled profile fails raw profile validation
 */
export function assembleValidatedSimpleFormRawProfile(
  definition: ActiveQualificationDefinitionRead,
  answers: QualificationAnswerPayload,
): RawQualificationProfile {
  // Reject subject-based / British
  if (definition.qualificationType.complexityModel === "subject_based") {
    throw new Error(
      "Subject-based qualification types are not supported by simple-form assembly. " +
      "British curriculum requires specialized subject-based capture."
    );
  }

  const familyKey = definition.family.key;

  if (familyKey === "british_curriculum") {
    throw new Error(
      "British curriculum is not supported by simple-form assembly. " +
      "It requires specialized subject-based capture."
    );
  }

  // Build and validate answer map
  const answerMap = buildAnswerMap(answers);
  validateAnswerKeys(answerMap, definition);

  // Assemble family-specific candidate
  let candidate: Record<string, unknown>;

  switch (familyKey) {
    case "arabic_secondary":
      candidate = assembleArabicSecondary(answerMap);
      break;
    case "american_high_school":
      candidate = assembleAmericanHighSchool(answerMap);
      break;
    case "international_baccalaureate":
      candidate = assembleIB(answerMap);
      break;
    default:
      throw new Error(`Unsupported qualification family for simple-form assembly: "${familyKey}"`);
  }

  // Validate through the existing raw profile validator
  return validateRawQualificationProfile(candidate);
}

/**
 * Full pipeline: resolve definition then assemble and validate.
 * Throws on missing access, unsupported family/complexity, invalid answers,
 * or raw profile validation failure.
 */
export async function assembleSimpleFormRawProfile(
  params: {
    qualificationTypeKey: string;
    answers: QualificationAnswerPayload;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<AssembledSimpleFormRawProfile> {
  const definition = await requireActiveQualificationDefinition({
    qualificationTypeKey: params.qualificationTypeKey,
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  const rawProfile = assembleValidatedSimpleFormRawProfile(definition, params.answers);

  return {
    workspace: definition.workspace,
    qualificationDefinition: definition,
    rawProfile,
  };
}
