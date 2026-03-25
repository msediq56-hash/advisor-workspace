/**
 * Read-only types for active qualification definition resolution.
 *
 * Covers: qualification family, qualification type, question set,
 * questions, and question options.
 *
 * No answer/result types. No evaluator types. No normalization output types.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";

/** Active qualification family summary. */
export interface QualificationFamilyRead {
  id: string;
  key: string;
  nameAr: string;
  academicStageKey: string;
}

/** Active qualification type summary. */
export interface QualificationTypeRead {
  id: string;
  familyId: string;
  key: string;
  nameAr: string;
  complexityModel: string;
}

/** A single active question option within a qualification question. */
export interface QualificationQuestionOptionRead {
  id: string;
  questionId: string;
  optionKey: string;
  labelAr: string;
  sortOrder: number;
}

/** A single active question within a qualification question set. */
export interface QualificationQuestionRead {
  id: string;
  fieldKey: string;
  labelAr: string;
  inputType: string;
  isRequired: boolean;
  orderIndex: number;
  helpTextAr: string | null;
  configJson: unknown | null;
  visibilityRuleJson: unknown | null;
  options: readonly QualificationQuestionOptionRead[];
}

/** Resolved active qualification definition for Direct Evaluation. */
export interface ActiveQualificationDefinitionRead {
  workspace: CurrentWorkspaceCapabilities;
  family: QualificationFamilyRead;
  qualificationType: QualificationTypeRead;
  questions: readonly QualificationQuestionRead[];
}
