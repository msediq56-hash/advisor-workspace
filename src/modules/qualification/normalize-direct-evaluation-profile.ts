/**
 * Server-side normalization baseline for Direct Evaluation.
 *
 * Normalizes supported non-British qualification families into stable
 * typed structures. British curriculum normalization is explicitly
 * unsupported in this baseline and belongs to a later specialized phase.
 *
 * Does not evaluate, persist, or generate results.
 *
 * Server-side only — do not import from client components.
 */

import { requireDirectEvaluationInputBundle } from "@/modules/qualification/direct-evaluation-input-bundle";
import type { MembershipRole } from "@/types/enums";
import type { DirectEvaluationInputBundle } from "@/types/direct-evaluation-input-bundle";
import type { NormalizedDirectEvaluationInput, NormalizedQualificationProfile } from "@/types/normalized-qualification-profile";

// ---------------------------------------------------------------------------
// Internal: normalize a validated raw profile
// ---------------------------------------------------------------------------

function normalizeProfile(bundle: DirectEvaluationInputBundle): NormalizedQualificationProfile {
  const raw = bundle.rawProfile;

  switch (raw.qualificationFamily) {
    case "arabic_secondary":
      return {
        qualificationFamily: "arabic_secondary",
        countryId: raw.countryId,
        certificateName: raw.certificateName,
        finalAverage: raw.finalAverage,
        gradingScale: raw.gradingScale,
        graduationYear: raw.graduationYear,
        notesAr: raw.notesAr,
      };

    case "american_high_school":
      return {
        qualificationFamily: "american_high_school",
        countryId: raw.countryId,
        gpa: raw.gpa,
        gpaScale: raw.gpaScale,
        graduationYear: raw.graduationYear,
        satTotal: raw.satTotal,
        notesAr: raw.notesAr,
      };

    case "international_baccalaureate":
      return {
        qualificationFamily: "international_baccalaureate",
        countryId: raw.countryId,
        diplomaType: raw.diplomaType,
        totalPoints: raw.totalPoints,
        graduationYear: raw.graduationYear,
        notesAr: raw.notesAr,
      };

    case "british_curriculum":
      throw new Error(
        "British curriculum specialized normalization is not implemented in this baseline. " +
        "It requires subject-based normalization which belongs to a later specialized phase."
      );
  }
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Normalize a validated Direct Evaluation input bundle.
 * Throws if the bundle contains a British curriculum profile.
 */
export function normalizeValidatedDirectEvaluationBundle(
  bundle: DirectEvaluationInputBundle
): NormalizedDirectEvaluationInput {
  const normalizedProfile = normalizeProfile(bundle);

  return {
    workspace: bundle.workspace,
    target: bundle.target,
    qualificationDefinition: bundle.qualificationDefinition,
    normalizedProfile,
  };
}

/**
 * Full pipeline: resolve input bundle then normalize.
 * Throws on missing access, unreachable offering, missing definition,
 * invalid raw profile, family mismatch, or unsupported normalization family.
 */
export async function normalizeDirectEvaluationInput(
  params: {
    offeringId: string;
    qualificationTypeKey: string;
    rawProfile: unknown;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<NormalizedDirectEvaluationInput> {
  const bundle = await requireDirectEvaluationInputBundle(params);
  return normalizeValidatedDirectEvaluationBundle(bundle);
}
