/**
 * Pure evaluator for the accepted_qualification_type rule type.
 *
 * Checks whether the student's current qualification type key is among
 * the configured accepted qualification type keys. Uses exact string
 * matching only — no aliases, no equivalence classes, no family inference.
 *
 * Works for both British and simple-form prepared input since both expose
 * qualificationDefinition.qualificationType.key uniformly.
 *
 * Pure sync function — no DB access.
 */

import type { ActiveQualificationDefinitionRead } from "@/types/qualification-definition-read";
import type { AcceptedQualificationTypeRuleExecutionResult } from "@/types/direct-evaluation-execution";

/** Expected config shape for accepted_qualification_type rules. */
interface AcceptedQualificationTypeConfig {
  acceptedQualificationTypeKeys: readonly string[];
}

/**
 * Validate and extract the accepted_qualification_type config.
 */
function parseConfig(ruleId: string, ruleConfig: unknown): AcceptedQualificationTypeConfig {
  if (!ruleConfig || typeof ruleConfig !== "object") {
    throw new Error(
      `Rule ${ruleId}: accepted_qualification_type config must be a non-null object`
    );
  }

  const cfg = ruleConfig as Record<string, unknown>;

  if (
    !Array.isArray(cfg.acceptedQualificationTypeKeys) ||
    cfg.acceptedQualificationTypeKeys.length === 0
  ) {
    throw new Error(
      `Rule ${ruleId}: accepted_qualification_type config requires a non-empty acceptedQualificationTypeKeys array`
    );
  }

  for (let i = 0; i < cfg.acceptedQualificationTypeKeys.length; i++) {
    if (typeof cfg.acceptedQualificationTypeKeys[i] !== "string") {
      throw new Error(
        `Rule ${ruleId}: accepted_qualification_type config acceptedQualificationTypeKeys[${i}] must be a string`
      );
    }
  }

  return {
    acceptedQualificationTypeKeys: cfg.acceptedQualificationTypeKeys as string[],
  };
}

/**
 * Evaluate a single accepted_qualification_type rule.
 *
 * Reads the qualification type key from the prepared input's
 * qualificationDefinition and checks it against the configured
 * accepted keys using exact string matching.
 */
export function evaluateAcceptedQualificationTypeRule(params: {
  qualificationDefinition: ActiveQualificationDefinitionRead;
  ruleId: string;
  ruleTypeKey: string;
  ruleConfig: unknown;
}): AcceptedQualificationTypeRuleExecutionResult {
  if (params.ruleTypeKey !== "accepted_qualification_type") {
    throw new Error(
      `evaluateAcceptedQualificationTypeRule called with unsupported ruleTypeKey "${params.ruleTypeKey}"`
    );
  }

  const config = parseConfig(params.ruleId, params.ruleConfig);
  const actualKey = params.qualificationDefinition.qualificationType.key;

  const accepted = config.acceptedQualificationTypeKeys.includes(actualKey);

  return {
    outcome: accepted ? "passed" : "failed",
    actualQualificationTypeKey: actualKey,
    acceptedQualificationTypeKeys: config.acceptedQualificationTypeKeys,
  };
}
