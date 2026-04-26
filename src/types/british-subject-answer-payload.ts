/**
 * Types for British subject-based answer payload and assembly output.
 *
 * No normalized types. No evaluator/result types. No persistence types.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { ActiveQualificationDefinitionRead } from "./qualification-definition-read";
import type { RawBritishCurriculumProfile } from "./qualification-raw-profile";

/** Header-level answer fields for a British curriculum qualification. */
export interface BritishQualificationHeaderAnswerPayload {
  countryId: string;
  notesAr: unknown;
  curriculumLabel: unknown;
  graduationYear: unknown;
  headerNotesAr: unknown;
}

/** One subject row in a British subject-based answer payload. */
export interface BritishSubjectAnswerPayload {
  subjectName: unknown;
  subjectLevel: unknown;
  grade: unknown;
  notesAr: unknown;
}

/** Full British subject-based answer payload. */
export interface BritishSubjectBasedAnswerPayload {
  header: BritishQualificationHeaderAnswerPayload;
  subjects: readonly BritishSubjectAnswerPayload[];
  /**
   * Optional language certificate (Milestone 2D.1a). Loose `unknown` here
   * mirrors the existing transport pattern — runtime validation lives in
   * the assembler / raw profile validator (shared helper). When the
   * client omits this field, the assembler must NOT add it to the raw
   * profile (preserves existing JSONB normalized snapshot shape).
   */
  languageCertificate?: unknown;
}

/** Assembled and validated British raw profile with workspace context. */
export interface AssembledBritishRawProfile {
  workspace: CurrentWorkspaceCapabilities;
  qualificationDefinition: ActiveQualificationDefinitionRead;
  rawProfile: RawBritishCurriculumProfile;
}
