/**
 * Direct evaluation advisory-notes rendering types.
 *
 * Arabic advisory notes baseline only.
 * No primary-reason fields. No next-step fields. No persistence types.
 */

import type { DirectEvaluationFinalStatus } from "./direct-evaluation-result-assembly";

/** Rendered advisory notes for a direct evaluation result. */
export interface RenderedDirectEvaluationAdvisoryNotes {
  finalStatus: DirectEvaluationFinalStatus;
  primaryReasonKey: string;
  advisoryNotesAr: readonly string[];
}
