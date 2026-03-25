/**
 * Prepared simple-form Direct Evaluation type.
 *
 * Assembles: target + definition + raw profile + normalized profile.
 * Ready for future evaluator consumption.
 *
 * No evaluator/result types. No persistence types. No UI-only types.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { EffectiveTargetOfferingContext } from "./catalog-target-context";
import type { ActiveQualificationDefinitionRead } from "./qualification-definition-read";
import type { RawQualificationProfile } from "./qualification-raw-profile";
import type { NormalizedQualificationProfile } from "./normalized-qualification-profile";

/** Fully prepared simple-form Direct Evaluation input — evaluator-ready. */
export interface PreparedSimpleFormDirectEvaluation {
  workspace: CurrentWorkspaceCapabilities;
  target: EffectiveTargetOfferingContext;
  qualificationDefinition: ActiveQualificationDefinitionRead;
  rawProfile: RawQualificationProfile;
  normalizedProfile: NormalizedQualificationProfile;
}
