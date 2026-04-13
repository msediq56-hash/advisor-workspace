/**
 * Pure evaluator for the minimum_subject_grade rule type.
 *
 * Checks whether a specific normalized British subject record meets a
 * configured minimum grade threshold using the existing normalizedGradeValue
 * on the subject record.
 *
 * Uses exact normalized subject-name matching only — no synonym expansion,
 * no fuzzy matching, no subject-family taxonomy, no best-grade selection,
 * no deduplication policy.
 *
 * British-only. Does not calculate final eligibility. Does not persist.
 * Pure sync function — no DB access.
 */

import type { PreparedBritishDirectEvaluation } from "@/types/prepared-british-direct-evaluation";
import type { MinimumSubjectGradeRuleExecutionResult } from "@/types/direct-evaluation-execution";

/** Expected config shape for minimum_subject_grade rules. */
interface MinimumSubjectGradeConfig {
  subjectNameNormalized: string;
  minimumGradeValue: number;
}

/**
 * Validate and extract the minimum_subject_grade config from an unknown payload.
 */
function parseConfig(ruleId: string, ruleConfig: unknown): MinimumSubjectGradeConfig {
  if (!ruleConfig || typeof ruleConfig !== "object") {
    throw new Error(
      `Rule ${ruleId}: minimum_subject_grade config must be a non-null object`
    );
  }

  const cfg = ruleConfig as Record<string, unknown>;

  if (typeof cfg.subjectNameNormalized !== "string" || cfg.subjectNameNormalized.trim() === "") {
    throw new Error(
      `Rule ${ruleId}: minimum_subject_grade config requires a non-empty subjectNameNormalized string`
    );
  }

  if (typeof cfg.minimumGradeValue !== "number" || !Number.isFinite(cfg.minimumGradeValue)) {
    throw new Error(
      `Rule ${ruleId}: minimum_subject_grade config requires a finite numeric minimumGradeValue`
    );
  }

  return {
    subjectNameNormalized: cfg.subjectNameNormalized,
    minimumGradeValue: cfg.minimumGradeValue,
  };
}

/**
 * Normalize a subject name for comparison: trim, lowercase.
 */
function normalizeSubjectName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Evaluate a single minimum_subject_grade rule against a prepared British input.
 */
export function evaluateMinimumSubjectGradeRule(params: {
  prepared: PreparedBritishDirectEvaluation;
  ruleId: string;
  ruleTypeKey: string;
  ruleConfig: unknown;
}): MinimumSubjectGradeRuleExecutionResult {
  if (params.ruleTypeKey !== "minimum_subject_grade") {
    throw new Error(
      `evaluateMinimumSubjectGradeRule called with unsupported ruleTypeKey "${params.ruleTypeKey}"`
    );
  }

  const config = parseConfig(params.ruleId, params.ruleConfig);

  const targetName = normalizeSubjectName(config.subjectNameNormalized);

  const matchedSubject = params.prepared.normalizedProfile.subjects.find(
    (s) => normalizeSubjectName(s.subjectName) === targetName
  );

  if (!matchedSubject) {
    return {
      outcome: "failed",
      matchedSubjectName: null,
      matchedGradeValue: null,
      requiredMinimumGradeValue: config.minimumGradeValue,
    };
  }

  const passed = matchedSubject.normalizedGradeValue >= config.minimumGradeValue;

  return {
    outcome: passed ? "passed" : "failed",
    matchedSubjectName: matchedSubject.subjectName,
    matchedGradeValue: matchedSubject.normalizedGradeValue,
    requiredMinimumGradeValue: config.minimumGradeValue,
  };
}
