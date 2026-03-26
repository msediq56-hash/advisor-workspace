/**
 * Direct evaluation run-and-persist workflow types.
 *
 * Composes the generic orchestration input with caller-owned persistence
 * metadata that is not derivable from the runtime result alone.
 * No UI types. No route types. No broader evaluator types.
 */

import type { DirectEvaluationInput, RunDirectEvaluationResult } from "./direct-evaluation-orchestration";
import type { PersistDirectEvaluationRunResult } from "./direct-evaluation-persistence";

// ---------------------------------------------------------------------------
// Caller-owned persistence metadata
// ---------------------------------------------------------------------------

/** Fields the caller must supply because they are not in the runtime result. */
export interface DirectEvaluationPersistenceMetadata {
  organizationId: string;
  actorUserId: string;
  sourceProfileId: string | null;
  requestContextJsonb: unknown;
}

// ---------------------------------------------------------------------------
// Workflow input
// ---------------------------------------------------------------------------

export interface RunAndPersistDirectEvaluationInput {
  evaluation: DirectEvaluationInput;
  persistenceMetadata: DirectEvaluationPersistenceMetadata;
}

// ---------------------------------------------------------------------------
// Workflow result
// ---------------------------------------------------------------------------

export interface RunAndPersistDirectEvaluationResult {
  runtime: RunDirectEvaluationResult;
  persistence: PersistDirectEvaluationRunResult;
}
