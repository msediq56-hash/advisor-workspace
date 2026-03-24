-- Migration 1: Core Schema
-- Advisor Workspace v1 — based on docs/database-design-v1.1.md and docs/schema-map-v1.md
-- Scope: Identity, Catalog, Overlay, Qualification, Rules, Evaluation, Governance
-- Excludes: import_batches, import_batch_rows, publish_actions (Migration 2)

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE owner_scope AS ENUM ('platform', 'organization');

CREATE TYPE organization_status AS ENUM ('active', 'inactive');

CREATE TYPE membership_role AS ENUM ('owner', 'manager', 'advisor');

CREATE TYPE membership_status AS ENUM ('active', 'inactive');

CREATE TYPE visibility_status AS ENUM ('active', 'hidden', 'inactive');

CREATE TYPE qualification_complexity_model AS ENUM ('simple_form', 'subject_based');

CREATE TYPE profile_kind AS ENUM ('runtime', 'sample');

CREATE TYPE profile_status AS ENUM ('draft', 'finalized');

CREATE TYPE rule_target_scope AS ENUM ('university', 'program', 'offering');

CREATE TYPE rule_set_lifecycle_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE rule_group_evaluation_mode AS ENUM ('all_required', 'any_of', 'advisory_only');

CREATE TYPE rule_group_severity AS ENUM ('blocking', 'conditional', 'advisory', 'review');

CREATE TYPE evaluation_flow_type AS ENUM ('direct_evaluation', 'general_comparison', 'program_search');

CREATE TYPE evaluation_final_status AS ENUM ('eligible', 'conditional', 'not_eligible', 'needs_review', 'incomplete_info');

CREATE TYPE trace_outcome AS ENUM ('passed', 'failed', 'triggered', 'skipped');

CREATE TYPE validation_issue_severity AS ENUM ('error', 'warning', 'info');

CREATE TYPE audit_action_type AS ENUM ('create', 'update', 'publish', 'deactivate', 'hide', 'delete', 'restore');

-- ============================================================
-- 1. IDENTITY & ORGANIZATION
-- ============================================================

-- user_profiles: application layer on top of auth.users
CREATE TABLE user_profiles (
    id          uuid PRIMARY KEY,  -- matches auth.users.id
    full_name   text NOT NULL,
    email_normalized text NOT NULL,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text NOT NULL UNIQUE,
    name_ar     text NOT NULL,
    status      organization_status NOT NULL DEFAULT 'active',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_branding (
    organization_id uuid PRIMARY KEY REFERENCES organizations(id),
    display_name_ar text NOT NULL,
    logo_url        text,
    primary_color   text,
    secondary_color text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_memberships (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   uuid NOT NULL REFERENCES organizations(id),
    user_id           uuid NOT NULL REFERENCES user_profiles(id),
    role_key          membership_role NOT NULL,
    membership_status membership_status NOT NULL DEFAULT 'active',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_org_membership UNIQUE (organization_id, user_id)
);

-- ============================================================
-- 2. CATALOG CORE
-- ============================================================

CREATE TABLE countries (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code      text NOT NULL UNIQUE,
    name_ar   text NOT NULL,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE university_types (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key       text NOT NULL UNIQUE,
    name_ar   text NOT NULL,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE degrees (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key        text NOT NULL UNIQUE,
    name_ar    text NOT NULL,
    level_rank int NOT NULL,
    is_active  boolean NOT NULL DEFAULT true
);

CREATE TABLE universities (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_scope           owner_scope NOT NULL,
    owner_organization_id uuid REFERENCES organizations(id),
    country_id            uuid NOT NULL REFERENCES countries(id),
    university_type_id    uuid NOT NULL REFERENCES university_types(id),
    name_ar               text NOT NULL,
    name_en               text,
    is_active             boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_university_ownership CHECK (
        (owner_scope = 'platform'     AND owner_organization_id IS NULL) OR
        (owner_scope = 'organization' AND owner_organization_id IS NOT NULL)
    )
);

CREATE TABLE faculties (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id uuid NOT NULL REFERENCES universities(id),
    name_ar       text NOT NULL,
    sort_order    int NOT NULL DEFAULT 0,
    is_active     boolean NOT NULL DEFAULT true
);

CREATE TABLE programs (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_scope               owner_scope NOT NULL,
    owner_organization_id     uuid REFERENCES organizations(id),
    university_id             uuid NOT NULL REFERENCES universities(id),
    faculty_id                uuid REFERENCES faculties(id),
    degree_id                 uuid NOT NULL REFERENCES degrees(id),
    program_code              text,
    title_ar                  text NOT NULL,
    title_en                  text,
    canonical_search_title_ar text NOT NULL,
    is_active                 boolean NOT NULL DEFAULT true,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_program_ownership CHECK (
        (owner_scope = 'platform'     AND owner_organization_id IS NULL) OR
        (owner_scope = 'organization' AND owner_organization_id IS NOT NULL)
    )
);

CREATE TABLE program_offerings (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_scope           owner_scope NOT NULL,
    owner_organization_id uuid REFERENCES organizations(id),
    program_id            uuid NOT NULL REFERENCES programs(id),
    intake_label_ar       text NOT NULL,
    intake_term_key       text,
    intake_year           int,
    campus_name_ar        text,
    study_mode_key        text,
    duration_months       int,
    teaching_language_key text,
    annual_tuition_amount numeric(12,2),
    currency_code         text NOT NULL,
    application_fee_amount numeric(12,2),
    extra_fee_note_ar     text,
    scholarship_note_ar   text,
    is_active             boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_offering_ownership CHECK (
        (owner_scope = 'platform'     AND owner_organization_id IS NULL) OR
        (owner_scope = 'organization' AND owner_organization_id IS NOT NULL)
    )
);

-- ============================================================
-- 3. TENANT ACTIVATION & OVERLAY
-- ============================================================

CREATE TABLE organization_offering_settings (
    id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                 uuid NOT NULL REFERENCES organizations(id),
    program_offering_id             uuid NOT NULL REFERENCES program_offerings(id),
    visibility_status               visibility_status NOT NULL DEFAULT 'active',
    tuition_override_amount         numeric(12,2),
    application_fee_override_amount numeric(12,2),
    extra_fee_note_override_ar      text,
    scholarship_note_override_ar    text,
    internal_note_ar                text,
    created_at                      timestamptz NOT NULL DEFAULT now(),
    updated_at                      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_org_offering UNIQUE (organization_id, program_offering_id)
);

-- ============================================================
-- 4. QUALIFICATION & PROFILE
-- ============================================================

CREATE TABLE qualification_families (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key              text NOT NULL UNIQUE,
    name_ar          text NOT NULL,
    academic_stage_key text NOT NULL,
    is_active        boolean NOT NULL DEFAULT true
);

CREATE TABLE qualification_types (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_scope           owner_scope NOT NULL,
    owner_organization_id uuid REFERENCES organizations(id),
    family_id             uuid NOT NULL REFERENCES qualification_families(id),
    key                   text NOT NULL,
    name_ar               text NOT NULL,
    complexity_model      qualification_complexity_model NOT NULL,
    is_active             boolean NOT NULL DEFAULT true,

    CONSTRAINT chk_qualtype_ownership CHECK (
        (owner_scope = 'platform'     AND owner_organization_id IS NULL) OR
        (owner_scope = 'organization' AND owner_organization_id IS NOT NULL)
    )
);

CREATE TABLE qualification_question_sets (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    qualification_type_id uuid NOT NULL REFERENCES qualification_types(id),
    version_number        int NOT NULL,
    is_active             boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_qualtype_version UNIQUE (qualification_type_id, version_number)
);

CREATE TABLE qualification_questions (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_set_id      uuid NOT NULL REFERENCES qualification_question_sets(id),
    field_key            text NOT NULL,
    label_ar             text NOT NULL,
    input_type           text NOT NULL,
    is_required          boolean NOT NULL DEFAULT false,
    order_index          int NOT NULL,
    help_text_ar         text,
    config_jsonb         jsonb,
    visibility_rule_jsonb jsonb,
    is_active            boolean NOT NULL DEFAULT true,

    CONSTRAINT uq_question_field UNIQUE (question_set_id, field_key)
);

CREATE TABLE qualification_question_options (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL REFERENCES qualification_questions(id),
    option_key  text NOT NULL,
    label_ar    text NOT NULL,
    sort_order  int NOT NULL,
    is_active   boolean NOT NULL DEFAULT true,

    CONSTRAINT uq_question_option UNIQUE (question_id, option_key)
);

CREATE TABLE student_profiles (
    id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id            uuid NOT NULL REFERENCES organizations(id),
    created_by_user_id         uuid NOT NULL REFERENCES user_profiles(id),
    profile_kind               profile_kind NOT NULL,
    qualification_type_id      uuid NOT NULL REFERENCES qualification_types(id),
    title_ar                   text,
    profile_status             profile_status NOT NULL DEFAULT 'draft',
    normalized_snapshot_jsonb  jsonb,
    last_evaluated_at          timestamptz,
    created_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE student_profile_answers (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id             uuid NOT NULL REFERENCES student_profiles(id),
    question_id            uuid NOT NULL REFERENCES qualification_questions(id),
    value_jsonb            jsonb NOT NULL,
    normalized_value_jsonb jsonb,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_profile_answer UNIQUE (profile_id, question_id)
);

-- British / subject-based qualification support
CREATE TABLE student_profile_subjects (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id               uuid NOT NULL REFERENCES student_profiles(id),
    segment_key              text NOT NULL,
    subject_name_raw         text NOT NULL,
    subject_name_normalized  text NOT NULL,
    subject_level_key        text NOT NULL,
    grade_raw                text NOT NULL,
    grade_normalized_key     text NOT NULL,
    grade_normalized_value   numeric(8,2),
    is_countable             boolean NOT NULL DEFAULT true,
    note_ar                  text,
    created_at               timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. RULE REGISTRY
-- ============================================================

CREATE TABLE rule_types (
    id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key                             text NOT NULL UNIQUE,
    name_ar                         text NOT NULL,
    config_schema_jsonb             jsonb NOT NULL,
    evaluator_key                   text NOT NULL,
    supported_target_scopes_jsonb   jsonb NOT NULL,
    supported_complexity_models_jsonb jsonb NOT NULL,
    allowed_group_severities_jsonb  jsonb NOT NULL,
    is_active                       boolean NOT NULL DEFAULT true
);

CREATE TABLE rule_sets (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_scope                 owner_scope NOT NULL,
    owner_organization_id       uuid REFERENCES organizations(id),
    target_scope                rule_target_scope NOT NULL,
    target_university_id        uuid REFERENCES universities(id),
    target_program_id           uuid REFERENCES programs(id),
    target_program_offering_id  uuid REFERENCES program_offerings(id),
    qualification_type_id       uuid REFERENCES qualification_types(id),
    name_ar                     text NOT NULL,
    description_ar              text,
    priority_order              int NOT NULL DEFAULT 0,
    is_active                   boolean NOT NULL DEFAULT true,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_ruleset_ownership CHECK (
        (owner_scope = 'platform'     AND owner_organization_id IS NULL) OR
        (owner_scope = 'organization' AND owner_organization_id IS NOT NULL)
    ),

    -- Only one target field may be non-null, matching target_scope
    CONSTRAINT chk_ruleset_target CHECK (
        (target_scope = 'university' AND target_university_id IS NOT NULL
            AND target_program_id IS NULL AND target_program_offering_id IS NULL)
        OR
        (target_scope = 'program' AND target_program_id IS NOT NULL
            AND target_university_id IS NULL AND target_program_offering_id IS NULL)
        OR
        (target_scope = 'offering' AND target_program_offering_id IS NOT NULL
            AND target_university_id IS NULL AND target_program_id IS NULL)
    )
);

CREATE TABLE rule_set_versions (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_set_id          uuid NOT NULL REFERENCES rule_sets(id),
    version_number       int NOT NULL,
    lifecycle_status     rule_set_lifecycle_status NOT NULL DEFAULT 'draft',
    based_on_version_id  uuid REFERENCES rule_set_versions(id),
    change_summary_ar    text,
    created_by_user_id   uuid NOT NULL REFERENCES user_profiles(id),
    published_by_user_id uuid REFERENCES user_profiles(id),
    created_at           timestamptz NOT NULL DEFAULT now(),
    published_at         timestamptz,

    CONSTRAINT uq_ruleset_version UNIQUE (rule_set_id, version_number)
);

CREATE TABLE rule_groups (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_set_version_id  uuid NOT NULL REFERENCES rule_set_versions(id),
    group_key            text NOT NULL,
    label_ar             text NOT NULL,
    evaluation_mode      rule_group_evaluation_mode NOT NULL,
    group_severity       rule_group_severity NOT NULL,
    order_index          int NOT NULL,

    CONSTRAINT uq_group_key UNIQUE (rule_set_version_id, group_key)
);

CREATE TABLE rules (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_group_id       uuid NOT NULL REFERENCES rule_groups(id),
    rule_type_id        uuid NOT NULL REFERENCES rule_types(id),
    config_jsonb        jsonb NOT NULL,
    message_override_ar text,
    order_index         int NOT NULL,
    is_active           boolean NOT NULL DEFAULT true
);

-- ============================================================
-- 6. EVALUATION RUNTIME
-- ============================================================

CREATE TABLE evaluation_runs (
    id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                   uuid NOT NULL REFERENCES organizations(id),
    actor_user_id                     uuid NOT NULL REFERENCES user_profiles(id),
    flow_type                         evaluation_flow_type NOT NULL,
    source_profile_id                 uuid REFERENCES student_profiles(id),
    qualification_type_id             uuid NOT NULL REFERENCES qualification_types(id),
    normalized_profile_snapshot_jsonb jsonb NOT NULL,
    request_context_jsonb             jsonb NOT NULL,
    created_at                        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evaluation_results (
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_run_id            uuid NOT NULL REFERENCES evaluation_runs(id),
    program_offering_id          uuid NOT NULL REFERENCES program_offerings(id),
    final_status                 evaluation_final_status NOT NULL,
    primary_reason_ar            text NOT NULL,
    next_step_ar                 text,
    tuition_amount_snapshot      numeric(12,2),
    currency_code                text,
    application_fee_snapshot     numeric(12,2),
    extra_fee_note_snapshot_ar   text,
    scholarship_note_snapshot_ar text,
    advisory_notes_jsonb         jsonb,
    sort_bucket                  text NOT NULL,
    matched_rules_count          int NOT NULL DEFAULT 0,
    failed_groups_count          int NOT NULL DEFAULT 0,
    conditional_groups_count     int NOT NULL DEFAULT 0,
    trace_summary_jsonb          jsonb,
    created_at                   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evaluation_rule_traces (
    id                               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_result_id             uuid NOT NULL REFERENCES evaluation_results(id),
    rule_set_version_id              uuid NOT NULL REFERENCES rule_set_versions(id),
    rule_group_id                    uuid NOT NULL REFERENCES rule_groups(id),
    rule_id                          uuid NOT NULL REFERENCES rules(id),
    rule_type_key_snapshot           text NOT NULL,
    group_severity_snapshot          rule_group_severity NOT NULL,
    group_evaluation_mode_snapshot   rule_group_evaluation_mode NOT NULL,
    outcome                          trace_outcome NOT NULL,
    explanation_ar                   text NOT NULL,
    created_at                       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. GOVERNANCE ESSENTIALS
-- ============================================================

CREATE TABLE validation_issues (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_entity_type text NOT NULL,
    parent_entity_id   uuid NOT NULL,
    severity           validation_issue_severity NOT NULL,
    issue_code         text NOT NULL,
    issue_message_ar   text NOT NULL,
    field_path         text,
    suggested_fix_ar   text,
    is_resolved        boolean NOT NULL DEFAULT false,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       uuid REFERENCES organizations(id),
    actor_user_id         uuid REFERENCES user_profiles(id),
    entity_type           text NOT NULL,
    entity_id             uuid NOT NULL,
    action_type           audit_action_type NOT NULL,
    before_snapshot_jsonb jsonb,
    after_snapshot_jsonb  jsonb,
    created_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. INDEXES
-- ============================================================

-- Identity
CREATE INDEX idx_org_memberships_user ON organization_memberships(user_id);

-- Catalog
CREATE INDEX idx_universities_country ON universities(country_id);
CREATE INDEX idx_universities_type ON universities(university_type_id);
CREATE INDEX idx_programs_university ON programs(university_id);
CREATE INDEX idx_programs_degree ON programs(degree_id);
CREATE INDEX idx_programs_search_title ON programs(canonical_search_title_ar);
CREATE INDEX idx_offerings_program ON program_offerings(program_id);

-- Qualification
CREATE INDEX idx_qualtypes_family ON qualification_types(family_id);
CREATE INDEX idx_student_profiles_org ON student_profiles(organization_id);
CREATE INDEX idx_profile_answers_profile ON student_profile_answers(profile_id);
CREATE INDEX idx_profile_subjects_profile ON student_profile_subjects(profile_id);

-- Rules
CREATE INDEX idx_rule_sets_target_scope ON rule_sets(target_scope);
CREATE INDEX idx_rule_sets_target_university ON rule_sets(target_university_id);
CREATE INDEX idx_rule_sets_target_program ON rule_sets(target_program_id);
CREATE INDEX idx_rule_sets_target_offering ON rule_sets(target_program_offering_id);
CREATE INDEX idx_rule_sets_qualtype ON rule_sets(qualification_type_id);
CREATE INDEX idx_rule_groups_version ON rule_groups(rule_set_version_id);
CREATE INDEX idx_rules_group ON rules(rule_group_id);

-- Evaluation
CREATE INDEX idx_eval_runs_org ON evaluation_runs(organization_id);
CREATE INDEX idx_eval_results_run ON evaluation_results(evaluation_run_id);
CREATE INDEX idx_eval_results_status ON evaluation_results(final_status);
CREATE INDEX idx_eval_traces_result ON evaluation_rule_traces(evaluation_result_id);

-- Governance
CREATE INDEX idx_validation_issues_parent ON validation_issues(parent_entity_type, parent_entity_id);

-- ============================================================
-- 9. PARTIAL UNIQUE INDEX
-- Only one published version per rule_set at any time
-- ============================================================

CREATE UNIQUE INDEX uq_one_published_version_per_ruleset
    ON rule_set_versions(rule_set_id)
    WHERE lifecycle_status = 'published';
