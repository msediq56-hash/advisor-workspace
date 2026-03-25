/**
 * Server-side British direct evaluation in-memory orchestration baseline.
 *
 * Composes the already-implemented runtime slices in sequence:
 * 1. British preparation
 * 2. Rule context resolution (from prepared input)
 * 3. Execution
 * 4. Result assembly
 * 5. Explanation rendering (primary reason, next step, advisory notes)
 *
 * Returns one composed runtime result object. No persistence, no UI.
 *
 * Server-side only — do not import from client components.
 */

import { prepareBritishDirectEvaluation } from "@/modules/qualification/prepare-british-direct-evaluation";
import { resolveDirectEvaluationRuleContextFromPrepared } from "@/modules/evaluation/resolve-direct-evaluation-rule-context";
import { executeDirectEvaluationRuleContext } from "@/modules/evaluation/execute-direct-evaluation-rule-context";
import { assembleDirectEvaluationResult } from "@/modules/evaluation/assemble-direct-evaluation-result";
import { renderDirectEvaluationPrimaryReason } from "@/modules/evaluation/render-direct-evaluation-primary-reason";
import { renderDirectEvaluationNextStep } from "@/modules/evaluation/render-direct-evaluation-next-step";
import { renderDirectEvaluationAdvisoryNotes } from "@/modules/evaluation/render-direct-evaluation-advisory-notes";
import type { MembershipRole } from "@/types/enums";
import type { BritishSubjectBasedAnswerPayload } from "@/types/british-subject-answer-payload";
import type { RunBritishDirectEvaluationResult } from "@/types/direct-evaluation-orchestration";

/**
 * Run the British direct evaluation runtime end-to-end in memory.
 *
 * Composes preparation → rule resolution → execution → assembly → rendering.
 * Throws on any failure at any step.
 * Does not persist results.
 */
export async function runBritishDirectEvaluation(params: {
  offeringId: string;
  qualificationTypeKey: string;
  payload: BritishSubjectBasedAnswerPayload;
  organizationId?: string | null;
  allowedRoles?: readonly MembershipRole[];
}): Promise<RunBritishDirectEvaluationResult> {
  // 1. British preparation
  const prepared = await prepareBritishDirectEvaluation(params);

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
