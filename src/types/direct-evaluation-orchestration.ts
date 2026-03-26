/**
 * Direct evaluation orchestration result and input types.
 *
 * Composed runtime results for British and simple-form direct evaluation,
 * plus the generic multi-family orchestration input contract.
 * No persistence types. No UI types.
 */

import type { PreparedBritishDirectEvaluation } from "./prepared-british-direct-evaluation";
import type { PreparedSimpleFormDirectEvaluation } from "./prepared-simple-form-direct-evaluation";
import type { ResolvedDirectEvaluationRuleContext } from "./direct-evaluation-resolved-rule-context";
import type { ExecuteDirectEvaluationRuleContextResult } from "./direct-evaluation-execution";
import type { AssembledDirectEvaluationResult } from "./direct-evaluation-result-assembly";
import type { BritishSubjectBasedAnswerPayload } from "./british-subject-answer-payload";
import type { QualificationAnswerPayload } from "./qualification-answer-payload";
import type { MembershipRole } from "./enums";

/** Full in-memory British direct evaluation runtime result. */
export interface RunBritishDirectEvaluationResult {
  prepared: PreparedBritishDirectEvaluation;
  resolvedContext: ResolvedDirectEvaluationRuleContext;
  execution: ExecuteDirectEvaluationRuleContextResult;
  assembled: AssembledDirectEvaluationResult;
  primaryReasonAr: string;
  nextStepAr: string;
  advisoryNotesAr: readonly string[];
}

/** Full in-memory simple-form direct evaluation runtime result. */
export interface RunSimpleFormDirectEvaluationResult {
  prepared: PreparedSimpleFormDirectEvaluation;
  resolvedContext: ResolvedDirectEvaluationRuleContext;
  execution: ExecuteDirectEvaluationRuleContextResult;
  assembled: AssembledDirectEvaluationResult;
  primaryReasonAr: string;
  nextStepAr: string;
  advisoryNotesAr: readonly string[];
}

// ---------------------------------------------------------------------------
// Generic multi-family orchestration input contract
// ---------------------------------------------------------------------------

/** Shared access params for all direct evaluation paths. */
export interface DirectEvaluationAccessParams {
  offeringId: string;
  qualificationTypeKey: string;
  organizationId?: string | null;
  allowedRoles?: readonly MembershipRole[];
}

/** British direct evaluation input. */
export interface DirectEvaluationBritishInput extends DirectEvaluationAccessParams {
  family: "british_curriculum";
  payload: BritishSubjectBasedAnswerPayload;
}

/** Simple-form direct evaluation input. */
export interface DirectEvaluationSimpleFormInput extends DirectEvaluationAccessParams {
  family: "arabic_secondary" | "american_high_school" | "international_baccalaureate";
  answers: QualificationAnswerPayload;
}

/** Discriminated union for generic direct evaluation orchestration input. */
export type DirectEvaluationInput =
  | DirectEvaluationBritishInput
  | DirectEvaluationSimpleFormInput;

/** Generic direct evaluation runtime result — discriminated by family. */
export type RunDirectEvaluationResult =
  | ({ family: "british_curriculum" } & RunBritishDirectEvaluationResult)
  | ({ family: "arabic_secondary" | "american_high_school" | "international_baccalaureate" } & RunSimpleFormDirectEvaluationResult);
