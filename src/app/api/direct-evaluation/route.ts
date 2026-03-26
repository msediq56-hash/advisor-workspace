/**
 * POST /api/direct-evaluation
 *
 * First direct-evaluation route handler baseline.
 * Thin transport wiring over the existing server-side invocation boundary.
 *
 * Accepts a direct-evaluation request, validates the minimal transport shape,
 * calls invokeDirectEvaluationWorkflow, and returns the workflow result as JSON.
 *
 * No business UI. No server actions. No middleware changes.
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

export async function POST(request: Request) {
  // 1. Parse JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  // 2. Validate minimal transport shape
  if (!isValidRequestBody(body)) {
    return NextResponse.json(
      { error: "Invalid request body: evaluation (with family, offeringId, qualificationTypeKey) and sourceProfileId are required" },
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
    const message = err instanceof Error ? err.message : "Internal server error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
