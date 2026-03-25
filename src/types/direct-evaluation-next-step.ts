/**
 * Direct evaluation next-step rendering types.
 *
 * Arabic next-step baseline only.
 * No advisory-note fields. No persistence types. No UI types.
 */

import type { DirectEvaluationFinalStatus } from "./direct-evaluation-result-assembly";

/** Rendered next step for a direct evaluation result. */
export interface RenderedDirectEvaluationNextStep {
  finalStatus: DirectEvaluationFinalStatus;
  primaryReasonKey: string;
  nextStepAr: string;
}
