/**
 * First server-side invocation boundary for the direct-evaluation workflow.
 *
 * Resolves the current actor/workspace context using existing approved
 * access helpers, derives caller-owned persistence metadata, and calls
 * the existing run-and-persist workflow.
 *
 * This is NOT a route, API handler, or server action.
 * It is the first server-side composition boundary that resolves
 * session/actor/org context before delegating to the workflow.
 *
 * Server-side only — do not import from client components.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { requireActorAccess } from "@/lib/auth/actor-access";
import { runAndPersistDirectEvaluation } from "@/modules/evaluation/run-and-persist-direct-evaluation";
import type {
  InvokeDirectEvaluationWorkflowInput,
  InvokeDirectEvaluationWorkflowResult,
} from "@/types/direct-evaluation-server-invocation";

/**
 * Invoke the direct-evaluation workflow from server-side code.
 *
 * 1. Resolves the current authenticated actor and organization context
 * 2. If sourceProfileId is non-null, verifies the profile exists and
 *    belongs to the resolved organization
 * 3. Derives persistence metadata from the resolved context
 * 4. Calls the run-and-persist workflow with the admin Supabase client
 * 5. Returns the workflow result unchanged
 */
export async function invokeDirectEvaluationWorkflow(
  input: InvokeDirectEvaluationWorkflowInput
): Promise<InvokeDirectEvaluationWorkflowResult> {
  // 1. Resolve current actor and organization context
  const access = await requireActorAccess({
    organizationId: input.evaluation.organizationId,
    allowedRoles: input.evaluation.allowedRoles,
  });

  const adminClient = createAdminClient();

  // 2. If sourceProfileId is provided, verify organization ownership
  if (input.sourceProfileId != null) {
    const { data: profile, error } = await adminClient
      .from("student_profiles")
      .select("organization_id")
      .eq("id", input.sourceProfileId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Source profile lookup failed: ${error.message}`
      );
    }

    if (!profile) {
      throw new Error(
        "Source profile not found: the referenced student profile does not exist"
      );
    }

    if (profile.organization_id !== access.orgContext.organizationId) {
      throw new Error(
        "Source profile access denied: the referenced student profile belongs to a different organization"
      );
    }
  }

  // 3. Build the run-and-persist workflow input
  const result = await runAndPersistDirectEvaluation({
    supabase: adminClient,
    input: {
      evaluation: input.evaluation,
      persistenceMetadata: {
        organizationId: access.orgContext.organizationId,
        actorUserId: access.session.user.id,
        sourceProfileId: input.sourceProfileId,
        requestContextJsonb: { source: "server_invocation_baseline" },
      },
    },
  });

  return result;
}
