/**
 * Direct evaluation explanation rendering types.
 *
 * Primary reason Arabic baseline only.
 * No next-step fields. No advisory-note fields. No persistence types.
 */

import type { DirectEvaluationFinalStatus } from "./direct-evaluation-result-assembly";

/** Rendered primary reason for a direct evaluation result. */
export interface RenderedDirectEvaluationPrimaryReason {
  finalStatus: DirectEvaluationFinalStatus;
  primaryReasonKey: string;
  primaryReasonAr: string;
}
