/**
 * Dedicated trace-level Arabic explanation renderer for direct evaluation.
 *
 * Produces authoritative `explanationAr` text for one rule trace entry.
 * Consumes already-produced execution trace data only.
 * Does not re-execute rules, re-assemble results, or write persistence rows.
 *
 * Supports:
 * - minimum_subject_count (passed, failed, skipped)
 * - required_subject_exists (passed, failed, skipped)
 *
 * Server-side only — do not import from client components.
 */

import type {
  RenderDirectEvaluationRuleTraceExplanationInput,
  RenderDirectEvaluationRuleTraceExplanationResult,
} from "@/types/direct-evaluation-trace-explanation";

/**
 * Render an authoritative Arabic explanation for one rule trace.
 *
 * Throws on unsupported rule types or missing required data.
 */
export function renderDirectEvaluationRuleTraceExplanation(
  input: RenderDirectEvaluationRuleTraceExplanationInput
): RenderDirectEvaluationRuleTraceExplanationResult {
  switch (input.ruleTypeKey) {
    case "minimum_subject_count":
      return renderMinimumSubjectCount(input);
    case "required_subject_exists":
      return renderRequiredSubjectExists(input);
    default:
      throw new Error(
        `Unsupported rule type for trace explanation: "${input.ruleTypeKey}". ` +
        `Only "minimum_subject_count" and "required_subject_exists" are supported in the current baseline.`
      );
  }
}

// ---------------------------------------------------------------------------
// minimum_subject_count
// ---------------------------------------------------------------------------

function renderMinimumSubjectCount(
  input: RenderDirectEvaluationRuleTraceExplanationInput
): RenderDirectEvaluationRuleTraceExplanationResult {
  if (input.outcome === "skipped") {
    return {
      explanationAr: "تم تخطي قاعدة الحد الأدنى لعدد المواد — لم تُنفَّذ في النسخة الحالية.",
    };
  }

  if (input.matchedCount === undefined || input.requiredCount === undefined) {
    throw new Error(
      `minimum_subject_count trace with outcome "${input.outcome}" requires matchedCount and requiredCount.`
    );
  }

  const matched = input.matchedCount;
  const required = input.requiredCount;

  if (input.outcome === "passed") {
    return {
      explanationAr: `عدد المواد المطابقة (${matched}) يحقق الحد الأدنى المطلوب (${required}).`,
    };
  }

  if (input.outcome === "failed") {
    return {
      explanationAr: `عدد المواد المطابقة (${matched}) لا يحقق الحد الأدنى المطلوب (${required}).`,
    };
  }

  throw new Error(
    `Unsupported outcome "${input.outcome}" for minimum_subject_count trace explanation.`
  );
}

// ---------------------------------------------------------------------------
// required_subject_exists
// ---------------------------------------------------------------------------

function renderRequiredSubjectExists(
  input: RenderDirectEvaluationRuleTraceExplanationInput
): RenderDirectEvaluationRuleTraceExplanationResult {
  if (input.outcome === "skipped") {
    return {
      explanationAr: "تم تخطي قاعدة وجود المادة المطلوبة — لم تُنفَّذ في النسخة الحالية.",
    };
  }

  if (input.outcome === "passed") {
    const subjectPart = input.matchedSubjectName
      ? ` (${input.matchedSubjectName})`
      : "";
    return {
      explanationAr: `تم العثور على المادة المطلوبة${subjectPart}.`,
    };
  }

  if (input.outcome === "failed") {
    const namesList = input.requiredSubjectNames && input.requiredSubjectNames.length > 0
      ? `: ${input.requiredSubjectNames.join("، ")}`
      : "";
    return {
      explanationAr: `لم يتم العثور على المادة المطلوبة${namesList}.`,
    };
  }

  throw new Error(
    `Unsupported outcome "${input.outcome}" for required_subject_exists trace explanation.`
  );
}
