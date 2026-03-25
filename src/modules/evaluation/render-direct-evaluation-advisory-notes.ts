/**
 * Server-side advisory-notes Arabic rendering baseline.
 *
 * Converts an already-assembled direct-evaluation result into Arabic
 * advisory notes based on group-level outcomes only. Does not re-assemble
 * status, execute rules, or persist anything.
 *
 * Server-side only — do not import from client components.
 */

import type { AssembledDirectEvaluationResult } from "@/types/direct-evaluation-result-assembly";
import type { RenderedDirectEvaluationAdvisoryNotes } from "@/types/direct-evaluation-advisory-notes";

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

/**
 * Render Arabic advisory notes for an already-assembled direct evaluation result.
 * Pure sync function — no DB access.
 */
export function renderDirectEvaluationAdvisoryNotes(params: {
  assembled: AssembledDirectEvaluationResult;
}): RenderedDirectEvaluationAdvisoryNotes {
  const { finalStatus, primaryReasonKey, groupExecutions } = params.assembled;

  const advisoryNotesAr: string[] = [];

  const hasAdvisoryFailed = groupExecutions.some(
    (g) => g.groupSeverity === "advisory" && g.groupOutcome === "failed"
  );

  const hasSkipped = groupExecutions.some(
    (g) => g.groupOutcome === "skipped"
  );

  if (hasAdvisoryFailed) {
    advisoryNotesAr.push(
      "توجد ملاحظات استشارية غير متحققة ينبغي أخذها بعين الاعتبار أثناء المراجعة."
    );
  }

  if (hasSkipped) {
    advisoryNotesAr.push(
      "بعض مجموعات القواعد لم تُنفذ في هذه النسخة ويجب أخذ ذلك في الاعتبار عند مراجعة النتيجة."
    );
  }

  return {
    finalStatus,
    primaryReasonKey,
    advisoryNotesAr,
  };
}
