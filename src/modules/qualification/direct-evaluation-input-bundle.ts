/**
 * Server-side validated Direct Evaluation input bundle assembly.
 *
 * Composes:
 * - effective target offering context
 * - active qualification definition
 * - raw qualification profile validation
 *
 * Does not evaluate, normalize, persist, or generate results.
 *
 * Server-side only — do not import from client components.
 */

import {
  getEffectiveTargetOfferingContext,
  requireEffectiveTargetOfferingContext,
} from "@/modules/catalog/effective-target-offering-context";
import {
  getActiveQualificationDefinition,
  requireActiveQualificationDefinition,
} from "@/modules/qualification/active-qualification-definition";
import { validateRawQualificationProfile } from "@/modules/qualification/direct-evaluation-raw-profile";
import type { MembershipRole } from "@/types/enums";
import type { DirectEvaluationInputBundle } from "@/types/direct-evaluation-input-bundle";

interface BundleParams {
  offeringId: string;
  qualificationTypeKey: string;
  rawProfile: unknown;
  organizationId?: string | null;
  allowedRoles?: readonly MembershipRole[];
}

/**
 * Get the validated Direct Evaluation input bundle.
 * Returns null when workspace access is missing, offering is unreachable,
 * or qualification definition is not found.
 * Throws on invalid raw profile, integrity failures, or family mismatch.
 */
export async function getDirectEvaluationInputBundle(
  params: BundleParams
): Promise<DirectEvaluationInputBundle | null> {
  const accessParams = {
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  };

  // Resolve target and qualification definition in parallel
  const [target, qualDef] = await Promise.all([
    getEffectiveTargetOfferingContext({
      offeringId: params.offeringId,
      ...accessParams,
    }),
    getActiveQualificationDefinition({
      qualificationTypeKey: params.qualificationTypeKey,
      ...accessParams,
    }),
  ]);

  if (!target || !qualDef) {
    return null;
  }

  // Validate raw profile shape — throws on invalid input
  const rawProfile = validateRawQualificationProfile(params.rawProfile);

  // Compatibility check: raw profile family must match definition family
  if (rawProfile.qualificationFamily !== qualDef.family.key) {
    throw new Error(
      `Qualification family mismatch: raw profile family "${rawProfile.qualificationFamily}" does not match definition family "${qualDef.family.key}"`
    );
  }

  return {
    workspace: target.workspace,
    target,
    qualificationDefinition: qualDef,
    rawProfile,
  };
}

/**
 * Require the validated Direct Evaluation input bundle, or throw.
 */
export async function requireDirectEvaluationInputBundle(
  params: BundleParams
): Promise<DirectEvaluationInputBundle> {
  const accessParams = {
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  };

  // Resolve target and qualification definition in parallel — both throw on missing
  const [target, qualDef] = await Promise.all([
    requireEffectiveTargetOfferingContext({
      offeringId: params.offeringId,
      ...accessParams,
    }),
    requireActiveQualificationDefinition({
      qualificationTypeKey: params.qualificationTypeKey,
      ...accessParams,
    }),
  ]);

  // Validate raw profile shape — throws on invalid input
  const rawProfile = validateRawQualificationProfile(params.rawProfile);

  // Compatibility check: raw profile family must match definition family
  if (rawProfile.qualificationFamily !== qualDef.family.key) {
    throw new Error(
      `Qualification family mismatch: raw profile family "${rawProfile.qualificationFamily}" does not match definition family "${qualDef.family.key}"`
    );
  }

  return {
    workspace: target.workspace,
    target,
    qualificationDefinition: qualDef,
    rawProfile,
  };
}
