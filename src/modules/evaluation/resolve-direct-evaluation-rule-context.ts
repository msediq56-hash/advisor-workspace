/**
 * Server-side published Direct Evaluation rule context resolver.
 *
 * Resolves whether a published rule context exists for a selected
 * target offering + qualification type. Does not evaluate or execute rules.
 *
 * Composes existing simple-form preparation and reads rule registry tables.
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import { prepareSimpleFormDirectEvaluation } from "@/modules/qualification/prepare-simple-form-direct-evaluation";
import type { MembershipRole } from "@/types/enums";
import type { QualificationAnswerPayload } from "@/types/qualification-answer-payload";
import type {
  DirectEvaluationRuleContext,
  ResolvedDirectEvaluationRuleSet,
} from "@/types/direct-evaluation-rule-context";

/**
 * Resolve the Direct Evaluation rule context for a selected offering + qualification.
 *
 * Returns status "supported" with the published rule set reference,
 * or status "no_published_rules" with resolvedRuleSet = null.
 *
 * Throws on preparation failure, query failure, or integrity errors
 * (e.g. multiple published versions for the same rule set context).
 */
export async function resolveDirectEvaluationRuleContext(
  params: {
    offeringId: string;
    qualificationTypeKey: string;
    answers: QualificationAnswerPayload;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<DirectEvaluationRuleContext> {
  // 1. Prepare the simple-form direct evaluation input
  const prepared = await prepareSimpleFormDirectEvaluation(params);

  const offeringId = prepared.target.offering.id;
  const qualificationTypeId = prepared.qualificationDefinition.qualificationType.id;

  // 2. Find active rule_sets targeting this offering + qualification type
  const supabase = await createClient();

  const { data: ruleSets, error: rsError } = await supabase
    .from("rule_sets")
    .select("id, target_scope, qualification_type_id")
    .eq("target_scope", "offering")
    .eq("target_program_offering_id", offeringId)
    .eq("qualification_type_id", qualificationTypeId)
    .eq("is_active", true);

  if (rsError) {
    throw new Error(`Failed to load rule sets: ${rsError.message}`);
  }

  const activeRuleSets = ruleSets ?? [];

  if (activeRuleSets.length === 0) {
    return {
      workspace: prepared.workspace,
      target: prepared.target,
      qualificationDefinition: prepared.qualificationDefinition,
      rawProfile: prepared.rawProfile,
      normalizedProfile: prepared.normalizedProfile,
      status: "no_published_rules",
      resolvedRuleSet: null,
    };
  }

  // 3. Find published versions for the matching rule sets
  const ruleSetIds = activeRuleSets.map((rs) => rs.id);

  const { data: versions, error: vError } = await supabase
    .from("rule_set_versions")
    .select("id, rule_set_id")
    .in("rule_set_id", ruleSetIds)
    .eq("lifecycle_status", "published");

  if (vError) {
    throw new Error(`Failed to load rule set versions: ${vError.message}`);
  }

  const publishedVersions = versions ?? [];

  if (publishedVersions.length === 0) {
    return {
      workspace: prepared.workspace,
      target: prepared.target,
      qualificationDefinition: prepared.qualificationDefinition,
      rawProfile: prepared.rawProfile,
      normalizedProfile: prepared.normalizedProfile,
      status: "no_published_rules",
      resolvedRuleSet: null,
    };
  }

  if (publishedVersions.length > 1) {
    throw new Error(
      `Data integrity error: found ${publishedVersions.length} published rule set versions ` +
      `for offering ${offeringId} + qualification type ${qualificationTypeId}. Expected at most one.`
    );
  }

  const version = publishedVersions[0];
  const ruleSet = activeRuleSets.find((rs) => rs.id === version.rule_set_id);

  if (!ruleSet) {
    throw new Error(
      `Data integrity error: published version ${version.id} references rule set ${version.rule_set_id} which was not found in active rule sets`
    );
  }

  const resolvedRuleSet: ResolvedDirectEvaluationRuleSet = {
    ruleSetId: ruleSet.id,
    ruleSetVersionId: version.id,
    targetScope: ruleSet.target_scope,
    qualificationTypeId: ruleSet.qualification_type_id,
  };

  return {
    workspace: prepared.workspace,
    target: prepared.target,
    qualificationDefinition: prepared.qualificationDefinition,
    rawProfile: prepared.rawProfile,
    normalizedProfile: prepared.normalizedProfile,
    status: "supported",
    resolvedRuleSet,
  };
}
