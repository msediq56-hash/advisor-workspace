/**
 * POST /api/direct-evaluation
 *
 * Direct-evaluation route handler with hardened request schema validation
 * and narrow error classification.
 *
 * Thin transport wiring over the existing server-side invocation boundary.
 * No business UI. No server actions. No middleware changes.
 */

import { NextResponse } from "next/server";
import { invokeDirectEvaluationWorkflow } from "@/modules/evaluation/invoke-direct-evaluation-workflow";
import {
  parseDirectEvaluationRouteRequestBody,
  toDirectEvaluationRouteResponseBody,
  RouteValidationError,
} from "@/types/direct-evaluation-route";

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
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON request body" } },
      { status: 400 }
    );
  }

  // 2. Parse and validate transport shape
  let body;
  try {
    body = parseDirectEvaluationRouteRequestBody(rawBody);
  } catch (err: unknown) {
    if (err instanceof RouteValidationError) {
      return NextResponse.json(
        { error: { code: "invalid_request", message: err.message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  // 3. Call the existing invocation boundary
  try {
    const result = await invokeDirectEvaluationWorkflow({
      evaluation: body.evaluation,
      sourceProfileId: body.sourceProfileId,
    });

    return NextResponse.json(toDirectEvaluationRouteResponseBody(result));
  } catch (err: unknown) {
    const classified = classifyRouteError(err);

    return NextResponse.json(
      { error: { code: classified.code, message: classified.message } },
      { status: classified.status }
    );
  }
}
