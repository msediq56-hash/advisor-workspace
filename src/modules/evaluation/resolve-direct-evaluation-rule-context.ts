/**
 * Server-side published Direct Evaluation rule context resolver.
 *
 * Resolves whether a published rule context exists for a selected
 * target offering + qualification type. When supported, loads ordered
 * published rule groups and their ordered active rules.
 *
 * Does not evaluate or execute rules.
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import { prepareSimpleFormDirectEvaluation } from "@/modules/qualification/prepare-simple-form-direct-evaluation";
import type { MembershipRole } from "@/types/enums";
import type { QualificationAnswerPayload } from "@/types/qualification-answer-payload";
import type { CurrentWorkspaceCapabilities } from "@/types/workspace-capabilities";
import type { EffectiveTargetOfferingContext } from "@/types/catalog-target-context";
import type { ActiveQualificationDefinitionRead } from "@/types/qualification-definition-read";
import type { ResolvedDirectEvaluationRuleSet } from "@/types/direct-evaluation-rule-context";
import type {
  ResolvedDirectEvaluationRuleContext,
  ResolvedDirectEvaluationRuleGroup,
  ResolvedDirectEvaluationRule,
} from "@/types/direct-evaluation-resolved-rule-context";

// ---------------------------------------------------------------------------
// Internal: prepared input shape accepted by the rule resolution core
// ---------------------------------------------------------------------------

/** Minimal prepared input needed by the rule resolution core. */
export interface PreparedInputForRuleResolution {
  workspace: CurrentWorkspaceCapabilities;
  target: EffectiveTargetOfferingContext;
  qualificationDefinition: ActiveQualificationDefinitionRead;
  rawProfile: unknown;
  normalizedProfile: unknown;
}

// ---------------------------------------------------------------------------
// Internal: rule resolution core (shared by all qualification paths)
// ---------------------------------------------------------------------------

async function resolveRuleContextFromPreparedInput(
  prepared: PreparedInputForRuleResolution
): Promise<ResolvedDirectEvaluationRuleContext> {
  const offeringId = prepared.target.offering.id;
  const qualificationTypeId = prepared.qualificationDefinition.qualificationType.id;

  const supabase = await createClient();

  const orgId = prepared.workspace.workspace.orgContext.organizationId;

  const { data: ruleSets, error: rsError } = await supabase
    .from("rule_sets")
    .select("id, target_scope, qualification_type_id, owner_scope, owner_organization_id")
    .eq("target_scope", "offering")
    .eq("target_program_offering_id", offeringId)
    .eq("qualification_type_id", qualificationTypeId)
    .eq("is_active", true);

  if (rsError) {
    throw new Error(`Failed to load rule sets: ${rsError.message}`);
  }

  // Filter by readable ownership: platform-owned or owned by current org
  const readableRuleSets = (ruleSets ?? []).filter(
    (rs) =>
      (rs.owner_scope === "platform" && rs.owner_organization_id === null) ||
      (rs.owner_scope === "organization" && rs.owner_organization_id === orgId)
  );

  // Prefer organization-owned over platform-owned
  const orgOwned = readableRuleSets.filter((rs) => rs.owner_scope === "organization");
  const platformOwned = readableRuleSets.filter((rs) => rs.owner_scope === "platform");

  if (orgOwned.length > 1) {
    throw new Error(
      `Data integrity error: found ${orgOwned.length} organization-owned active rule sets ` +
      `for offering ${offeringId} + qualification type ${qualificationTypeId}. Expected at most one.`
    );
  }
  if (platformOwned.length > 1) {
    throw new Error(
      `Data integrity error: found ${platformOwned.length} platform-owned active rule sets ` +
      `for offering ${offeringId} + qualification type ${qualificationTypeId}. Expected at most one.`
    );
  }

  const activeRuleSets = orgOwned.length > 0 ? orgOwned : platformOwned;

  const noRulesResult: ResolvedDirectEvaluationRuleContext = {
    workspace: prepared.workspace,
    target: prepared.target,
    qualificationDefinition: prepared.qualificationDefinition,
    rawProfile: prepared.rawProfile as ResolvedDirectEvaluationRuleContext["rawProfile"],
    normalizedProfile: prepared.normalizedProfile as ResolvedDirectEvaluationRuleContext["normalizedProfile"],
    status: "no_published_rules",
    resolvedRuleSet: null,
    ruleGroups: [],
  };

  if (activeRuleSets.length === 0) {
    return noRulesResult;
  }

  // Find published versions for the matching rule sets
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
    return noRulesResult;
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

  // Load ordered rule groups for the published version
  const { data: groupRows, error: gError } = await supabase
    .from("rule_groups")
    .select("id, group_key, label_ar, evaluation_mode, group_severity, order_index")
    .eq("rule_set_version_id", version.id)
    .order("order_index", { ascending: true });

  if (gError) {
    throw new Error(`Failed to load rule groups: ${gError.message}`);
  }

  const groups = groupRows ?? [];

  if (groups.length === 0) {
    return {
      workspace: prepared.workspace,
      target: prepared.target,
      qualificationDefinition: prepared.qualificationDefinition,
      rawProfile: prepared.rawProfile as ResolvedDirectEvaluationRuleContext["rawProfile"],
      normalizedProfile: prepared.normalizedProfile as ResolvedDirectEvaluationRuleContext["normalizedProfile"],
      status: "supported",
      resolvedRuleSet,
      ruleGroups: [],
    };
  }

  // Load ordered active rules for all groups, joined with rule type key
  const groupIds = groups.map((g) => g.id);

  const { data: ruleRows, error: rError } = await supabase
    .from("rules")
    .select("id, rule_group_id, rule_type_id, config_jsonb, order_index")
    .in("rule_group_id", groupIds)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (rError) {
    throw new Error(`Failed to load rules: ${rError.message}`);
  }

  const rules = ruleRows ?? [];

  // Load rule type keys for all referenced rule_type_ids
  const ruleTypeIds = [...new Set(rules.map((r) => r.rule_type_id))];

  let ruleTypeMap: Map<string, string> = new Map();

  if (ruleTypeIds.length > 0) {
    const { data: ruleTypeRows, error: rtError } = await supabase
      .from("rule_types")
      .select("id, key")
      .in("id", ruleTypeIds);

    if (rtError) {
      throw new Error(`Failed to load rule types: ${rtError.message}`);
    }

    ruleTypeMap = new Map((ruleTypeRows ?? []).map((rt) => [rt.id, rt.key]));
  }

  // Assemble ordered rule groups with their ordered rules
  const rulesByGroup = new Map<string, ResolvedDirectEvaluationRule[]>();
  for (const r of rules) {
    const ruleTypeKey = ruleTypeMap.get(r.rule_type_id);
    if (!ruleTypeKey) {
      throw new Error(
        `Data integrity error: rule ${r.id} references rule_type_id ${r.rule_type_id} which was not found`
      );
    }

    const entry: ResolvedDirectEvaluationRule = {
      ruleId: r.id,
      ruleTypeKey,
      ruleConfig: r.config_jsonb,
      orderIndex: r.order_index,
    };

    const existing = rulesByGroup.get(r.rule_group_id);
    if (existing) {
      existing.push(entry);
    } else {
      rulesByGroup.set(r.rule_group_id, [entry]);
    }
  }

  const ruleGroups: ResolvedDirectEvaluationRuleGroup[] = groups.map((g) => ({
    ruleGroupId: g.id,
    groupKey: g.group_key,
    groupSeverity: g.group_severity,
    groupEvaluationMode: g.evaluation_mode,
    orderIndex: g.order_index,
    rules: rulesByGroup.get(g.id) ?? [],
  }));

  return {
    workspace: prepared.workspace,
    target: prepared.target,
    qualificationDefinition: prepared.qualificationDefinition,
    rawProfile: prepared.rawProfile as ResolvedDirectEvaluationRuleContext["rawProfile"],
    normalizedProfile: prepared.normalizedProfile as ResolvedDirectEvaluationRuleContext["normalizedProfile"],
    status: "supported",
    resolvedRuleSet,
    ruleGroups,
  };
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Resolve the Direct Evaluation rule context for a selected offering + qualification
 * using simple-form preparation.
 *
 * Returns status "supported" with the published rule set reference and loaded
 * ordered rule groups/rules, or status "no_published_rules" with empty groups.
 *
 * Throws on preparation failure, query failure, or integrity errors.
 */
export async function resolveDirectEvaluationRuleContext(
  params: {
    offeringId: string;
    qualificationTypeKey: string;
    answers: QualificationAnswerPayload;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<ResolvedDirectEvaluationRuleContext> {
  const prepared = await prepareSimpleFormDirectEvaluation(params);
  return resolveRuleContextFromPreparedInput(prepared);
}

/**
 * Resolve the Direct Evaluation rule context from an already-prepared input.
 *
 * Accepts any prepared input that satisfies the structural contract
 * (workspace, target, qualificationDefinition, rawProfile, normalizedProfile).
 * Used by orchestration services that prepare input through a different path
 * (e.g. British subject-based preparation).
 */
export async function resolveDirectEvaluationRuleContextFromPrepared(
  prepared: PreparedInputForRuleResolution
): Promise<ResolvedDirectEvaluationRuleContext> {
  return resolveRuleContextFromPreparedInput(prepared);
}
