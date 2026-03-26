/**
 * Generic multi-family direct-evaluation in-memory orchestrator.
 *
 * Thin router over the existing per-family orchestrators.
 * Routes british_curriculum to the British orchestrator and
 * supported simple-form families to the simple-form orchestrator.
 *
 * Does not reimplement preparation, rule resolution, execution,
 * result assembly, or explanation rendering.
 * Does not add persistence, UI, routes, or new rule types.
 *
 * Server-side only — do not import from client components.
 */

import { runBritishDirectEvaluation } from "@/modules/evaluation/run-british-direct-evaluation";
import { runSimpleFormDirectEvaluation } from "@/modules/evaluation/run-simple-form-direct-evaluation";
import type {
  DirectEvaluationInput,
  RunDirectEvaluationResult,
} from "@/types/direct-evaluation-orchestration";

/**
 * Run a direct evaluation for any supported qualification family.
 * Routes to the appropriate per-family orchestrator based on the
 * discriminated `family` field in the input.
 *
 * Throws on unsupported families, missing workspace access, or any
 * failure surfaced by the composed per-family orchestrators.
 */
export async function runDirectEvaluation(
  input: DirectEvaluationInput
): Promise<RunDirectEvaluationResult> {
  switch (input.family) {
    case "british_curriculum": {
      const result = await runBritishDirectEvaluation({
        offeringId: input.offeringId,
        qualificationTypeKey: input.qualificationTypeKey,
        payload: input.payload,
        organizationId: input.organizationId,
        allowedRoles: input.allowedRoles,
      });
      return { family: "british_curriculum", ...result };
    }

    case "arabic_secondary":
    case "american_high_school":
    case "international_baccalaureate": {
      const result = await runSimpleFormDirectEvaluation({
        offeringId: input.offeringId,
        qualificationTypeKey: input.qualificationTypeKey,
        answers: input.answers,
        organizationId: input.organizationId,
        allowedRoles: input.allowedRoles,
      });
      return { family: input.family, ...result };
    }

    default: {
      const _exhaustive: never = input;
      throw new Error(
        `Unsupported qualification family for direct evaluation: ${(input as { family: string }).family}`
      );
    }
  }
}
