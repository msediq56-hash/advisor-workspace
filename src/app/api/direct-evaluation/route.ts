/**
 * POST /api/direct-evaluation
 *
 * Direct-evaluation route handler with narrow error classification.
 * Thin transport wiring over the existing server-side invocation boundary.
 *
 * Accepts a direct-evaluation request, validates the minimal transport shape,
 * calls invokeDirectEvaluationWorkflow, and returns the workflow result as JSON.
 *
 * Error classification is based on exact known error messages from the
 * existing approved access/auth path. No broad framework. No middleware.
 * No business UI. No server actions.
 */

import { NextResponse } from "next/server";
import { invokeDirectEvaluationWorkflow } from "@/modules/evaluation/invoke-direct-evaluation-workflow";
import type { DirectEvaluationRouteRequestBody } from "@/types/direct-evaluation-route";

/**
 * Minimal transport shape validation for the request body.
 * Does not duplicate business validation already handled by lower layers.
 */
function isValidRequestBody(body: unknown): body is DirectEvaluationRouteRequestBody {
  if (typeof body !== "object" || body === null) return false;

  const obj = body as Record<string, unknown>;

  // evaluation must be present and an object with family
  if (typeof obj.evaluation !== "object" || obj.evaluation === null) return false;
  const evaluation = obj.evaluation as Record<string, unknown>;
  if (typeof evaluation.family !== "string") return false;
  if (typeof evaluation.offeringId !== "string") return false;
  if (typeof evaluation.qualificationTypeKey !== "string") return false;

  // sourceProfileId must be present (string or null)
  if (!("sourceProfileId" in obj)) return false;
  if (obj.sourceProfileId !== null && typeof obj.sourceProfileId !== "string") return false;

  return true;
}

// ---------------------------------------------------------------------------
// Narrow route error classifier
// ---------------------------------------------------------------------------

interface ClassifiedRouteError {
  status: number;
  code: string;
  message: string;
}

/**
 * Classify errors from the existing access/auth/workflow path into
 * appropriate HTTP status codes. Uses exact known error message prefixes
 * from the approved access helpers. Falls back to 500 for anything else.
 */
function classifyRouteError(err: unknown): ClassifiedRouteError {
  const message = err instanceof Error ? err.message : "Internal server error";

  // 401 — unauthenticated / no usable identity
  if (
    message === "Authentication required" ||
    message === "Active user profile not found"
  ) {
    return { status: 401, code: "unauthenticated", message };
  }

  // 409 — org selection required
  if (message === "Org context not resolved: multiple_active_memberships_requires_selection") {
    return { status: 409, code: "org_selection_required", message };
  }

  // 403 — org/membership/role access denied
  if (
    message.startsWith("Org context not resolved:") ||
    message.startsWith("Insufficient role:")
  ) {
    return { status: 403, code: "access_denied", message };
  }

  // 500 — everything else
  return { status: 500, code: "internal_error", message };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Parse JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON request body" } },
      { status: 400 }
    );
  }

  // 2. Validate minimal transport shape
  if (!isValidRequestBody(body)) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Invalid request body: evaluation (with family, offeringId, qualificationTypeKey) and sourceProfileId are required" } },
      { status: 400 }
    );
  }

  // 3. Call the existing invocation boundary
  try {
    const result = await invokeDirectEvaluationWorkflow({
      evaluation: body.evaluation,
      sourceProfileId: body.sourceProfileId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const classified = classifyRouteError(err);

    return NextResponse.json(
      { error: { code: classified.code, message: classified.message } },
      { status: classified.status }
    );
  }
}
