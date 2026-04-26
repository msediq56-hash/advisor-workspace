/**
 * Milestone 2B — Direct Evaluation demo smoke (Constructor CS / British A-Level).
 *
 * Validates that, after running scripts/seed/demo-seed.ts against a local
 * Supabase, the Direct Evaluation pure-runtime path returns the expected
 * outcome for the supported-subset Constructor CS rule set, and that the
 * persistence RPC writes one run + one result + four traces atomically.
 *
 * Prerequisites:
 *   1. Local Supabase running (`npx supabase status`).
 *   2. `npx supabase db reset` has been applied so all 17 migrations are present.
 *   3. `npx tsx scripts/seed/demo-seed.ts` has completed PASS at least once.
 *
 * Run with:
 *   npx tsx scripts/smoke/direct-evaluation-demo-smoke.ts
 *
 * Required env (or defaults from `npx supabase status`):
 *   SUPABASE_URL                  (default http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY     (required)
 *
 * SAFETY:
 *   Refuses to run if NODE_ENV === "production" or if SUPABASE_URL hostname
 *   is not localhost / 127.0.0.1.
 *
 * SCOPE — pure-runtime smoke (intentional limitations):
 *
 *   The user-facing entry point `runAndPersistDirectEvaluation` cannot be
 *   invoked from a standalone tsx script because its transitive imports
 *   reach `next/headers.cookies()` (via @/lib/supabase/server.createClient
 *   used inside the catalog target context resolver, the qualification
 *   definition resolver, and the rule context resolver). Calling those
 *   from outside a Next.js request context throws.
 *
 *   Per the Milestone 2B amendment, this smoke does NOT rewrite runtime
 *   services. Instead it composes ONLY the pure runtime modules
 *   (assemble → prepare(validated) → execute → assemble result → render)
 *   on top of structures it loads itself via the service_role admin client.
 *
 *   Therefore this smoke explicitly does NOT exercise:
 *     - HTTP / Next.js cookies / auth session resolution
 *     - role-capability resolution (workspace.capabilities is set to [])
 *     - the catalog browse + selection + target context resolver
 *     - the active qualification definition resolver
 *     - the published rule context resolver
 *     - the runAndPersistDirectEvaluation workflow's mapping layer
 *       (this smoke replicates that mapping inline; it does not re-export
 *        runtime mapping logic — it imports and composes the same pure
 *        renderers that the workflow uses)
 *     - source_profile_id linkage (sent as null — no student_profiles
 *       row is required by the demo)
 *     - RLS isolation (smoke uses service_role; RLS isolation is covered
 *       by the Milestone 1 RLS validations in migrations 00010–00017)
 *
 *   What this smoke DOES exercise end-to-end:
 *     - The pure British raw-profile assembler (validation gate)
 *     - The British normalizer (ordinal grade scale 0–8)
 *     - prepareValidatedBritishDirectEvaluation
 *     - executeDirectEvaluationRuleContext on all 4 supported rule types
 *     - assembleDirectEvaluationResult
 *     - The 4 pure renderers (primary reason, next step, advisory notes,
 *       per-trace explanation)
 *     - The persist_direct_evaluation_run_atomic RPC against a real
 *       local Postgres, including the run + result + traces inserts
 *
 * Expected outcome for the demo profile:
 *   Subjects: Mathematics A, Physics B, Computer Science C
 *   Graduation year: 2026
 *   Result:  finalStatus === "eligible"
 *            All 4 supported rules PASS
 *            minimum_subject_grade for Mathematics:
 *              matchedGradeValue === 7 (A on ordinal scale)
 *              requiredMinimumGradeValue === 5 (C on ordinal scale)
 *            persistence returns evaluationRunId, evaluationResultId,
 *              and persistedRuleTraceCount === 4
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { assembleValidatedBritishSubjectBasedRawProfile } from "@/modules/qualification/assemble-british-subject-based-raw-profile";
import { prepareValidatedBritishDirectEvaluation } from "@/modules/qualification/prepare-british-direct-evaluation";
import { executeDirectEvaluationRuleContext } from "@/modules/evaluation/execute-direct-evaluation-rule-context";
import { assembleDirectEvaluationResult } from "@/modules/evaluation/assemble-direct-evaluation-result";
import { renderDirectEvaluationPrimaryReason } from "@/modules/evaluation/render-direct-evaluation-primary-reason";
import { renderDirectEvaluationNextStep } from "@/modules/evaluation/render-direct-evaluation-next-step";
import { renderDirectEvaluationAdvisoryNotes } from "@/modules/evaluation/render-direct-evaluation-advisory-notes";
import { renderDirectEvaluationRuleTraceExplanation } from "@/modules/evaluation/render-direct-evaluation-rule-trace-explanation";
import { persistDirectEvaluationRun } from "@/modules/evaluation/persist-direct-evaluation-run";

import type {
  BritishSubjectBasedAnswerPayload,
} from "@/types/british-subject-answer-payload";
import type {
  ActiveQualificationDefinitionRead,
  QualificationFamilyRead,
  QualificationTypeRead,
  QualificationQuestionRead,
} from "@/types/qualification-definition-read";
import type {
  EffectiveTargetOfferingContext,
} from "@/types/catalog-target-context";
import type {
  ResolvedDirectEvaluationRuleContext,
  ResolvedDirectEvaluationRuleGroup,
  ResolvedDirectEvaluationRule,
} from "@/types/direct-evaluation-resolved-rule-context";
import type {
  ResolvedDirectEvaluationRuleSet,
} from "@/types/direct-evaluation-rule-context";
import type { CurrentWorkspaceCapabilities } from "@/types/workspace-capabilities";
import type {
  DirectEvaluationRuleExecution,
  DirectEvaluationRuleGroupExecution,
} from "@/types/direct-evaluation-execution";
import type {
  PersistDirectEvaluationRunInput,
  PersistEvaluationRuleTraceRowInput,
} from "@/types/direct-evaluation-persistence";

// ---------------------------------------------------------------------------
// Safety guards — must run before any client construction or DB access
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === "production") {
  console.error("FATAL: Refusing to run direct-evaluation smoke in NODE_ENV=production.");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SERVICE_ROLE_KEY) {
  console.error("FATAL: Set SUPABASE_SERVICE_ROLE_KEY env var.");
  console.error("Get it from: npx supabase status");
  process.exit(1);
}

let urlHostname: string;
try {
  urlHostname = new URL(SUPABASE_URL).hostname;
} catch {
  console.error(`FATAL: SUPABASE_URL is not a valid URL: "${SUPABASE_URL}"`);
  process.exit(1);
}
if (urlHostname !== "127.0.0.1" && urlHostname !== "localhost") {
  console.error(
    `FATAL: SUPABASE_URL hostname "${urlHostname}" is not local. ` +
      "This smoke script refuses to run against non-localhost databases.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Constants — must mirror scripts/seed/demo-seed.ts
// ---------------------------------------------------------------------------

const SEEDED = {
  organizationId: "00000000-0000-0000-0000-000000000d20",
  programOfferingId: "00000000-0000-0000-0000-000000000d12",
  qualificationTypeKey: "british_a_level",
  advisorEmail: "advisor@constructor-demo.local",
} as const;

// ---------------------------------------------------------------------------
// Admin client (service_role bypasses RLS)
// ---------------------------------------------------------------------------

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

interface AssertionRecord {
  name: string;
  ok: boolean;
  detail?: string;
}
const results: AssertionRecord[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail: string): never {
  results.push({ name, ok: false, detail });
  console.log(`  FAIL  ${name} — ${detail}`);
  throw new Error(`Smoke step failed: ${name} — ${detail}`);
}

// ---------------------------------------------------------------------------
// Step 1 — Resolve advisor auth user id by email (set by demo-seed)
// ---------------------------------------------------------------------------

async function resolveAdvisorAuthId(): Promise<string> {
  const list = await admin.auth.admin.listUsers();
  if (list.error || !list.data?.users) {
    fail("admin.listUsers", list.error?.message ?? "no users returned");
  }
  const advisor = list.data.users.find(
    (u) => u.email?.toLowerCase() === SEEDED.advisorEmail.toLowerCase(),
  );
  if (!advisor) {
    fail(
      "advisor lookup",
      `auth user with email ${SEEDED.advisorEmail} not found — run demo-seed first`,
    );
  }

  // Confirm the matching user_profiles row exists with the same id
  const profile = await admin
    .from("user_profiles")
    .select("id, is_active")
    .eq("id", advisor.id)
    .maybeSingle();
  if (profile.error || !profile.data) {
    fail(
      "advisor user_profile",
      profile.error?.message ?? "user_profiles row missing for advisor — re-run seed",
    );
  }
  if (profile.data.is_active !== true) {
    fail("advisor user_profile.is_active", "advisor profile is not active");
  }
  pass("advisor auth + user_profiles aligned", `advisor auth id ${advisor.id}`);
  return advisor.id;
}

// ---------------------------------------------------------------------------
// Step 2 — Build the EffectiveTargetOfferingContext from admin SELECTs
// ---------------------------------------------------------------------------

async function loadTargetContext(
  workspace: CurrentWorkspaceCapabilities,
): Promise<EffectiveTargetOfferingContext> {
  const offering = await admin
    .from("program_offerings")
    .select(
      "id, program_id, intake_label_ar, intake_term_key, intake_year, campus_name_ar, study_mode_key, duration_months, teaching_language_key, annual_tuition_amount, currency_code, application_fee_amount, extra_fee_note_ar, scholarship_note_ar",
    )
    .eq("id", SEEDED.programOfferingId)
    .single();
  if (offering.error || !offering.data) {
    fail("load program_offerings", offering.error?.message ?? "offering missing");
  }

  const program = await admin
    .from("programs")
    .select(
      "id, university_id, faculty_id, degree_id, program_code, title_ar, title_en, canonical_search_title_ar",
    )
    .eq("id", offering.data.program_id)
    .single();
  if (program.error || !program.data) {
    fail("load programs", program.error?.message ?? "program missing");
  }

  const university = await admin
    .from("universities")
    .select("id, country_id, university_type_id, name_ar, name_en")
    .eq("id", program.data.university_id)
    .single();
  if (university.error || !university.data) {
    fail("load universities", university.error?.message ?? "university missing");
  }

  const country = await admin
    .from("countries")
    .select("id, code, name_ar")
    .eq("id", university.data.country_id)
    .single();
  if (country.error || !country.data) {
    fail("load countries", country.error?.message ?? "country missing");
  }

  const universityType = await admin
    .from("university_types")
    .select("id, key, name_ar")
    .eq("id", university.data.university_type_id)
    .single();
  if (universityType.error || !universityType.data) {
    fail(
      "load university_types",
      universityType.error?.message ?? "university type missing",
    );
  }

  const degree = await admin
    .from("degrees")
    .select("id, key, name_ar, level_rank")
    .eq("id", program.data.degree_id)
    .single();
  if (degree.error || !degree.data) {
    fail("load degrees", degree.error?.message ?? "degree missing");
  }

  const target: EffectiveTargetOfferingContext = {
    workspace,
    country: {
      id: country.data.id,
      code: country.data.code,
      nameAr: country.data.name_ar,
    },
    universityType: {
      id: universityType.data.id,
      key: universityType.data.key,
      nameAr: universityType.data.name_ar,
    },
    university: {
      id: university.data.id,
      countryId: university.data.country_id,
      universityTypeId: university.data.university_type_id,
      nameAr: university.data.name_ar,
      nameEn: university.data.name_en ?? null,
    },
    degree: {
      id: degree.data.id,
      key: degree.data.key,
      nameAr: degree.data.name_ar,
      levelRank: degree.data.level_rank,
    },
    program: {
      id: program.data.id,
      universityId: program.data.university_id,
      facultyId: program.data.faculty_id ?? null,
      degreeId: program.data.degree_id,
      programCode: program.data.program_code ?? null,
      titleAr: program.data.title_ar,
      titleEn: program.data.title_en ?? null,
      canonicalSearchTitleAr: program.data.canonical_search_title_ar,
    },
    offering: {
      id: offering.data.id,
      programId: offering.data.program_id,
      intakeLabelAr: offering.data.intake_label_ar,
      intakeTermKey: offering.data.intake_term_key ?? null,
      intakeYear: offering.data.intake_year ?? null,
      campusNameAr: offering.data.campus_name_ar ?? null,
      studyModeKey: offering.data.study_mode_key ?? null,
      durationMonths: offering.data.duration_months ?? null,
      teachingLanguageKey: offering.data.teaching_language_key ?? null,
      annualTuitionAmount: offering.data.annual_tuition_amount ?? null,
      currencyCode: offering.data.currency_code,
      applicationFeeAmount: offering.data.application_fee_amount ?? null,
      extraFeeNoteAr: offering.data.extra_fee_note_ar ?? null,
      scholarshipNoteAr: offering.data.scholarship_note_ar ?? null,
    },
  };
  pass("load target offering context", `offering ${target.offering.id}`);
  return target;
}

// ---------------------------------------------------------------------------
// Step 3 — Build the ActiveQualificationDefinitionRead from admin SELECTs
// ---------------------------------------------------------------------------

async function loadQualificationDefinition(
  workspace: CurrentWorkspaceCapabilities,
): Promise<ActiveQualificationDefinitionRead> {
  const qualType = await admin
    .from("qualification_types")
    .select("id, family_id, key, name_ar, complexity_model")
    .eq("key", SEEDED.qualificationTypeKey)
    .eq("is_active", true)
    .single();
  if (qualType.error || !qualType.data) {
    fail(
      "load qualification_types",
      qualType.error?.message ?? "qualification type missing",
    );
  }

  const family = await admin
    .from("qualification_families")
    .select("id, key, name_ar, academic_stage_key")
    .eq("id", qualType.data.family_id)
    .eq("is_active", true)
    .single();
  if (family.error || !family.data) {
    fail(
      "load qualification_families",
      family.error?.message ?? "qualification family missing",
    );
  }

  // Question set + questions (smoke does not exercise question rendering;
  // these are loaded so the typed shape stays faithful)
  const qSet = await admin
    .from("qualification_question_sets")
    .select("id")
    .eq("qualification_type_id", qualType.data.id)
    .eq("is_active", true)
    .single();
  if (qSet.error || !qSet.data) {
    fail(
      "load qualification_question_sets",
      qSet.error?.message ?? "active question set missing",
    );
  }

  const questionRows = await admin
    .from("qualification_questions")
    .select(
      "id, field_key, label_ar, input_type, is_required, order_index, help_text_ar, config_jsonb, visibility_rule_jsonb",
    )
    .eq("question_set_id", qSet.data.id)
    .eq("is_active", true)
    .order("order_index", { ascending: true });
  if (questionRows.error) {
    fail("load qualification_questions", questionRows.error.message);
  }

  const questions: QualificationQuestionRead[] = (questionRows.data ?? []).map(
    (q) => ({
      id: q.id,
      fieldKey: q.field_key,
      labelAr: q.label_ar,
      inputType: q.input_type,
      isRequired: q.is_required,
      orderIndex: q.order_index,
      helpTextAr: q.help_text_ar ?? null,
      configJson: q.config_jsonb ?? null,
      visibilityRuleJson: q.visibility_rule_jsonb ?? null,
      options: [],
    }),
  );

  const familyRead: QualificationFamilyRead = {
    id: family.data.id,
    key: family.data.key,
    nameAr: family.data.name_ar,
    academicStageKey: family.data.academic_stage_key,
  };
  const qualTypeRead: QualificationTypeRead = {
    id: qualType.data.id,
    familyId: qualType.data.family_id,
    key: qualType.data.key,
    nameAr: qualType.data.name_ar,
    complexityModel: qualType.data.complexity_model,
  };

  const definition: ActiveQualificationDefinitionRead = {
    workspace,
    family: familyRead,
    qualificationType: qualTypeRead,
    questions,
  };
  pass("load qualification definition", `${familyRead.key} / ${qualTypeRead.key}`);
  return definition;
}

// ---------------------------------------------------------------------------
// Step 4 — Build the workspace capabilities (no role-cap resolution)
// ---------------------------------------------------------------------------

async function loadWorkspace(advisorAuthId: string): Promise<CurrentWorkspaceCapabilities> {
  const org = await admin
    .from("organizations")
    .select("id, slug, name_ar, status")
    .eq("id", SEEDED.organizationId)
    .single();
  if (org.error || !org.data) {
    fail("load organizations", org.error?.message ?? "organization missing");
  }

  const membership = await admin
    .from("organization_memberships")
    .select("id, user_id, organization_id, role_key, membership_status")
    .eq("organization_id", SEEDED.organizationId)
    .eq("user_id", advisorAuthId)
    .single();
  if (membership.error || !membership.data) {
    fail("load organization_memberships", membership.error?.message ?? "membership missing");
  }
  if (membership.data.membership_status !== "active") {
    fail("membership active", `expected active but got ${membership.data.membership_status}`);
  }

  const profile = await admin
    .from("user_profiles")
    .select("id, full_name, email_normalized, is_active")
    .eq("id", advisorAuthId)
    .single();
  if (profile.error || !profile.data) {
    fail("load user_profiles", profile.error?.message ?? "user_profiles missing");
  }

  const workspace: CurrentWorkspaceCapabilities = {
    workspace: {
      actor: {
        session: {
          user: {
            id: advisorAuthId,
            email: profile.data.email_normalized,
          },
        },
        profile: {
          id: profile.data.id,
          fullName: profile.data.full_name,
          emailNormalized: profile.data.email_normalized,
          isActive: profile.data.is_active,
        },
      },
      orgContext: {
        userId: advisorAuthId,
        membershipId: membership.data.id,
        organizationId: org.data.id,
        organizationSlug: org.data.slug,
        organizationNameAr: org.data.name_ar,
        roleKey: membership.data.role_key,
      },
      organization: {
        id: org.data.id,
        slug: org.data.slug,
        nameAr: org.data.name_ar,
        status: org.data.status,
      },
      membership: {
        id: membership.data.id,
        userId: membership.data.user_id,
        organizationId: membership.data.organization_id,
        roleKey: membership.data.role_key,
        membershipStatus: membership.data.membership_status,
      },
    },
    capabilities: [],
  };
  pass("build workspace capabilities", "capabilities=[] (smoke skips role-cap resolution)");
  return workspace;
}

// ---------------------------------------------------------------------------
// Step 5 — Build the resolved rule context from admin SELECTs
// ---------------------------------------------------------------------------

async function loadResolvedRuleContext(
  workspace: CurrentWorkspaceCapabilities,
  target: EffectiveTargetOfferingContext,
  qualificationDefinition: ActiveQualificationDefinitionRead,
  rawProfile: ResolvedDirectEvaluationRuleContext["rawProfile"],
  normalizedProfile: ResolvedDirectEvaluationRuleContext["normalizedProfile"],
): Promise<ResolvedDirectEvaluationRuleContext> {
  // 1. Active rule set targeting this offering+qualification type
  const ruleSetRow = await admin
    .from("rule_sets")
    .select("id, target_scope, qualification_type_id, owner_scope, owner_organization_id")
    .eq("target_scope", "offering")
    .eq("target_program_offering_id", target.offering.id)
    .eq("qualification_type_id", qualificationDefinition.qualificationType.id)
    .eq("is_active", true)
    .single();
  if (ruleSetRow.error || !ruleSetRow.data) {
    fail("load rule_sets", ruleSetRow.error?.message ?? "rule_set missing");
  }

  // 2. Single published version
  const versionRow = await admin
    .from("rule_set_versions")
    .select("id, rule_set_id")
    .eq("rule_set_id", ruleSetRow.data.id)
    .eq("lifecycle_status", "published")
    .single();
  if (versionRow.error || !versionRow.data) {
    fail("load rule_set_versions", versionRow.error?.message ?? "published version missing");
  }

  const resolvedRuleSet: ResolvedDirectEvaluationRuleSet = {
    ruleSetId: ruleSetRow.data.id,
    ruleSetVersionId: versionRow.data.id,
    targetScope: ruleSetRow.data.target_scope,
    qualificationTypeId: ruleSetRow.data.qualification_type_id,
  };

  // 3. Ordered groups
  const groupsRow = await admin
    .from("rule_groups")
    .select("id, group_key, label_ar, evaluation_mode, group_severity, order_index")
    .eq("rule_set_version_id", versionRow.data.id)
    .order("order_index", { ascending: true });
  if (groupsRow.error) {
    fail("load rule_groups", groupsRow.error.message);
  }
  const groupRows = groupsRow.data ?? [];
  if (groupRows.length === 0) {
    fail("rule_groups present", "no rule_groups for the published version");
  }

  // 4. Active ordered rules across all groups, with rule_type keys joined
  const groupIds = groupRows.map((g) => g.id);
  const rulesRow = await admin
    .from("rules")
    .select("id, rule_group_id, rule_type_id, config_jsonb, order_index")
    .in("rule_group_id", groupIds)
    .eq("is_active", true)
    .order("order_index", { ascending: true });
  if (rulesRow.error) {
    fail("load rules", rulesRow.error.message);
  }
  const ruleRows = rulesRow.data ?? [];
  if (ruleRows.length !== 4) {
    fail("rules count", `expected 4 supported-subset rules but loaded ${ruleRows.length}`);
  }

  const ruleTypeIds = [...new Set(ruleRows.map((r) => r.rule_type_id))];
  const ruleTypesRow = await admin
    .from("rule_types")
    .select("id, key")
    .in("id", ruleTypeIds);
  if (ruleTypesRow.error) {
    fail("load rule_types", ruleTypesRow.error.message);
  }
  const ruleTypeMap = new Map<string, string>(
    (ruleTypesRow.data ?? []).map((rt) => [rt.id, rt.key]),
  );

  const rulesByGroup = new Map<string, ResolvedDirectEvaluationRule[]>();
  for (const r of ruleRows) {
    const ruleTypeKey = ruleTypeMap.get(r.rule_type_id);
    if (!ruleTypeKey) {
      fail("rule_type lookup", `rule ${r.id} references unknown rule_type_id ${r.rule_type_id}`);
    }
    const list = rulesByGroup.get(r.rule_group_id) ?? [];
    list.push({
      ruleId: r.id,
      ruleTypeKey,
      ruleConfig: r.config_jsonb,
      orderIndex: r.order_index,
    });
    rulesByGroup.set(r.rule_group_id, list);
  }

  const ruleGroups: ResolvedDirectEvaluationRuleGroup[] = groupRows.map((g) => ({
    ruleGroupId: g.id,
    groupKey: g.group_key,
    groupSeverity: g.group_severity,
    groupEvaluationMode: g.evaluation_mode,
    orderIndex: g.order_index,
    rules: rulesByGroup.get(g.id) ?? [],
  }));

  pass(
    "load resolved rule context",
    `${ruleGroups.length} group(s), ${ruleRows.length} rule(s)`,
  );

  return {
    workspace,
    target,
    qualificationDefinition,
    rawProfile,
    normalizedProfile,
    status: "supported",
    resolvedRuleSet,
    ruleGroups,
  };
}

// ---------------------------------------------------------------------------
// Step 6 — Build the British answer payload (Math A / Physics B / CS C, 2026)
// ---------------------------------------------------------------------------

function buildBritishAnswerPayload(countryId: string): BritishSubjectBasedAnswerPayload {
  return {
    header: {
      countryId,
      notesAr: null,
      curriculumLabel: "British A-Level",
      graduationYear: 2026,
      headerNotesAr: null,
    },
    subjects: [
      { subjectName: "Mathematics", subjectLevel: "A Level", grade: "A", notesAr: null },
      { subjectName: "Physics", subjectLevel: "A Level", grade: "B", notesAr: null },
      { subjectName: "Computer Science", subjectLevel: "A Level", grade: "C", notesAr: null },
    ],
  };
}

// ---------------------------------------------------------------------------
// Step 7 — Map runtime traces to persistence rows (replicates the same
// mapping logic used by runAndPersistDirectEvaluation, by composing the
// same dedicated explanation renderer)
// ---------------------------------------------------------------------------

const UNSUPPORTED_EXPLANATION_AR =
  "تم تخطي القاعدة — نوع القاعدة غير مدعوم حاليًا في شرح التتبع.";

function resolveTraceExplanationAr(rule: DirectEvaluationRuleExecution): string {
  switch (rule.ruleTypeKey) {
    case "minimum_subject_count":
      return renderDirectEvaluationRuleTraceExplanation({
        ruleTypeKey: rule.ruleTypeKey,
        outcome: rule.outcome,
        matchedCount: rule.matchedCount,
        requiredCount: rule.requiredCount,
      }).explanationAr;
    case "required_subject_exists":
      return renderDirectEvaluationRuleTraceExplanation({
        ruleTypeKey: rule.ruleTypeKey,
        outcome: rule.outcome,
        matchedSubjectName: rule.matchedSubjectName,
        requiredSubjectNames: rule.requiredSubjectNames,
      }).explanationAr;
    case "minimum_subject_grade":
      return renderDirectEvaluationRuleTraceExplanation({
        ruleTypeKey: rule.ruleTypeKey,
        outcome: rule.outcome,
        matchedSubjectName: rule.matchedSubjectName,
        matchedGradeValue: rule.matchedGradeValue,
        requiredMinimumGradeValue: rule.requiredMinimumGradeValue,
      }).explanationAr;
    case "minimum_overall_grade":
      return renderDirectEvaluationRuleTraceExplanation({
        ruleTypeKey: rule.ruleTypeKey,
        outcome: rule.outcome,
        actualValue: rule.actualValue,
        requiredMinimumValue: rule.requiredMinimumValue,
      }).explanationAr;
    case "accepted_qualification_type":
      return renderDirectEvaluationRuleTraceExplanation({
        ruleTypeKey: rule.ruleTypeKey,
        outcome: rule.outcome,
        actualQualificationTypeKey: rule.actualQualificationTypeKey,
        acceptedQualificationTypeKeys: rule.acceptedQualificationTypeKeys,
      }).explanationAr;
    default:
      return UNSUPPORTED_EXPLANATION_AR;
  }
}

function buildPersistenceTraces(
  ruleSetVersionId: string,
  groupExecutions: readonly DirectEvaluationRuleGroupExecution[],
  resolvedGroups: readonly ResolvedDirectEvaluationRuleGroup[],
): PersistEvaluationRuleTraceRowInput[] {
  const traces: PersistEvaluationRuleTraceRowInput[] = [];
  for (const group of groupExecutions) {
    const resolvedGroup = resolvedGroups.find((g) => g.ruleGroupId === group.ruleGroupId);
    if (!resolvedGroup) {
      fail("trace mapping", `group ${group.ruleGroupId} not in resolved groups`);
    }
    for (const rule of group.ruleExecutions) {
      traces.push({
        rule_set_version_id: ruleSetVersionId,
        rule_group_id: group.ruleGroupId,
        rule_id: rule.ruleId,
        rule_type_key_snapshot: rule.ruleTypeKey,
        group_severity_snapshot: group.groupSeverity,
        group_evaluation_mode_snapshot: group.groupEvaluationMode,
        outcome: rule.outcome,
        explanation_ar: resolveTraceExplanationAr(rule),
      });
    }
  }
  return traces;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n=== Direct Evaluation demo smoke (Constructor CS / British A-Level) ===\n");
  console.log(`Supabase URL:     ${SUPABASE_URL}`);
  console.log(`Hostname guard:   PASS (${urlHostname})`);
  console.log(`NODE_ENV guard:   PASS (${process.env.NODE_ENV ?? "<unset>"})\n`);

  // 1. Resolve advisor identity (must come from seed)
  const advisorAuthId = await resolveAdvisorAuthId();

  // 2. Build typed structures from admin SELECTs
  const workspace = await loadWorkspace(advisorAuthId);
  const target = await loadTargetContext(workspace);
  const qualificationDefinition = await loadQualificationDefinition(workspace);

  // 3. Assemble + normalize the British raw profile (pure)
  const payload = buildBritishAnswerPayload(target.country.id);
  const rawProfile = assembleValidatedBritishSubjectBasedRawProfile(
    qualificationDefinition,
    payload,
  );
  pass("assembleValidatedBritishSubjectBasedRawProfile", `${rawProfile.subjects.length} subjects`);

  const prepared = prepareValidatedBritishDirectEvaluation({
    target,
    assembled: {
      workspace,
      qualificationDefinition,
      rawProfile,
    },
  });
  pass("prepareValidatedBritishDirectEvaluation");

  // Sanity: normalized Mathematics grade must be 7 (A on ordinal scale).
  // The normalized profile preserves the raw subjectName ("Mathematics"); the
  // per-rule evaluators apply their own subject-name normalization at lookup time.
  const mathSubject = prepared.normalizedProfile.subjects.find(
    (s) => s.subjectName.trim().toLowerCase() === "mathematics",
  );
  if (!mathSubject) {
    fail("normalized profile", "Mathematics not found after normalization");
  }
  if (mathSubject.normalizedGradeValue !== 7) {
    fail(
      "normalized Mathematics normalizedGradeValue",
      `expected 7 (A on ordinal scale) but got ${mathSubject.normalizedGradeValue}`,
    );
  }
  if (mathSubject.segmentKey !== "a_level") {
    fail(
      "normalized Mathematics segmentKey",
      `expected "a_level" but got "${mathSubject.segmentKey}"`,
    );
  }
  pass(
    "normalized Mathematics gradeValue + segmentKey",
    "normalizedGradeValue=7 (A), segmentKey=a_level",
  );

  // 4. Build resolved rule context, then execute
  const resolvedContext = await loadResolvedRuleContext(
    workspace,
    target,
    qualificationDefinition,
    prepared.rawProfile,
    prepared.normalizedProfile,
  );

  const execution = executeDirectEvaluationRuleContext({
    prepared,
    resolvedContext,
  });
  pass(
    "executeDirectEvaluationRuleContext",
    `${execution.groupExecutions.length} group(s) executed`,
  );

  if (execution.groupExecutions.length !== 1) {
    fail("group count", `expected 1 group but got ${execution.groupExecutions.length}`);
  }

  const group = execution.groupExecutions[0];
  if (group.ruleExecutions.length !== 4) {
    fail(
      "rule executions count",
      `expected 4 rules but got ${group.ruleExecutions.length}`,
    );
  }

  for (const rule of group.ruleExecutions) {
    if (rule.outcome !== "passed") {
      fail(
        `rule ${rule.ruleTypeKey} (${rule.ruleId}) outcome`,
        `expected "passed" but got "${rule.outcome}"`,
      );
    }
  }
  pass("all 4 supported rules passed", group.ruleExecutions.map((r) => r.ruleTypeKey).join(", "));

  // Specific assertions for the minimum_subject_grade Mathematics trace.
  // Evaluator returns the raw subjectName ("Mathematics") on match — compare
  // case-insensitively after trimming.
  const mathGradeTrace = group.ruleExecutions.find(
    (r) =>
      r.ruleTypeKey === "minimum_subject_grade" &&
      typeof r.matchedSubjectName === "string" &&
      r.matchedSubjectName.trim().toLowerCase() === "mathematics",
  );
  if (!mathGradeTrace) {
    fail(
      "minimum_subject_grade Mathematics trace",
      "no minimum_subject_grade trace matched mathematics",
    );
  }
  if (mathGradeTrace.matchedGradeValue !== 7) {
    fail(
      "minimum_subject_grade.matchedGradeValue",
      `expected 7 but got ${mathGradeTrace.matchedGradeValue}`,
    );
  }
  if (mathGradeTrace.requiredMinimumGradeValue !== 5) {
    fail(
      "minimum_subject_grade.requiredMinimumGradeValue",
      `expected 5 but got ${mathGradeTrace.requiredMinimumGradeValue}`,
    );
  }
  pass(
    "minimum_subject_grade Mathematics trace",
    "matchedGradeValue=7, requiredMinimumGradeValue=5",
  );

  // 5. Result assembly + renderers
  const assembled = assembleDirectEvaluationResult({ execution });
  if (assembled.finalStatus !== "eligible") {
    fail("finalStatus", `expected "eligible" but got "${assembled.finalStatus}"`);
  }
  if (assembled.matchedRulesCount !== 4) {
    fail("matchedRulesCount", `expected 4 but got ${assembled.matchedRulesCount}`);
  }
  if (assembled.failedGroupsCount !== 0) {
    fail("failedGroupsCount", `expected 0 but got ${assembled.failedGroupsCount}`);
  }
  if (assembled.conditionalGroupsCount !== 0) {
    fail(
      "conditionalGroupsCount",
      `expected 0 but got ${assembled.conditionalGroupsCount}`,
    );
  }
  pass(
    "assembleDirectEvaluationResult",
    `finalStatus=eligible, matchedRulesCount=4, failedGroupsCount=0`,
  );

  const primaryReason = renderDirectEvaluationPrimaryReason({ assembled });
  if (primaryReason.primaryReasonKey !== "all_required_groups_satisfied") {
    fail(
      "primaryReasonKey",
      `expected "all_required_groups_satisfied" but got "${primaryReason.primaryReasonKey}"`,
    );
  }
  if (!primaryReason.primaryReasonAr || primaryReason.primaryReasonAr.length === 0) {
    fail("primaryReasonAr", "empty Arabic primary reason text");
  }
  pass("renderDirectEvaluationPrimaryReason", primaryReason.primaryReasonKey);

  const nextStep = renderDirectEvaluationNextStep({ assembled });
  if (!nextStep.nextStepAr || nextStep.nextStepAr.length === 0) {
    fail("nextStepAr", "empty Arabic next step text");
  }
  pass("renderDirectEvaluationNextStep");

  const advisoryNotes = renderDirectEvaluationAdvisoryNotes({ assembled });
  pass(
    "renderDirectEvaluationAdvisoryNotes",
    `${advisoryNotes.advisoryNotesAr.length} note(s)`,
  );

  // 6. Persistence — atomic RPC against real Postgres
  if (!resolvedContext.resolvedRuleSet) {
    fail("resolvedRuleSet", "expected resolved rule set but got null");
  }

  const persistInput: PersistDirectEvaluationRunInput = {
    run: {
      organization_id: workspace.workspace.orgContext.organizationId,
      actor_user_id: advisorAuthId,
      flow_type: "direct_evaluation",
      source_profile_id: null, // smoke does not exercise student_profiles linkage
      qualification_type_id: qualificationDefinition.qualificationType.id,
      normalized_profile_snapshot_jsonb: prepared.normalizedProfile,
      request_context_jsonb: {
        smoke: true,
        source: "scripts/smoke/direct-evaluation-demo-smoke.ts",
      },
    },
    result: {
      program_offering_id: target.offering.id,
      final_status: assembled.finalStatus,
      primary_reason_ar: primaryReason.primaryReasonAr,
      next_step_ar: nextStep.nextStepAr,
      tuition_amount_snapshot: target.offering.annualTuitionAmount,
      currency_code: target.offering.currencyCode,
      application_fee_snapshot: target.offering.applicationFeeAmount,
      extra_fee_note_snapshot_ar: target.offering.extraFeeNoteAr,
      scholarship_note_snapshot_ar: target.offering.scholarshipNoteAr,
      advisory_notes_jsonb:
        advisoryNotes.advisoryNotesAr.length > 0 ? advisoryNotes.advisoryNotesAr : null,
      sort_bucket: assembled.finalStatus,
      matched_rules_count: assembled.matchedRulesCount,
      failed_groups_count: assembled.failedGroupsCount,
      conditional_groups_count: assembled.conditionalGroupsCount,
      trace_summary_jsonb: assembled.groupExecutions,
    },
    ruleTraces: buildPersistenceTraces(
      resolvedContext.resolvedRuleSet.ruleSetVersionId,
      execution.groupExecutions,
      resolvedContext.ruleGroups,
    ),
  };

  if (persistInput.ruleTraces.length !== 4) {
    fail(
      "persistence trace input count",
      `expected 4 traces but got ${persistInput.ruleTraces.length}`,
    );
  }

  const persistence = await persistDirectEvaluationRun({
    supabase: admin,
    input: persistInput,
  });

  if (!persistence.evaluationRunId) {
    fail("persistence.evaluationRunId", "missing");
  }
  if (!persistence.evaluationResultId) {
    fail("persistence.evaluationResultId", "missing");
  }
  if (persistence.persistedRuleTraceCount !== 4) {
    fail(
      "persistence.persistedRuleTraceCount",
      `expected 4 but got ${persistence.persistedRuleTraceCount}`,
    );
  }
  pass(
    "persistDirectEvaluationRun (atomic RPC)",
    `runId=${persistence.evaluationRunId}, resultId=${persistence.evaluationResultId}, traces=${persistence.persistedRuleTraceCount}`,
  );

  // 7. Summary
  console.log("\n--- Summary ---");
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;
  console.log(`PASS: ${okCount}`);
  console.log(`FAIL: ${failCount}`);

  if (failCount > 0) {
    console.error("\nSmoke FAILED.");
    process.exit(1);
  }

  console.log("\nDirect Evaluation demo smoke completed successfully.");
}

main().catch((err) => {
  console.error("\nFATAL during smoke:", err);
  process.exit(1);
});
