/**
 * Types for resolved Direct Evaluation rule context.
 *
 * Distinguishes: published rules exist vs. no published rules.
 * Does not contain evaluator results, traces, or persistence types.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { EffectiveTargetOfferingContext } from "./catalog-target-context";
import type { ActiveQualificationDefinitionRead } from "./qualification-definition-read";
import type { RawQualificationProfile } from "./qualification-raw-profile";
import type { NormalizedQualificationProfile } from "./normalized-qualification-profile";

/** Whether a published rule context exists for the target + qualification. */
export type DirectEvaluationRuleContextStatus =
  | "supported"
  | "no_published_rules";

/** Resolved published rule set reference. */
export interface ResolvedDirectEvaluationRuleSet {
  ruleSetId: string;
  ruleSetVersionId: string;
  targetScope: string;
  qualificationTypeId: string;
}

/** Full resolved Direct Evaluation rule context. */
export interface DirectEvaluationRuleContext {
  workspace: CurrentWorkspaceCapabilities;
  target: EffectiveTargetOfferingContext;
  qualificationDefinition: ActiveQualificationDefinitionRead;
  rawProfile: RawQualificationProfile;
  normalizedProfile: NormalizedQualificationProfile;
  status: DirectEvaluationRuleContextStatus;
  resolvedRuleSet: ResolvedDirectEvaluationRuleSet | null;
}
