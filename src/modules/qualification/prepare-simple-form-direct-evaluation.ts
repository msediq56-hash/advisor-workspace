/**
 * Server-side end-to-end simple-form Direct Evaluation preparation.
 *
 * Composes:
 * - effective target offering context
 * - simple-form answer assembly
 * - normalization baseline
 *
 * Returns an evaluator-ready prepared package without evaluating.
 * Subject-based (British) preparation is explicitly unsupported.
 *
 * Server-side only — do not import from client components.
 */

import { requireEffectiveTargetOfferingContext } from "@/modules/catalog/effective-target-offering-context";
import { assembleSimpleFormRawProfile } from "@/modules/qualification/assemble-simple-form-raw-profile";
import { normalizeValidatedDirectEvaluationBundle } from "@/modules/qualification/normalize-direct-evaluation-profile";
import type { MembershipRole } from "@/types/enums";
import type { EffectiveTargetOfferingContext } from "@/types/catalog-target-context";
import type { AssembledSimpleFormRawProfile } from "@/types/qualification-answer-payload";
import type { QualificationAnswerPayload } from "@/types/qualification-answer-payload";
import type { PreparedSimpleFormDirectEvaluation } from "@/types/prepared-simple-form-direct-evaluation";

/**
 * Prepare a validated simple-form Direct Evaluation from already-resolved
 * target context and assembled raw profile. Pure/sync — no DB access.
 */
export function prepareValidatedSimpleFormDirectEvaluation(
  params: {
    target: EffectiveTargetOfferingContext;
    assembled: AssembledSimpleFormRawProfile;
  }
): PreparedSimpleFormDirectEvaluation {
  const { target, assembled } = params;

  // Build the bundle shape needed by the normalization service
  const bundle = {
    workspace: target.workspace,
    target,
    qualificationDefinition: assembled.qualificationDefinition,
    rawProfile: assembled.rawProfile,
  };

  const normalized = normalizeValidatedDirectEvaluationBundle(bundle);

  return {
    workspace: target.workspace,
    target,
    qualificationDefinition: assembled.qualificationDefinition,
    rawProfile: assembled.rawProfile,
    normalizedProfile: normalized.normalizedProfile,
  };
}

/**
 * Full pipeline: resolve target, assemble raw profile from answers, normalize.
 * Throws on missing access, unreachable offering, unsupported family/complexity,
 * invalid answers, raw profile validation failure, or normalization failure.
 */
export async function prepareSimpleFormDirectEvaluation(
  params: {
    offeringId: string;
    qualificationTypeKey: string;
    answers: QualificationAnswerPayload;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<PreparedSimpleFormDirectEvaluation> {
  const accessParams = {
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  };

  // Resolve target and assemble raw profile in parallel
  const [target, assembled] = await Promise.all([
    requireEffectiveTargetOfferingContext({
      offeringId: params.offeringId,
      ...accessParams,
    }),
    assembleSimpleFormRawProfile({
      qualificationTypeKey: params.qualificationTypeKey,
      answers: params.answers,
      ...accessParams,
    }),
  ]);

  return prepareValidatedSimpleFormDirectEvaluation({ target, assembled });
}
