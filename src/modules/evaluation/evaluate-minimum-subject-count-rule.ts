/**
 * Pure evaluator for the minimum_subject_count rule type.
 *
 * Executes one minimum_subject_count rule against a prepared British
 * direct-evaluation input. Returns a detailed execution result with
 * matched count, required count, and matched subjects.
 *
 * Does not calculate final eligibility. Does not persist anything.
 * Pure sync function — no DB access.
 */

import { countBritishSubjects } from "@/modules/qualification/count-british-subjects";
import type { PreparedBritishDirectEvaluation } from "@/types/prepared-british-direct-evaluation";
import type { BritishSubjectSegmentKey } from "@/types/normalized-british-profile";
import type { MinimumSubjectCountRuleExecutionResult } from "@/types/direct-evaluation-execution";

/** Expected config shape for minimum_subject_count rules. */
interface MinimumSubjectCountConfig {
  minimumCount: number;
  segmentKeys?: readonly Exclude<BritishSubjectSegmentKey, "other">[];
  subjectLevelKeys?: readonly string[];
  minimumNormalizedGradeValue?: number;
}

/**
 * Validate and extract the minimum_subject_count config from an unknown payload.
 */
function parseConfig(ruleId: string, ruleConfig: unknown): MinimumSubjectCountConfig {
  if (!ruleConfig || typeof ruleConfig !== "object") {
    throw new Error(
      `Rule ${ruleId}: minimum_subject_count config must be a non-null object`
    );
  }

  const cfg = ruleConfig as Record<string, unknown>;

  if (typeof cfg.minimumCount !== "number" || cfg.minimumCount < 0) {
    throw new Error(
      `Rule ${ruleId}: minimum_subject_count config requires a non-negative numeric minimumCount`
    );
  }

  return {
    minimumCount: cfg.minimumCount,
    segmentKeys: cfg.segmentKeys as MinimumSubjectCountConfig["segmentKeys"],
    subjectLevelKeys: cfg.subjectLevelKeys as MinimumSubjectCountConfig["subjectLevelKeys"],
    minimumNormalizedGradeValue:
      typeof cfg.minimumNormalizedGradeValue === "number"
        ? cfg.minimumNormalizedGradeValue
        : undefined,
  };
}

/**
 * Evaluate a single minimum_subject_count rule against a prepared British input.
 */
export function evaluateMinimumSubjectCountRule(params: {
  prepared: PreparedBritishDirectEvaluation;
  ruleId: string;
  ruleTypeKey: string;
  ruleConfig: unknown;
}): MinimumSubjectCountRuleExecutionResult {
  if (params.ruleTypeKey !== "minimum_subject_count") {
    throw new Error(
      `evaluateMinimumSubjectCountRule called with unsupported ruleTypeKey "${params.ruleTypeKey}"`
    );
  }

  const config = parseConfig(params.ruleId, params.ruleConfig);

  const countResult = countBritishSubjects({
    profile: params.prepared.normalizedProfile,
    segmentKeys: config.segmentKeys,
    subjectLevelKeys: config.subjectLevelKeys,
    minimumNormalizedGradeValue: config.minimumNormalizedGradeValue,
  });

  return {
    outcome: countResult.count >= config.minimumCount ? "passed" : "failed",
    matchedCount: countResult.count,
    requiredCount: config.minimumCount,
    matchedSubjects: countResult.matchedSubjects,
  };
}
