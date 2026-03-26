/**
 * Direct evaluation route/API transport types.
 *
 * Minimal request/response shapes for the first POST route handler.
 * No business UI types. No broader transport framework.
 */

import type { DirectEvaluationInput } from "./direct-evaluation-orchestration";
import type { InvokeDirectEvaluationWorkflowResult } from "./direct-evaluation-server-invocation";

/**
 * Request body for POST /api/direct-evaluation.
 *
 * Mirrors the existing invocation boundary input contract.
 * The route handler passes this through to invokeDirectEvaluationWorkflow.
 */
export interface DirectEvaluationRouteRequestBody {
  evaluation: DirectEvaluationInput;
  sourceProfileId: string | null;
}

/**
 * Response body for POST /api/direct-evaluation.
 *
 * Passes through the workflow result unchanged.
 */
export type DirectEvaluationRouteResponseBody = InvokeDirectEvaluationWorkflowResult;
