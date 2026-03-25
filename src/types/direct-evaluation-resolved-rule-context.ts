/**
 * Resolved Direct Evaluation rule context with loaded rule groups and rules.
 *
 * Extends the base rule context with execution-ready ordered published
 * rule groups and their ordered active rules.
 *
 * No evaluator result types. No persistence types. No UI types.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { EffectiveTargetOfferingContext } from "./catalog-target-context";
import type { ActiveQualificationDefinitionRead } from "./qualification-definition-read";
import type { RawQualificationProfile } from "./qualification-raw-profile";
import type { NormalizedQualificationProfile } from "./normalized-qualification-profile";
import type {
  DirectEvaluationRuleContextStatus,
  ResolvedDirectEvaluationRuleSet,
} from "./direct-evaluation-rule-context";

/** A single active rule within a published rule group. */
export interface ResolvedDirectEvaluationRule {
  ruleId: string;
  ruleTypeKey: string;
  ruleConfig: unknown;
  orderIndex: number;
}

/** A published rule group with its ordered active rules. */
export interface ResolvedDirectEvaluationRuleGroup {
  ruleGroupId: string;
  groupKey: string;
  groupSeverity: string;
  groupEvaluationMode: string;
  orderIndex: number;
  rules: readonly ResolvedDirectEvaluationRule[];
}

/** Full resolved Direct Evaluation rule context with loaded groups and rules. */
export interface ResolvedDirectEvaluationRuleContext {
  workspace: CurrentWorkspaceCapabilities;
  target: EffectiveTargetOfferingContext;
  qualificationDefinition: ActiveQualificationDefinitionRead;
  rawProfile: RawQualificationProfile;
  normalizedProfile: NormalizedQualificationProfile;
  status: DirectEvaluationRuleContextStatus;
  resolvedRuleSet: ResolvedDirectEvaluationRuleSet | null;
  ruleGroups: readonly ResolvedDirectEvaluationRuleGroup[];
}
