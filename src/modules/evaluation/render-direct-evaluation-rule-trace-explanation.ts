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
 * - minimum_subject_grade (passed, failed, skipped)
 * - minimum_overall_grade (passed, failed, skipped)
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
    case "minimum_subject_grade":
      return renderMinimumSubjectGrade(input);
    case "minimum_overall_grade":
      return renderMinimumOverallGrade(input);
    default:
      throw new Error(
        `Unsupported rule type for trace explanation: "${input.ruleTypeKey}". ` +
        `Only "minimum_subject_count", "required_subject_exists", "minimum_subject_grade", and "minimum_overall_grade" are supported in the current baseline.`
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

// ---------------------------------------------------------------------------
// minimum_subject_grade
// ---------------------------------------------------------------------------

function renderMinimumSubjectGrade(
  input: RenderDirectEvaluationRuleTraceExplanationInput
): RenderDirectEvaluationRuleTraceExplanationResult {
  if (input.outcome === "skipped") {
    return {
      explanationAr: "تم تخطي قاعدة الحد الأدنى لدرجة المادة — لم تُنفَّذ في النسخة الحالية.",
    };
  }

  if (input.outcome === "passed") {
    const subjectPart = input.matchedSubjectName
      ? ` (${input.matchedSubjectName})`
      : "";
    const gradePart =
      input.matchedGradeValue !== undefined && input.matchedGradeValue !== null &&
      input.requiredMinimumGradeValue !== undefined
        ? ` — الدرجة ${input.matchedGradeValue} تحقق الحد الأدنى المطلوب (${input.requiredMinimumGradeValue})`
        : "";
    return {
      explanationAr: `المادة المطابقة${subjectPart} تحقق شرط الحد الأدنى للدرجة${gradePart}.`,
    };
  }

  if (input.outcome === "failed") {
    // Two failure shapes:
    // 1. Subject matched but grade below threshold
    if (input.matchedSubjectName) {
      const gradePart =
        input.matchedGradeValue !== undefined && input.matchedGradeValue !== null &&
        input.requiredMinimumGradeValue !== undefined
          ? ` — الدرجة ${input.matchedGradeValue} أقل من الحد الأدنى المطلوب (${input.requiredMinimumGradeValue})`
          : "";
      return {
        explanationAr: `المادة المطابقة (${input.matchedSubjectName}) لا تحقق شرط الحد الأدنى للدرجة${gradePart}.`,
      };
    }
    // 2. No matching subject found at all
    return {
      explanationAr: "لم يتم العثور على المادة المطلوبة لتقييم الحد الأدنى للدرجة.",
    };
  }

  throw new Error(
    `Unsupported outcome "${input.outcome}" for minimum_subject_grade trace explanation.`
  );
}

// ---------------------------------------------------------------------------
// minimum_overall_grade
// ---------------------------------------------------------------------------

function renderMinimumOverallGrade(
  input: RenderDirectEvaluationRuleTraceExplanationInput
): RenderDirectEvaluationRuleTraceExplanationResult {
  if (input.outcome === "skipped") {
    return {
      explanationAr: "تم تخطي قاعدة الحد الأدنى للمعدل العام — لم تُنفَّذ في النسخة الحالية.",
    };
  }

  const valuePart =
    input.actualValue !== undefined && input.actualValue !== null &&
    input.requiredMinimumValue !== undefined
      ? ` — القيمة ${input.actualValue} والحد الأدنى المطلوب (${input.requiredMinimumValue})`
      : "";

  if (input.outcome === "passed") {
    return {
      explanationAr: `المعدل العام يحقق شرط الحد الأدنى${valuePart}.`,
    };
  }

  if (input.outcome === "failed") {
    return {
      explanationAr: `المعدل العام لا يحقق شرط الحد الأدنى${valuePart}.`,
    };
  }

  throw new Error(
    `Unsupported outcome "${input.outcome}" for minimum_overall_grade trace explanation.`
  );
}
