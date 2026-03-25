/**
 * Server-side primary reason Arabic rendering baseline.
 *
 * Converts an already-assembled direct-evaluation result into an Arabic
 * primary reason string. Does not re-assemble status, execute rules,
 * render next steps, or persist anything.
 *
 * Server-side only — do not import from client components.
 */

import type { AssembledDirectEvaluationResult } from "@/types/direct-evaluation-result-assembly";
import type { RenderedDirectEvaluationPrimaryReason } from "@/types/direct-evaluation-explanation";

// ---------------------------------------------------------------------------
// Arabic primary-reason mapping
// ---------------------------------------------------------------------------

const PRIMARY_REASON_AR: ReadonlyMap<string, string> = new Map([
  [
    "no_rule_groups_executed",
    "لا توجد مجموعات قواعد منشورة مطابقة لهذا السياق، لذلك تحتاج الحالة إلى مراجعة.",
  ],
  [
    "blocking_group_failed",
    "الحالة غير مؤهلة لأن مجموعة شروط مانعة لم تتحقق.",
  ],
  [
    "review_group_failed",
    "الحالة تحتاج إلى مراجعة لأن مجموعة شروط مراجعة لم تتحقق.",
  ],
  [
    "conditional_group_failed",
    "الحالة مشروطة لأن بعض الشروط المشروطة لم تتحقق.",
  ],
  [
    "all_required_groups_satisfied",
    "الحالة مؤهلة لأن جميع مجموعات الشروط المطلوبة تحققت.",
  ],
]);

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

/**
 * Render the Arabic primary reason for an already-assembled direct evaluation result.
 * Pure sync function — no DB access.
 */
export function renderDirectEvaluationPrimaryReason(params: {
  assembled: AssembledDirectEvaluationResult;
}): RenderedDirectEvaluationPrimaryReason {
  const { finalStatus, primaryReasonKey } = params.assembled;

  const primaryReasonAr = PRIMARY_REASON_AR.get(primaryReasonKey);

  if (primaryReasonAr === undefined) {
    throw new Error(
      `Unknown primaryReasonKey "${primaryReasonKey}". ` +
      `Supported keys: ${[...PRIMARY_REASON_AR.keys()].join(", ")}`
    );
  }

  return {
    finalStatus,
    primaryReasonKey,
    primaryReasonAr,
  };
}
