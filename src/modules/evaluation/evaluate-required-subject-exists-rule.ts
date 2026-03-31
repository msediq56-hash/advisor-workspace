/**
 * Pure evaluator for the required_subject_exists rule type.
 *
 * Checks whether at least one normalized British subject record matches
 * any of the configured required subject names. Uses exact normalized
 * string comparison only — no synonym expansion, no fuzzy matching,
 * no subject-family taxonomy.
 *
 * British-only. Does not calculate final eligibility. Does not persist.
 * Pure sync function — no DB access.
 */

import type { PreparedBritishDirectEvaluation } from "@/types/prepared-british-direct-evaluation";
import type { RequiredSubjectExistsRuleExecutionResult } from "@/types/direct-evaluation-execution";

/** Expected config shape for required_subject_exists rules. */
interface RequiredSubjectExistsConfig {
  subjectNamesNormalized: readonly string[];
}

/**
 * Validate and extract the required_subject_exists config from an unknown payload.
 */
function parseConfig(ruleId: string, ruleConfig: unknown): RequiredSubjectExistsConfig {
  if (!ruleConfig || typeof ruleConfig !== "object") {
    throw new Error(
      `Rule ${ruleId}: required_subject_exists config must be a non-null object`
    );
  }

  const cfg = ruleConfig as Record<string, unknown>;

  if (!Array.isArray(cfg.subjectNamesNormalized) || cfg.subjectNamesNormalized.length === 0) {
    throw new Error(
      `Rule ${ruleId}: required_subject_exists config requires a non-empty subjectNamesNormalized array`
    );
  }

  for (let i = 0; i < cfg.subjectNamesNormalized.length; i++) {
    if (typeof cfg.subjectNamesNormalized[i] !== "string") {
      throw new Error(
        `Rule ${ruleId}: required_subject_exists config subjectNamesNormalized[${i}] must be a string`
      );
    }
  }

  return {
    subjectNamesNormalized: cfg.subjectNamesNormalized as string[],
  };
}

/**
 * Normalize a subject name for comparison: trim, lowercase.
 */
function normalizeSubjectName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Evaluate a single required_subject_exists rule against a prepared British input.
 */
export function evaluateRequiredSubjectExistsRule(params: {
  prepared: PreparedBritishDirectEvaluation;
  ruleId: string;
  ruleTypeKey: string;
  ruleConfig: unknown;
}): RequiredSubjectExistsRuleExecutionResult {
  if (params.ruleTypeKey !== "required_subject_exists") {
    throw new Error(
      `evaluateRequiredSubjectExistsRule called with unsupported ruleTypeKey "${params.ruleTypeKey}"`
    );
  }

  const config = parseConfig(params.ruleId, params.ruleConfig);

  const normalizedConfigNames = new Set(
    config.subjectNamesNormalized.map(normalizeSubjectName)
  );

  const matchedSubjectName = params.prepared.normalizedProfile.subjects.find(
    (s) => normalizedConfigNames.has(normalizeSubjectName(s.subjectName))
  );

  return {
    outcome: matchedSubjectName ? "passed" : "failed",
    matchedSubjectName: matchedSubjectName?.subjectName ?? null,
    requiredSubjectNames: config.subjectNamesNormalized,
  };
}
