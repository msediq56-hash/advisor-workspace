/**
 * Milestone 2B — Constructor University Computer Science Bachelor seed.
 *
 * Seeds the supported-subset Constructor University demo data into a
 * local Supabase database for direct-evaluation demos.
 *
 * SCOPE — supported-subset only:
 *   - University:   Constructor University (Bremen, Germany, private)
 *   - Program:      Computer Science — Bachelor
 *   - Offering:     Fall 2026, Bremen, EUR 20,000/year, no application fee
 *   - Qualification path: British A-Level
 *   - Rule set:     "supported subset" — does NOT enforce full Constructor admission logic
 *
 * SUPPORTED rules in this seed (4):
 *   1. accepted_qualification_type    — accepts british_a_level
 *   2. minimum_subject_count          — at least 3 A-Level subjects, each ≥ C (ordinal 5)
 *   3. required_subject_exists        — Mathematics A-Level present
 *   4. minimum_subject_grade          — Mathematics ≥ C (ordinal 5) — kept for advisor explainability
 *
 * DEFERRED Constructor requirements (NOT enforced by this seed):
 *   - At least 2 A-Level subjects from the core/recognized list
 *   - One additional Pattern B subject from {Biology, Chemistry, Physics, Computer Science}
 *     beyond Mathematics
 *   - IELTS / Duolingo / language requirement
 *   - Redirect-to-IFY behavior on partial A-Level grade failure
 *   - Arabic secondary SAT / language / certificate logic
 *   - Scholarship / GPA advisory tiers
 *
 * GRADE SCALE:
 *   The British normalizer is canonical. Ordinal scale 0–8:
 *     A* = 8, A = 7, B = 6, C = 5, D = 4, E = 3, F = 2, G = 1, U = 0
 *   Therefore "C or above" = numeric value 5.
 *
 * USAGE:
 *   1. npx supabase db reset
 *   2. npx tsx scripts/seed/demo-seed.ts
 *
 * SAFETY:
 *   This script refuses to run unless SUPABASE_URL hostname is
 *   localhost or 127.0.0.1, and refuses if NODE_ENV === "production".
 *   It uses the Supabase service_role admin client and bypasses RLS
 *   for inserts. It is local-development only.
 *
 * IDEMPOTENCY:
 *   Safe to run multiple times without `db reset`. All non-auth rows
 *   use fixed UUIDs and upsert by primary key. The auth user is
 *   created once and reused on subsequent runs.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Safety guards — must run before any client construction or DB access
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === "production") {
  console.error("FATAL: Refusing to run demo seed in NODE_ENV=production.");
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
      "This seed script refuses to run against non-localhost databases.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Fixed UUIDs (all use the suffix pattern …d?? for visibility in logs/queries)
// ---------------------------------------------------------------------------

const ID = {
  // Reference data
  countryDE: "00000000-0000-0000-0000-000000000d01",
  universityTypePrivate: "00000000-0000-0000-0000-000000000d02",
  degreeBachelor: "00000000-0000-0000-0000-000000000d03",

  // Catalog (platform-owned)
  university: "00000000-0000-0000-0000-000000000d10",
  program: "00000000-0000-0000-0000-000000000d11",
  programOffering: "00000000-0000-0000-0000-000000000d12",

  // Identity / org
  organization: "00000000-0000-0000-0000-000000000d20",
  membership: "00000000-0000-0000-0000-000000000d21",
  organizationOfferingSettings: "00000000-0000-0000-0000-000000000d22",

  // Qualification
  qualFamilyBritish: "00000000-0000-0000-0000-000000000d30",
  qualTypeBritishALevel: "00000000-0000-0000-0000-000000000d31",
  qualQuestionSet: "00000000-0000-0000-0000-000000000d32",
  qualQuestion: "00000000-0000-0000-0000-000000000d33",

  // Rule types (5 — only the existing supported types)
  ruleTypeMinSubjectCount: "00000000-0000-0000-0000-000000000d40",
  ruleTypeRequiredSubjectExists: "00000000-0000-0000-0000-000000000d41",
  ruleTypeMinSubjectGrade: "00000000-0000-0000-0000-000000000d42",
  ruleTypeMinOverallGrade: "00000000-0000-0000-0000-000000000d43",
  ruleTypeAcceptedQualType: "00000000-0000-0000-0000-000000000d44",

  // Rule registry (the supported-subset rule set)
  ruleSet: "00000000-0000-0000-0000-000000000d50",
  ruleSetVersion: "00000000-0000-0000-0000-000000000d51",
  ruleGroup: "00000000-0000-0000-0000-000000000d52",
  ruleAcceptedQualType: "00000000-0000-0000-0000-000000000d61",
  ruleMinSubjectCount: "00000000-0000-0000-0000-000000000d62",
  ruleRequiredSubjectExists: "00000000-0000-0000-0000-000000000d63",
  ruleMinSubjectGrade: "00000000-0000-0000-0000-000000000d64",

  // Student profile (sample, same-org). Exists only so the route-level smoke
  // can exercise the matching-org sourceProfileId happy path against the
  // ownership guard. NOT a student dashboard, application tracking, or CRM
  // surface — it is a single root row whose only consumers are:
  //   1. invokeDirectEvaluationWorkflow's sourceProfileId ownership guard
  //      (reads only `student_profiles.organization_id`), and
  //   2. the FK target for evaluation_runs.source_profile_id at insert time.
  // No student_profile_answers / student_profile_subjects rows are created.
  studentProfile: "00000000-0000-0000-0000-000000000d70",
} as const;

// ---------------------------------------------------------------------------
// Demo advisor identity
// ---------------------------------------------------------------------------

const ADVISOR_EMAIL = "advisor@constructor-demo.local";
const ADVISOR_PASSWORD = "constructor-demo-pass-2026";

// ---------------------------------------------------------------------------
// Admin client (service_role bypasses RLS)
// ---------------------------------------------------------------------------

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const results: { step: string; ok: boolean; detail?: string }[] = [];

function pass(step: string, detail?: string) {
  results.push({ step, ok: true, detail });
  console.log(`  PASS  ${step}${detail ? ` — ${detail}` : ""}`);
}

function fail(step: string, detail: string): never {
  results.push({ step, ok: false, detail });
  console.log(`  FAIL  ${step} — ${detail}`);
  throw new Error(`Seed step failed: ${step} — ${detail}`);
}

/**
 * Idempotent upsert by primary key id. Inserts if missing, no-ops if exists
 * with the same row, otherwise updates the mutable fields.
 *
 * Uses the service_role admin client — bypasses RLS.
 */
async function upsertById(
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  const id = row.id;
  if (typeof id !== "string") {
    fail(
      `upsertById ${table}`,
      `row.id must be a string but got ${typeof id}`,
    );
  }
  const { error } = await admin.from(table).upsert(row, {
    onConflict: "id",
    ignoreDuplicates: false,
  });
  if (error) {
    fail(`upsert ${table} (${id})`, error.message);
  }
}

/**
 * Resolve the auth user id for the demo advisor: create if missing,
 * otherwise reuse the existing user. Returns the canonical auth.users.id.
 */
async function resolveAdvisorAuthId(): Promise<string> {
  // Try to create
  const createResult = await admin.auth.admin.createUser({
    email: ADVISOR_EMAIL,
    password: ADVISOR_PASSWORD,
    email_confirm: true,
  });

  if (createResult.data?.user?.id) {
    pass(
      "auth.admin.createUser advisor",
      `created auth user ${createResult.data.user.id}`,
    );
    return createResult.data.user.id;
  }

  // If creation failed, look up by email (idempotent re-run path)
  const message = createResult.error?.message ?? "unknown error";
  if (
    message.toLowerCase().includes("already") ||
    message.toLowerCase().includes("exists") ||
    message.toLowerCase().includes("registered")
  ) {
    const list = await admin.auth.admin.listUsers();
    if (list.error || !list.data?.users) {
      fail("auth.admin.listUsers fallback", list.error?.message ?? "no users");
    }
    const existing = list.data.users.find(
      (u) => u.email?.toLowerCase() === ADVISOR_EMAIL.toLowerCase(),
    );
    if (!existing) {
      fail(
        "advisor lookup",
        `auth user with email ${ADVISOR_EMAIL} could not be found after create-failed`,
      );
    }
    pass(
      "advisor auth user already existed",
      `reusing auth user ${existing.id}`,
    );
    return existing.id;
  }

  fail("auth.admin.createUser advisor", message);
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function seedReferenceData() {
  await upsertById("countries", {
    id: ID.countryDE,
    code: "DE",
    name_ar: "ألمانيا",
    is_active: true,
  });
  pass("seed countries (DE)");

  await upsertById("university_types", {
    id: ID.universityTypePrivate,
    key: "private",
    name_ar: "خاصة",
    is_active: true,
  });
  pass("seed university_types (private)");

  await upsertById("degrees", {
    id: ID.degreeBachelor,
    key: "bachelor",
    name_ar: "بكالوريوس",
    level_rank: 1,
    is_active: true,
  });
  pass("seed degrees (bachelor)");
}

async function seedCatalog() {
  await upsertById("universities", {
    id: ID.university,
    owner_scope: "platform",
    owner_organization_id: null,
    country_id: ID.countryDE,
    university_type_id: ID.universityTypePrivate,
    name_ar: "جامعة كونستركتر",
    name_en: "Constructor University",
    is_active: true,
  });
  pass("seed universities (Constructor University)");

  await upsertById("programs", {
    id: ID.program,
    owner_scope: "platform",
    owner_organization_id: null,
    university_id: ID.university,
    faculty_id: null,
    degree_id: ID.degreeBachelor,
    program_code: null,
    title_ar: "علوم الحاسوب",
    title_en: "Computer Science",
    canonical_search_title_ar: "علوم الحاسوب",
    is_active: true,
  });
  pass("seed programs (Computer Science Bachelor)");

  await upsertById("program_offerings", {
    id: ID.programOffering,
    owner_scope: "platform",
    owner_organization_id: null,
    program_id: ID.program,
    intake_label_ar: "خريف 2026",
    intake_term_key: "fall",
    intake_year: 2026,
    campus_name_ar: "Bremen / بريمن",
    study_mode_key: "full_time",
    duration_months: null,
    teaching_language_key: "en",
    annual_tuition_amount: 20000,
    currency_code: "EUR",
    application_fee_amount: 0,
    extra_fee_note_ar: null,
    scholarship_note_ar: null,
    is_active: true,
  });
  pass("seed program_offerings (CS Fall 2026 Bremen 20000 EUR)");
}

async function seedOrganization(advisorAuthId: string) {
  await upsertById("organizations", {
    id: ID.organization,
    slug: "constructor-demo-org",
    name_ar: "منظمة عرض كونستركتر",
    status: "active",
  });
  pass("seed organizations (constructor-demo-org)");

  await upsertById("user_profiles", {
    id: advisorAuthId,
    full_name: "Constructor Demo Advisor",
    email_normalized: ADVISOR_EMAIL,
    is_active: true,
  });
  pass("seed user_profiles (advisor) — id matches auth user id");

  // organization_memberships UNIQUE on (organization_id, user_id) — explicit row id keeps idempotency
  await upsertById("organization_memberships", {
    id: ID.membership,
    organization_id: ID.organization,
    user_id: advisorAuthId,
    role_key: "advisor",
    membership_status: "active",
  });
  pass("seed organization_memberships (advisor → constructor-demo-org)");

  // organization_offering_settings activates the offering for the org's effective catalog.
  // Even though this smoke skips the catalog browse, the overlay row is required so
  // future browse-based demos work without further seeding.
  await upsertById("organization_offering_settings", {
    id: ID.organizationOfferingSettings,
    organization_id: ID.organization,
    program_offering_id: ID.programOffering,
    visibility_status: "active",
    tuition_override_amount: null,
    application_fee_override_amount: null,
    extra_fee_note_override_ar: null,
    scholarship_note_override_ar: null,
    internal_note_ar: null,
  });
  pass("seed organization_offering_settings (overlay → CS offering)");

}

async function seedSampleStudentProfile(advisorAuthId: string) {
  // Sample same-org student_profiles row for the route-level smoke's
  // matching-org sourceProfileId happy path. The route's ownership guard
  // (src/modules/evaluation/invoke-direct-evaluation-workflow.ts) reads only
  // `organization_id`; the runtime evaluates the request payload, not the
  // saved profile content. Therefore no `student_profile_answers` or
  // `student_profile_subjects` rows are needed and none are created.
  // `profile_status` defaults to 'draft', `created_at` / `updated_at` to now().
  //
  // Must run AFTER seedOrganization (org + user_profile) and
  // seedQualification (qualification_types) because of FKs:
  //   - student_profiles.organization_id        → organizations(id)
  //   - student_profiles.created_by_user_id     → user_profiles(id)
  //   - student_profiles.qualification_type_id  → qualification_types(id)
  await upsertById("student_profiles", {
    id: ID.studentProfile,
    organization_id: ID.organization,
    created_by_user_id: advisorAuthId,
    profile_kind: "sample",
    qualification_type_id: ID.qualTypeBritishALevel,
    title_ar: "ملف عرض - علوم الحاسوب (British A-Level)",
  });
  pass(
    "seed student_profiles (sample, same-org, owned by advisor) — route-smoke ownership target",
  );
}

async function seedQualification() {
  await upsertById("qualification_families", {
    id: ID.qualFamilyBritish,
    key: "british_curriculum",
    name_ar: "المنهج البريطاني",
    academic_stage_key: "secondary",
    is_active: true,
  });
  pass("seed qualification_families (british_curriculum)");

  await upsertById("qualification_types", {
    id: ID.qualTypeBritishALevel,
    owner_scope: "platform",
    owner_organization_id: null,
    family_id: ID.qualFamilyBritish,
    key: "british_a_level",
    name_ar: "بريطاني A-Level",
    complexity_model: "subject_based",
    is_active: true,
  });
  pass("seed qualification_types (british_a_level)");

  await upsertById("qualification_question_sets", {
    id: ID.qualQuestionSet,
    qualification_type_id: ID.qualTypeBritishALevel,
    version_number: 1,
    is_active: true,
  });
  pass("seed qualification_question_sets (v1)");

  // Minimal placeholder question — British raw profile is built from header+subjects,
  // not from question answers, so this row exists for schema completeness only.
  await upsertById("qualification_questions", {
    id: ID.qualQuestion,
    question_set_id: ID.qualQuestionSet,
    field_key: "british_subjects_payload",
    label_ar: "مواد الـ A-Level (تُجمَّع من رؤوس الموضوعات)",
    input_type: "subject_based",
    is_required: true,
    order_index: 0,
    help_text_ar: null,
    config_jsonb: null,
    visibility_rule_jsonb: null,
    is_active: true,
  });
  pass("seed qualification_questions (placeholder for British subject-based)");
}

async function seedRuleTypes() {
  // The 5 rule types currently supported by the runtime.
  // config_schema_jsonb is permissive ({}) — actual config validation lives in the evaluator code.
  const ruleTypes = [
    {
      id: ID.ruleTypeAcceptedQualType,
      key: "accepted_qualification_type",
      name_ar: "نوع الشهادة المقبول",
      evaluator_key: "accepted_qualification_type",
      supported_target_scopes_jsonb: ["offering", "program", "university"],
      supported_complexity_models_jsonb: ["subject_based", "simple_form"],
      allowed_group_severities_jsonb: ["blocking", "review", "conditional", "advisory"],
    },
    {
      id: ID.ruleTypeMinSubjectCount,
      key: "minimum_subject_count",
      name_ar: "الحد الأدنى لعدد المواد",
      evaluator_key: "minimum_subject_count",
      supported_target_scopes_jsonb: ["offering", "program"],
      supported_complexity_models_jsonb: ["subject_based"],
      allowed_group_severities_jsonb: ["blocking", "review", "conditional"],
    },
    {
      id: ID.ruleTypeRequiredSubjectExists,
      key: "required_subject_exists",
      name_ar: "وجود المادة المطلوبة",
      evaluator_key: "required_subject_exists",
      supported_target_scopes_jsonb: ["offering", "program"],
      supported_complexity_models_jsonb: ["subject_based"],
      allowed_group_severities_jsonb: ["blocking", "review", "conditional", "advisory"],
    },
    {
      id: ID.ruleTypeMinSubjectGrade,
      key: "minimum_subject_grade",
      name_ar: "الحد الأدنى لدرجة المادة",
      evaluator_key: "minimum_subject_grade",
      supported_target_scopes_jsonb: ["offering", "program"],
      supported_complexity_models_jsonb: ["subject_based"],
      allowed_group_severities_jsonb: ["blocking", "review", "conditional", "advisory"],
    },
    {
      id: ID.ruleTypeMinOverallGrade,
      key: "minimum_overall_grade",
      name_ar: "الحد الأدنى للمعدل العام",
      evaluator_key: "minimum_overall_grade",
      supported_target_scopes_jsonb: ["offering", "program"],
      supported_complexity_models_jsonb: ["simple_form"],
      allowed_group_severities_jsonb: ["blocking", "review", "conditional", "advisory"],
    },
  ];

  for (const rt of ruleTypes) {
    await upsertById("rule_types", {
      ...rt,
      config_schema_jsonb: {},
      is_active: true,
    });
  }
  pass("seed rule_types (5 supported types)");
}

async function seedRuleRegistry(advisorAuthId: string) {
  const ruleSetDescriptionAr =
    "مجموعة قواعد فرعية مدعومة فقط — لا تطبّق المنطق الكامل لقبول جامعة كونستركتر. " +
    "غير منفّذ في هذا الـ seed: " +
    "(1) شرط مادتين على الأقل من القائمة الأساسية (Math/Bio/Chem/Phys/CS/Lang/Hist/Geo/Pol/Econ)، " +
    "(2) شرط النمط B الإضافي (مادة من Bio/Chem/Phys/CS بخلاف Mathematics)، " +
    "(3) شرط اللغة (IELTS/Duolingo)، " +
    "(4) منطق التحويل إلى IFY عند فشل جزئي في درجات A-Level، " +
    "(5) منطق الشهادات العربية (SAT/IELTS/شهادة ثانوية)، " +
    "(6) المعدل التراكمي / المنح الاستشارية. " +
    "لا تستخدم هذا الـ seed كأساس لقرار قبول حقيقي.";

  await upsertById("rule_sets", {
    id: ID.ruleSet,
    owner_scope: "platform",
    owner_organization_id: null,
    target_scope: "offering",
    target_university_id: null,
    target_program_id: null,
    target_program_offering_id: ID.programOffering,
    qualification_type_id: ID.qualTypeBritishALevel,
    name_ar: "Constructor Computer Science Bachelor — British A-Level (supported subset)",
    description_ar: ruleSetDescriptionAr,
    priority_order: 0,
    is_active: true,
  });
  pass("seed rule_sets (supported subset)");

  await upsertById("rule_set_versions", {
    id: ID.ruleSetVersion,
    rule_set_id: ID.ruleSet,
    version_number: 1,
    lifecycle_status: "published",
    based_on_version_id: null,
    change_summary_ar: "النسخة الأولى — المجموعة الفرعية المدعومة من شروط القبول.",
    created_by_user_id: advisorAuthId,
    published_by_user_id: advisorAuthId,
    published_at: new Date().toISOString(),
  });
  pass("seed rule_set_versions (v1 published)");

  await upsertById("rule_groups", {
    id: ID.ruleGroup,
    rule_set_version_id: ID.ruleSetVersion,
    group_key: "academic_eligibility_supported_subset",
    label_ar: "الأهلية الأكاديمية — المجموعة الفرعية المدعومة",
    evaluation_mode: "all_required",
    group_severity: "blocking",
    order_index: 0,
  });
  pass("seed rule_groups (blocking, all_required)");

  // The four supported-subset rules. Configs use the runtime ordinal grade scale
  // (C = 5). See header comment for rationale.
  await upsertById("rules", {
    id: ID.ruleAcceptedQualType,
    rule_group_id: ID.ruleGroup,
    rule_type_id: ID.ruleTypeAcceptedQualType,
    config_jsonb: { acceptedQualificationTypeKeys: ["british_a_level"] },
    message_override_ar: null,
    order_index: 0,
    is_active: true,
  });
  await upsertById("rules", {
    id: ID.ruleMinSubjectCount,
    rule_group_id: ID.ruleGroup,
    rule_type_id: ID.ruleTypeMinSubjectCount,
    config_jsonb: {
      minimumCount: 3,
      segmentKeys: ["a_level"],
      minimumNormalizedGradeValue: 5,
    },
    message_override_ar: null,
    order_index: 1,
    is_active: true,
  });
  await upsertById("rules", {
    id: ID.ruleRequiredSubjectExists,
    rule_group_id: ID.ruleGroup,
    rule_type_id: ID.ruleTypeRequiredSubjectExists,
    config_jsonb: { subjectNamesNormalized: ["mathematics"] },
    message_override_ar: null,
    order_index: 2,
    is_active: true,
  });
  await upsertById("rules", {
    id: ID.ruleMinSubjectGrade,
    rule_group_id: ID.ruleGroup,
    rule_type_id: ID.ruleTypeMinSubjectGrade,
    config_jsonb: {
      subjectNameNormalized: "mathematics",
      minimumGradeValue: 5,
    },
    message_override_ar: null,
    order_index: 3,
    is_active: true,
  });
  pass("seed rules (4 supported-subset rules)");
}

// ---------------------------------------------------------------------------
// Verification — confirm key invariants after seeding
// ---------------------------------------------------------------------------

async function verifyAdvisorIdentityMatches(advisorAuthId: string) {
  // Confirm user_profiles.id === auth.users.id
  const profile = await admin
    .from("user_profiles")
    .select("id, email_normalized")
    .eq("id", advisorAuthId)
    .maybeSingle();
  if (profile.error || !profile.data) {
    fail(
      "verify advisor user_profile",
      profile.error?.message ?? "user_profiles row missing for advisor auth id",
    );
  }
  if (profile.data.id !== advisorAuthId) {
    fail(
      "verify user_profiles.id == auth.users.id",
      `id mismatch: ${profile.data.id} != ${advisorAuthId}`,
    );
  }
  pass("verify user_profiles.id == auth.users.id");
}

async function verifyExpectedRows() {
  const checks: { table: string; id: string }[] = [
    { table: "countries", id: ID.countryDE },
    { table: "university_types", id: ID.universityTypePrivate },
    { table: "degrees", id: ID.degreeBachelor },
    { table: "universities", id: ID.university },
    { table: "programs", id: ID.program },
    { table: "program_offerings", id: ID.programOffering },
    { table: "organizations", id: ID.organization },
    { table: "organization_memberships", id: ID.membership },
    { table: "organization_offering_settings", id: ID.organizationOfferingSettings },
    { table: "qualification_families", id: ID.qualFamilyBritish },
    { table: "qualification_types", id: ID.qualTypeBritishALevel },
    { table: "qualification_question_sets", id: ID.qualQuestionSet },
    { table: "qualification_questions", id: ID.qualQuestion },
    { table: "rule_types", id: ID.ruleTypeAcceptedQualType },
    { table: "rule_types", id: ID.ruleTypeMinSubjectCount },
    { table: "rule_types", id: ID.ruleTypeRequiredSubjectExists },
    { table: "rule_types", id: ID.ruleTypeMinSubjectGrade },
    { table: "rule_types", id: ID.ruleTypeMinOverallGrade },
    { table: "rule_sets", id: ID.ruleSet },
    { table: "rule_set_versions", id: ID.ruleSetVersion },
    { table: "rule_groups", id: ID.ruleGroup },
    { table: "rules", id: ID.ruleAcceptedQualType },
    { table: "rules", id: ID.ruleMinSubjectCount },
    { table: "rules", id: ID.ruleRequiredSubjectExists },
    { table: "rules", id: ID.ruleMinSubjectGrade },
    { table: "student_profiles", id: ID.studentProfile },
  ];

  for (const c of checks) {
    const r = await admin.from(c.table).select("id").eq("id", c.id).maybeSingle();
    if (r.error || !r.data) {
      fail(
        `verify ${c.table} (${c.id})`,
        r.error?.message ?? "row missing after seed",
      );
    }
  }
  pass(`verify all ${checks.length} seeded rows present by id`);
}

async function verifyRuleConfigs() {
  // Confirm the 4 supported-subset rule configs are exactly as specified
  const expectedConfigs: Record<string, unknown> = {
    [ID.ruleAcceptedQualType]: {
      acceptedQualificationTypeKeys: ["british_a_level"],
    },
    [ID.ruleMinSubjectCount]: {
      minimumCount: 3,
      segmentKeys: ["a_level"],
      minimumNormalizedGradeValue: 5,
    },
    [ID.ruleRequiredSubjectExists]: { subjectNamesNormalized: ["mathematics"] },
    [ID.ruleMinSubjectGrade]: {
      subjectNameNormalized: "mathematics",
      minimumGradeValue: 5,
    },
  };

  for (const [ruleId, expected] of Object.entries(expectedConfigs)) {
    const r = await admin
      .from("rules")
      .select("id, config_jsonb")
      .eq("id", ruleId)
      .maybeSingle();
    if (r.error || !r.data) {
      fail(`verify rule ${ruleId}`, r.error?.message ?? "rule missing");
    }
    if (!isJsonSemanticallyEqual(r.data.config_jsonb, expected)) {
      fail(
        `verify rule config (${ruleId})`,
        `expected ${JSON.stringify(expected)} but got ${JSON.stringify(r.data.config_jsonb)}`,
      );
    }
  }
  pass("verify 4 supported-subset rule configs match the runtime-ordinal scale");
}

/**
 * Semantic deep-equality for JSON values produced by Postgres `jsonb`.
 *
 * Postgres `jsonb` does NOT preserve key insertion order — keys may be
 * returned in any order. A literal `JSON.stringify` comparison therefore
 * incorrectly flags equal objects as different when keys round-trip in
 * a different order than the seed wrote them.
 *
 * Rules:
 *   - primitives (string/number/boolean/null): compare with ===
 *   - arrays: order-sensitive, element-wise recursive compare
 *   - plain objects: same own-key set, values recursive-equal regardless of key order
 *   - any other type (function, undefined, Date, etc.): not expected from JSON;
 *     return false to be safe
 */
function isJsonSemanticallyEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a === null || b === null) return a === b;

  const ta = typeof a;
  const tb = typeof b;
  if (ta !== tb) return false;

  if (ta === "number" || ta === "string" || ta === "boolean") {
    return a === b;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isJsonSemanticallyEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (ta !== "object") return false;

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bo, key)) return false;
    if (!isJsonSemanticallyEqual(ao[key], bo[key])) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n=== Constructor University demo seed ===\n");
  console.log(`Supabase URL:     ${SUPABASE_URL}`);
  console.log(`Hostname guard:   PASS (${urlHostname})`);
  console.log(`NODE_ENV guard:   PASS (${process.env.NODE_ENV ?? "<unset>"})\n`);

  const advisorAuthId = await resolveAdvisorAuthId();

  await seedReferenceData();
  await seedCatalog();
  await seedOrganization(advisorAuthId);
  await seedQualification();
  await seedRuleTypes();
  await seedRuleRegistry(advisorAuthId);
  await seedSampleStudentProfile(advisorAuthId);

  await verifyAdvisorIdentityMatches(advisorAuthId);
  await verifyExpectedRows();
  await verifyRuleConfigs();

  console.log("\n--- Summary ---");
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;
  console.log(`PASS: ${okCount}`);
  console.log(`FAIL: ${failCount}`);

  if (failCount > 0) {
    console.error("\nSeed failed.");
    process.exit(1);
  }

  console.log("\nSeed completed successfully.");
  console.log(
    `\nDemo advisor email: ${ADVISOR_EMAIL}` +
      `\nDemo advisor auth id: ${advisorAuthId}` +
      `\nProgram offering id: ${ID.programOffering}` +
      `\nQualification type key: british_a_level` +
      `\nSample student profile id: ${ID.studentProfile}`,
  );
}

main().catch((err) => {
  console.error("\nFATAL during seed:", err);
  process.exit(1);
});
