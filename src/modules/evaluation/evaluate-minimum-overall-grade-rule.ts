/**
 * Pure evaluator for the minimum_overall_grade rule type.
 *
 * Checks whether a simple-form normalized profile's overall grade field
 * meets a configured minimum threshold. Uses existing normalized numeric
 * values from the simple-form profile directly — no new normalization,
 * no grade-scale conversion, no transcript reconstruction.
 *
 * Supports all three simple-form families:
 * - arabic_secondary → finalAverage
 * - american_high_school → gpa
 * - international_baccalaureate → totalPoints
 *
 * The config specifies which profileField to read and the minimumValue.
 *
 * Not applicable for British input — British profiles use subject-based
 * evaluators instead.
 *
 * Pure sync function — no DB access.
 */

import type { PreparedSimpleFormDirectEvaluation } from "@/types/prepared-simple-form-direct-evaluation";
import type { MinimumOverallGradeRuleExecutionResult } from "@/types/direct-evaluation-execution";
import type {
  NormalizedArabicSecondaryProfile,
  NormalizedAmericanHighSchoolProfile,
  NormalizedIBProfile,
} from "@/types/normalized-qualification-profile";

/** Expected config shape for minimum_overall_grade rules. */
interface MinimumOverallGradeConfig {
  profileField: string;
  minimumValue: number;
}

/** Allowed profile field names and their family constraints. */
const ALLOWED_PROFILE_FIELDS: ReadonlyMap<string, string[]> = new Map([
  ["finalAverage", ["arabic_secondary"]],
  ["gpa", ["american_high_school"]],
  ["totalPoints", ["international_baccalaureate"]],
]);

/**
 * Validate and extract the minimum_overall_grade config.
 */
function parseConfig(ruleId: string, ruleConfig: unknown): MinimumOverallGradeConfig {
  if (!ruleConfig || typeof ruleConfig !== "object") {
    throw new Error(
      `Rule ${ruleId}: minimum_overall_grade config must be a non-null object`
    );
  }

  const cfg = ruleConfig as Record<string, unknown>;

  if (typeof cfg.profileField !== "string" || cfg.profileField.trim() === "") {
    throw new Error(
      `Rule ${ruleId}: minimum_overall_grade config requires a non-empty profileField string`
    );
  }

  if (!ALLOWED_PROFILE_FIELDS.has(cfg.profileField)) {
    throw new Error(
      `Rule ${ruleId}: minimum_overall_grade config profileField "${cfg.profileField}" is not a recognized profile field. ` +
      `Allowed: ${[...ALLOWED_PROFILE_FIELDS.keys()].join(", ")}`
    );
  }

  if (typeof cfg.minimumValue !== "number" || !Number.isFinite(cfg.minimumValue)) {
    throw new Error(
      `Rule ${ruleId}: minimum_overall_grade config requires a finite numeric minimumValue`
    );
  }

  return {
    profileField: cfg.profileField,
    minimumValue: cfg.minimumValue,
  };
}

/**
 * Extract the numeric value for the configured profile field from a
 * normalized simple-form profile. Returns null if the profile family
 * does not match the field's expected family.
 */
function extractProfileValue(
  profile: PreparedSimpleFormDirectEvaluation["normalizedProfile"],
  profileField: string,
): number | null {
  switch (profileField) {
    case "finalAverage":
      if (profile.qualificationFamily === "arabic_secondary") {
        return (profile as NormalizedArabicSecondaryProfile).finalAverage;
      }
      return null;
    case "gpa":
      if (profile.qualificationFamily === "american_high_school") {
        return (profile as NormalizedAmericanHighSchoolProfile).gpa;
      }
      return null;
    case "totalPoints":
      if (profile.qualificationFamily === "international_baccalaureate") {
        return (profile as NormalizedIBProfile).totalPoints;
      }
      return null;
    default:
      return null;
  }
}

/**
 * Evaluate a single minimum_overall_grade rule against a prepared simple-form input.
 */
export function evaluateMinimumOverallGradeRule(params: {
  prepared: PreparedSimpleFormDirectEvaluation;
  ruleId: string;
  ruleTypeKey: string;
  ruleConfig: unknown;
}): MinimumOverallGradeRuleExecutionResult {
  if (params.ruleTypeKey !== "minimum_overall_grade") {
    throw new Error(
      `evaluateMinimumOverallGradeRule called with unsupported ruleTypeKey "${params.ruleTypeKey}"`
    );
  }

  const config = parseConfig(params.ruleId, params.ruleConfig);

  const actualValue = extractProfileValue(
    params.prepared.normalizedProfile,
    config.profileField,
  );

  // Profile family doesn't match the configured field → skipped
  if (actualValue === null) {
    return {
      outcome: "skipped",
      actualValue: null,
      requiredMinimumValue: config.minimumValue,
    };
  }

  const passed = actualValue >= config.minimumValue;

  return {
    outcome: passed ? "passed" : "failed",
    actualValue,
    requiredMinimumValue: config.minimumValue,
  };
}
