/**
 * Server-side next-step Arabic rendering baseline.
 *
 * Converts an already-assembled direct-evaluation result into an Arabic
 * next-step string. Does not re-assemble status, execute rules, render
 * advisory notes, or persist anything.
 *
 * Server-side only — do not import from client components.
 */

import type { AssembledDirectEvaluationResult } from "@/types/direct-evaluation-result-assembly";
import type { RenderedDirectEvaluationNextStep } from "@/types/direct-evaluation-next-step";

// ---------------------------------------------------------------------------
// Arabic next-step mapping
// ---------------------------------------------------------------------------

const NEXT_STEP_AR: ReadonlyMap<string, string> = new Map([
  [
    "no_rule_groups_executed",
    "يجب تحويل الحالة إلى مراجعة داخلية للتأكد من إعداد القواعد المنشورة قبل إصدار قرار نهائي.",
  ],
  [
    "blocking_group_failed",
    "يجب إيقاف المتابعة على أنها مؤهلة ومراجعة الشروط المانعة غير المتحققة.",
  ],
  [
    "review_group_failed",
    "يجب تحويل الحالة إلى مراجعة بشرية قبل اعتماد القرار النهائي.",
  ],
  [
    "conditional_group_failed",
    "يجب متابعة الحالة على أنها مشروطة وطلب استكمال الشروط غير المتحققة.",
  ],
  [
    "all_required_groups_satisfied",
    "يمكن متابعة الحالة على أنها مؤهلة ضمن الشروط الحالية.",
  ],
]);

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

/**
 * Render the Arabic next step for an already-assembled direct evaluation result.
 * Pure sync function — no DB access.
 */
export function renderDirectEvaluationNextStep(params: {
  assembled: AssembledDirectEvaluationResult;
}): RenderedDirectEvaluationNextStep {
  const { finalStatus, primaryReasonKey } = params.assembled;

  const nextStepAr = NEXT_STEP_AR.get(primaryReasonKey);

  if (nextStepAr === undefined) {
    throw new Error(
      `Unknown primaryReasonKey "${primaryReasonKey}". ` +
      `Supported keys: ${[...NEXT_STEP_AR.keys()].join(", ")}`
    );
  }

  return {
    finalStatus,
    primaryReasonKey,
    nextStepAr,
  };
}
