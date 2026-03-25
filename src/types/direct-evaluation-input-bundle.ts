/**
 * Validated input bundle type for Direct Evaluation.
 *
 * Assembles: target offering context + qualification definition + raw profile.
 * No normalized outputs. No evaluator results. No persistence types.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { EffectiveTargetOfferingContext } from "./catalog-target-context";
import type { ActiveQualificationDefinitionRead } from "./qualification-definition-read";
import type { RawQualificationProfile } from "./qualification-raw-profile";

/** Full validated input bundle for one Direct Evaluation run. */
export interface DirectEvaluationInputBundle {
  workspace: CurrentWorkspaceCapabilities;
  target: EffectiveTargetOfferingContext;
  qualificationDefinition: ActiveQualificationDefinitionRead;
  rawProfile: RawQualificationProfile;
}
