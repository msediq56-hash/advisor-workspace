/**
 * Prepared British direct evaluation input bundle type.
 *
 * Combines target offering context, qualification definition,
 * validated raw British profile, and normalized British profile
 * into a single evaluator-ready shape.
 *
 * No evaluator/result types. No persistence types.
 */

import type { CurrentWorkspaceCapabilities } from "@/types/workspace-capabilities";
import type { EffectiveTargetOfferingContext } from "@/types/catalog-target-context";
import type { ActiveQualificationDefinitionRead } from "@/types/qualification-definition-read";
import type { RawBritishCurriculumProfile } from "@/types/qualification-raw-profile";
import type { NormalizedBritishCurriculumProfile } from "@/types/normalized-british-profile";

/** Fully prepared British direct evaluation input. */
export interface PreparedBritishDirectEvaluation {
  workspace: CurrentWorkspaceCapabilities;
  target: EffectiveTargetOfferingContext;
  qualificationDefinition: ActiveQualificationDefinitionRead;
  rawProfile: RawBritishCurriculumProfile;
  normalizedProfile: NormalizedBritishCurriculumProfile;
}
