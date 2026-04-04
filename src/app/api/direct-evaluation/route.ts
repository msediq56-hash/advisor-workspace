/**
 * POST /api/direct-evaluation
 *
 * Direct-evaluation route handler with hardened request/response/error schemas
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
  toDirectEvaluationRouteErrorResponseBody,
  RouteValidationError,
} from "@/types/direct-evaluation-route";
import type { DirectEvaluationRouteErrorCode } from "@/types/direct-evaluation-route";

// ---------------------------------------------------------------------------
// Narrow route error classifier
// ---------------------------------------------------------------------------

interface ClassifiedRouteError {
  status: number;
  code: DirectEvaluationRouteErrorCode;
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
    return { status: 401, code: "authentication_required", message };
  }

  // 409 — org selection required
  if (message === "Org context not resolved: multiple_active_memberships_requires_selection") {
    return { status: 409, code: "org_selection_required", message };
  }

  // 403 — org/membership/role access denied, source profile ownership
  if (
    message.startsWith("Org context not resolved:") ||
    message.startsWith("Insufficient role:") ||
    message.startsWith("Source profile not found:") ||
    message.startsWith("Source profile access denied:")
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
      toDirectEvaluationRouteErrorResponseBody({
        code: "invalid_json",
        message: "Invalid JSON request body",
      }),
      { status: 400 }
    );
  }

  // 2. Parse and validate transport shape
  let body;
  try {
    body = parseDirectEvaluationRouteRequestBody(rawBody);
  } catch (err: unknown) {
    const message =
      err instanceof RouteValidationError
        ? err.message
        : "Invalid request body";

    return NextResponse.json(
      toDirectEvaluationRouteErrorResponseBody({
        code: "invalid_request_shape",
        message,
      }),
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
      toDirectEvaluationRouteErrorResponseBody({
        code: classified.code,
        message: classified.message,
      }),
      { status: classified.status }
    );
  }
}
