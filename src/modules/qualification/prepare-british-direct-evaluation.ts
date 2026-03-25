/**
 * Server-side end-to-end British direct evaluation preparation.
 *
 * Composes:
 * - effective target offering context resolver
 * - British subject-based raw profile assembler
 * - British subject normalization service
 *
 * Returns a fully prepared British direct evaluation input
 * without evaluating eligibility or resolving rules.
 *
 * Server-side only — do not import from client components.
 */

import { requireEffectiveTargetOfferingContext } from "@/modules/catalog/effective-target-offering-context";
import { assembleBritishSubjectBasedRawProfile } from "@/modules/qualification/assemble-british-subject-based-raw-profile";
import { normalizeBritishSubjectBasedRawProfile } from "@/modules/qualification/normalize-british-subject-based-profile";
import type { MembershipRole } from "@/types/enums";
import type { BritishSubjectBasedAnswerPayload } from "@/types/british-subject-answer-payload";
import type { EffectiveTargetOfferingContext } from "@/types/catalog-target-context";
import type { AssembledBritishRawProfile } from "@/types/british-subject-answer-payload";
import type { PreparedBritishDirectEvaluation } from "@/types/prepared-british-direct-evaluation";

/**
 * End-to-end British direct evaluation preparation.
 *
 * Resolves target context, assembles validated raw British profile from
 * subject-based payload, normalizes it, and returns the full prepared bundle.
 * Throws on any failure — this is a require-style preparation path.
 */
export async function prepareBritishDirectEvaluation(params: {
  offeringId: string;
  qualificationTypeKey: string;
  payload: BritishSubjectBasedAnswerPayload;
  organizationId?: string | null;
  allowedRoles?: readonly MembershipRole[];
}): Promise<PreparedBritishDirectEvaluation> {
  const { offeringId, qualificationTypeKey, payload, organizationId, allowedRoles } = params;

  // Resolve target offering context
  const target = await requireEffectiveTargetOfferingContext({
    offeringId,
    organizationId,
    allowedRoles,
  });

  // Assemble validated raw British profile
  const assembled = await assembleBritishSubjectBasedRawProfile({
    qualificationTypeKey,
    payload,
    organizationId,
    allowedRoles,
  });

  // Normalize through existing British normalization service
  const normalizedProfile = normalizeBritishSubjectBasedRawProfile(assembled.rawProfile);

  return {
    workspace: target.workspace,
    target,
    qualificationDefinition: assembled.qualificationDefinition,
    rawProfile: assembled.rawProfile,
    normalizedProfile,
  };
}

/**
 * Prepare a British direct evaluation from already-resolved components.
 *
 * Takes a pre-resolved target and assembled British raw profile,
 * normalizes the profile, and returns the full prepared bundle.
 * Pure composition — no DB access. Throws on normalization failure.
 */
export function prepareValidatedBritishDirectEvaluation(params: {
  target: EffectiveTargetOfferingContext;
  assembled: AssembledBritishRawProfile;
}): PreparedBritishDirectEvaluation {
  const { target, assembled } = params;

  const normalizedProfile = normalizeBritishSubjectBasedRawProfile(assembled.rawProfile);

  return {
    workspace: target.workspace,
    target,
    qualificationDefinition: assembled.qualificationDefinition,
    rawProfile: assembled.rawProfile,
    normalizedProfile,
  };
}
