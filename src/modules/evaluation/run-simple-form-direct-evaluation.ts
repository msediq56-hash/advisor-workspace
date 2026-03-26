/**
 * Server-side simple-form direct evaluation in-memory orchestration baseline.
 *
 * Composes the already-implemented runtime slices in sequence:
 * 1. Simple-form preparation
 * 2. Rule context resolution (from prepared input)
 * 3. Execution
 * 4. Result assembly
 * 5. Explanation rendering (primary reason, next step, advisory notes)
 *
 * Returns one composed runtime result object. No persistence, no UI.
 *
 * Server-side only — do not import from client components.
 */

import { prepareSimpleFormDirectEvaluation } from "@/modules/qualification/prepare-simple-form-direct-evaluation";
import { resolveDirectEvaluationRuleContextFromPrepared } from "@/modules/evaluation/resolve-direct-evaluation-rule-context";
import { executeDirectEvaluationRuleContext } from "@/modules/evaluation/execute-direct-evaluation-rule-context";
import { assembleDirectEvaluationResult } from "@/modules/evaluation/assemble-direct-evaluation-result";
import { renderDirectEvaluationPrimaryReason } from "@/modules/evaluation/render-direct-evaluation-primary-reason";
import { renderDirectEvaluationNextStep } from "@/modules/evaluation/render-direct-evaluation-next-step";
import { renderDirectEvaluationAdvisoryNotes } from "@/modules/evaluation/render-direct-evaluation-advisory-notes";
import type { MembershipRole } from "@/types/enums";
import type { QualificationAnswerPayload } from "@/types/qualification-answer-payload";
import type { RunSimpleFormDirectEvaluationResult } from "@/types/direct-evaluation-orchestration";

/**
 * Run the simple-form direct evaluation runtime end-to-end in memory.
 *
 * Composes preparation → rule resolution → execution → assembly → rendering.
 * Throws on any failure at any step.
 * Does not persist results.
 */
export async function runSimpleFormDirectEvaluation(params: {
  offeringId: string;
  qualificationTypeKey: string;
  answers: QualificationAnswerPayload;
  organizationId?: string | null;
  allowedRoles?: readonly MembershipRole[];
}): Promise<RunSimpleFormDirectEvaluationResult> {
  // 1. Simple-form preparation
  const prepared = await prepareSimpleFormDirectEvaluation(params);

  // 2. Rule context resolution from prepared input
  const resolvedContext = await resolveDirectEvaluationRuleContextFromPrepared(prepared);

  // 3. Execution
  const execution = executeDirectEvaluationRuleContext({
    prepared,
    resolvedContext,
  });

  // 4. Result assembly
  const assembled = assembleDirectEvaluationResult({ execution });

  // 5. Explanation rendering
  const primaryReason = renderDirectEvaluationPrimaryReason({ assembled });
  const nextStep = renderDirectEvaluationNextStep({ assembled });
  const advisoryNotes = renderDirectEvaluationAdvisoryNotes({ assembled });

  return {
    prepared,
    resolvedContext,
    execution,
    assembled,
    primaryReasonAr: primaryReason.primaryReasonAr,
    nextStepAr: nextStep.nextStepAr,
    advisoryNotesAr: advisoryNotes.advisoryNotesAr,
  };
}
