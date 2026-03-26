/**
 * Direct evaluation route/API transport types, request parser, and response serializer.
 *
 * Explicit hardened transport-shape validation and response mapping for
 * the first POST route handler. Does not duplicate business-level
 * validation handled by lower layers.
 * No business UI types. No broader transport framework.
 */

import type { DirectEvaluationInput } from "./direct-evaluation-orchestration";
import type { InvokeDirectEvaluationWorkflowResult } from "./direct-evaluation-server-invocation";

// ---------------------------------------------------------------------------
// Transport types
// ---------------------------------------------------------------------------

/**
 * Request body for POST /api/direct-evaluation.
 * Mirrors the existing invocation boundary input contract.
 */
export interface DirectEvaluationRouteRequestBody {
  evaluation: DirectEvaluationInput;
  sourceProfileId: string | null;
}

/**
 * Response body for POST /api/direct-evaluation.
 * Passes through the workflow result unchanged.
 */
export type DirectEvaluationRouteResponseBody = InvokeDirectEvaluationWorkflowResult;

// ---------------------------------------------------------------------------
// Supported families and roles for transport validation
// ---------------------------------------------------------------------------

const SUPPORTED_FAMILIES = new Set([
  "british_curriculum",
  "arabic_secondary",
  "american_high_school",
  "international_baccalaureate",
]);

const SIMPLE_FORM_FAMILIES = new Set([
  "arabic_secondary",
  "american_high_school",
  "international_baccalaureate",
]);

const VALID_MEMBERSHIP_ROLES = new Set(["owner", "manager", "advisor"]);

// ---------------------------------------------------------------------------
// Explicit hardened request parser
// ---------------------------------------------------------------------------

/**
 * Parse and validate the direct-evaluation route request body.
 * Throws a descriptive error on any transport-shape violation.
 * Does not validate deeper business semantics.
 */
export function parseDirectEvaluationRouteRequestBody(
  value: unknown
): DirectEvaluationRouteRequestBody {
  if (typeof value !== "object" || value === null) {
    throw new RouteValidationError("Request body must be a non-null object");
  }

  const obj = value as Record<string, unknown>;

  // --- sourceProfileId ---
  if (!("sourceProfileId" in obj)) {
    throw new RouteValidationError("sourceProfileId is required");
  }
  if (obj.sourceProfileId !== null && typeof obj.sourceProfileId !== "string") {
    throw new RouteValidationError("sourceProfileId must be a string or null");
  }
  const sourceProfileId = obj.sourceProfileId as string | null;

  // --- evaluation ---
  if (typeof obj.evaluation !== "object" || obj.evaluation === null) {
    throw new RouteValidationError("evaluation must be a non-null object");
  }
  const eval_ = obj.evaluation as Record<string, unknown>;

  // --- evaluation.family ---
  if (typeof eval_.family !== "string") {
    throw new RouteValidationError("evaluation.family must be a string");
  }
  if (!SUPPORTED_FAMILIES.has(eval_.family)) {
    throw new RouteValidationError(
      `evaluation.family must be one of: ${[...SUPPORTED_FAMILIES].join(", ")}`
    );
  }
  const family = eval_.family;

  // --- evaluation.offeringId ---
  if (typeof eval_.offeringId !== "string") {
    throw new RouteValidationError("evaluation.offeringId must be a string");
  }

  // --- evaluation.qualificationTypeKey ---
  if (typeof eval_.qualificationTypeKey !== "string") {
    throw new RouteValidationError("evaluation.qualificationTypeKey must be a string");
  }

  // --- family-specific transport shape ---
  if (family === "british_curriculum") {
    if (typeof eval_.payload !== "object" || eval_.payload === null) {
      throw new RouteValidationError(
        "evaluation.payload must be a non-null object for british_curriculum"
      );
    }
  } else if (SIMPLE_FORM_FAMILIES.has(family)) {
    if (typeof eval_.answers !== "object" || eval_.answers === null) {
      throw new RouteValidationError(
        `evaluation.answers must be a non-null object for ${family}`
      );
    }
  }

  // --- optional evaluation.organizationId ---
  if ("organizationId" in eval_) {
    if (eval_.organizationId !== null && typeof eval_.organizationId !== "string") {
      throw new RouteValidationError(
        "evaluation.organizationId must be a string, null, or omitted"
      );
    }
  }

  // --- optional evaluation.allowedRoles ---
  if ("allowedRoles" in eval_) {
    if (!Array.isArray(eval_.allowedRoles)) {
      throw new RouteValidationError("evaluation.allowedRoles must be an array or omitted");
    }
    for (const role of eval_.allowedRoles) {
      if (typeof role !== "string" || !VALID_MEMBERSHIP_ROLES.has(role)) {
        throw new RouteValidationError(
          `evaluation.allowedRoles contains invalid role: ${String(role)}. ` +
          `Valid roles: ${[...VALID_MEMBERSHIP_ROLES].join(", ")}`
        );
      }
    }
  }

  return {
    evaluation: obj.evaluation as DirectEvaluationInput,
    sourceProfileId,
  };
}

// ---------------------------------------------------------------------------
// Local route validation error
// ---------------------------------------------------------------------------

/**
 * Narrow validation error for route transport-shape failures.
 * Used only by the direct-evaluation route parser.
 */
export class RouteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteValidationError";
  }
}

// ---------------------------------------------------------------------------
// Explicit response serializer
// ---------------------------------------------------------------------------

/**
 * Map the workflow output into an explicit route response body.
 * Preserves the current approved response shape only.
 * Does not pass through raw unknown values or add derived fields.
 */
export function toDirectEvaluationRouteResponseBody(
  value: InvokeDirectEvaluationWorkflowResult
): DirectEvaluationRouteResponseBody {
  return {
    runtime: value.runtime,
    persistence: {
      evaluationRunId: value.persistence.evaluationRunId,
      evaluationResultId: value.persistence.evaluationResultId,
      persistedRuleTraceCount: value.persistence.persistedRuleTraceCount,
    },
  };
}
