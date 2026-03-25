/**
 * Server-side active qualification definition read service for Direct Evaluation.
 *
 * Resolves: qualification type → family → active question set → questions → options.
 *
 * Ownership rules:
 * - platform-owned qualification types are readable
 * - organization-owned types are readable only for the current organization
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentWorkspaceRunAccess,
  requireCurrentWorkspaceRunAccess,
} from "@/lib/organizations/current-workspace-run-access";
import type { MembershipRole } from "@/types/enums";
import type {
  ActiveQualificationDefinitionRead,
  QualificationFamilyRead,
  QualificationTypeRead,
  QualificationQuestionRead,
  QualificationQuestionOptionRead,
} from "@/types/qualification-definition-read";
import type { CurrentWorkspaceCapabilities } from "@/types/workspace-capabilities";

// ---------------------------------------------------------------------------
// Internal: resolve the full definition chain
// ---------------------------------------------------------------------------

async function resolveActiveDefinition(
  workspace: CurrentWorkspaceCapabilities,
  qualificationTypeKey: string,
): Promise<ActiveQualificationDefinitionRead | null> {
  const supabase = await createClient();
  const orgId = workspace.workspace.orgContext.organizationId;

  // 1. Find active readable qualification_types by key
  //    Readable = platform-owned OR organization-owned by current org
  const { data: qualTypes, error: qtError } = await supabase
    .from("qualification_types")
    .select("id, family_id, key, name_ar, complexity_model, owner_scope, owner_organization_id")
    .eq("key", qualificationTypeKey)
    .eq("is_active", true);

  if (qtError) {
    throw new Error(`Failed to load qualification types: ${qtError.message}`);
  }

  // Filter by ownership: platform-owned or owned by current org
  const readableTypes = (qualTypes ?? []).filter(
    (qt) =>
      (qt.owner_scope === "platform" && qt.owner_organization_id === null) ||
      (qt.owner_scope === "organization" && qt.owner_organization_id === orgId)
  );

  if (readableTypes.length === 0) {
    return null;
  }

  // Use the first readable match (platform or org-owned).
  // If both exist, prefer organization-owned (tenant overlay principle).
  const qualType = readableTypes.find((qt) => qt.owner_scope === "organization")
    ?? readableTypes[0];

  // 2. Resolve active family
  const { data: family, error: famError } = await supabase
    .from("qualification_families")
    .select("id, key, name_ar, academic_stage_key")
    .eq("id", qualType.family_id)
    .eq("is_active", true)
    .single();

  if (famError || !family) {
    throw new Error(
      `Data integrity error: qualification type ${qualType.key} references family ${qualType.family_id} which is not active or not found`
    );
  }

  // 3. Find active question sets for this qualification type
  const { data: questionSets, error: qsError } = await supabase
    .from("qualification_question_sets")
    .select("id, version_number")
    .eq("qualification_type_id", qualType.id)
    .eq("is_active", true);

  if (qsError) {
    throw new Error(`Failed to load question sets: ${qsError.message}`);
  }

  const activeQSets = questionSets ?? [];

  if (activeQSets.length === 0) {
    return null;
  }

  if (activeQSets.length > 1) {
    throw new Error(
      `Data integrity error: qualification type ${qualType.key} has ${activeQSets.length} active question sets — expected exactly one`
    );
  }

  const questionSet = activeQSets[0];

  // 4. Load active questions for this question set
  const { data: questions, error: qError } = await supabase
    .from("qualification_questions")
    .select("id, field_key, label_ar, input_type, is_required, order_index, help_text_ar, config_jsonb, visibility_rule_jsonb")
    .eq("question_set_id", questionSet.id)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (qError) {
    throw new Error(`Failed to load questions: ${qError.message}`);
  }

  const activeQuestions = questions ?? [];

  // 5. Load active options for all active questions
  const questionIds = activeQuestions.map((q) => q.id);
  let activeOptions: Array<{
    id: string;
    question_id: string;
    option_key: string;
    label_ar: string;
    sort_order: number;
  }> = [];

  if (questionIds.length > 0) {
    const { data: options, error: optError } = await supabase
      .from("qualification_question_options")
      .select("id, question_id, option_key, label_ar, sort_order")
      .in("question_id", questionIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (optError) {
      throw new Error(`Failed to load question options: ${optError.message}`);
    }

    activeOptions = options ?? [];
  }

  // Group options by question id
  const optionsByQuestion = new Map<string, QualificationQuestionOptionRead[]>();
  for (const opt of activeOptions) {
    const list = optionsByQuestion.get(opt.question_id) ?? [];
    list.push({
      id: opt.id,
      questionId: opt.question_id,
      optionKey: opt.option_key,
      labelAr: opt.label_ar,
      sortOrder: opt.sort_order,
    });
    optionsByQuestion.set(opt.question_id, list);
  }

  // Map questions with nested options
  const mappedQuestions: QualificationQuestionRead[] = activeQuestions.map((q) => ({
    id: q.id,
    fieldKey: q.field_key,
    labelAr: q.label_ar,
    inputType: q.input_type,
    isRequired: q.is_required,
    orderIndex: q.order_index,
    helpTextAr: q.help_text_ar ?? null,
    configJson: q.config_jsonb ?? null,
    visibilityRuleJson: q.visibility_rule_jsonb ?? null,
    options: optionsByQuestion.get(q.id) ?? [],
  }));

  const familyRead: QualificationFamilyRead = {
    id: family.id,
    key: family.key,
    nameAr: family.name_ar,
    academicStageKey: family.academic_stage_key,
  };

  const qualTypeRead: QualificationTypeRead = {
    id: qualType.id,
    familyId: qualType.family_id,
    key: qualType.key,
    nameAr: qualType.name_ar,
    complexityModel: qualType.complexity_model,
  };

  return {
    workspace,
    family: familyRead,
    qualificationType: qualTypeRead,
    questions: mappedQuestions,
  };
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Get the active qualification definition by type key.
 * Returns null if workspace access is missing or definition is not found.
 * Throws on query failure or data integrity errors.
 */
export async function getActiveQualificationDefinition(
  params: {
    qualificationTypeKey: string;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<ActiveQualificationDefinitionRead | null> {
  const runAccess = await getCurrentWorkspaceRunAccess({
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  if (!runAccess) {
    return null;
  }

  return resolveActiveDefinition(runAccess.workspace, params.qualificationTypeKey);
}

/**
 * Require the active qualification definition by type key, or throw.
 */
export async function requireActiveQualificationDefinition(
  params: {
    qualificationTypeKey: string;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<ActiveQualificationDefinitionRead> {
  const runAccess = await requireCurrentWorkspaceRunAccess({
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  });

  const result = await resolveActiveDefinition(runAccess.workspace, params.qualificationTypeKey);
  if (!result) {
    throw new Error(
      `Active qualification definition not found for type key: ${params.qualificationTypeKey}`
    );
  }

  return result;
}
