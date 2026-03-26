/**
 * Direct evaluation server-side invocation boundary types.
 *
 * First server-side entrypoint contract for the direct-evaluation workflow.
 * Composes actor/workspace context resolution with the run-and-persist workflow.
 * No UI types. No route types. No API handler types.
 */

import type { DirectEvaluationInput } from "./direct-evaluation-orchestration";
import type { RunAndPersistDirectEvaluationResult } from "./direct-evaluation-run-and-persist";

/**
 * Input for the server-side direct-evaluation invocation boundary.
 *
 * The boundary derives organizationId and actorUserId from the current
 * authenticated session/workspace context. The caller supplies only:
 * - the generic runtime evaluation input
 * - sourceProfileId (if a saved student profile exists; null otherwise)
 */
export interface InvokeDirectEvaluationWorkflowInput {
  evaluation: DirectEvaluationInput;
  sourceProfileId: string | null;
}

/**
 * Result of the server-side direct-evaluation invocation boundary.
 * Passes through the run-and-persist workflow result unchanged.
 */
export type InvokeDirectEvaluationWorkflowResult = RunAndPersistDirectEvaluationResult;
