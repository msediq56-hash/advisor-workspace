# Schema Map v1

## 1) هدف هذه الوثيقة
هذه الوثيقة تحول **Database Design v1.1** إلى خريطة
تنفيذية واضحة:

-   ما هي الجداول الفعلية

-   ما الأعمدة الأساسية فقط

-   ما العلاقات الأساسية فقط

-   ما يدخل في **Migration 1**

-   ما يدخل في **Migration 2**

-   ما يؤجل إلى ما بعد ذلك

هذه ليست SQL نهائي بعد، لكنها أقرب خطوة قبل
كتابة migrations الفعلية.

## 2) القرار التنفيذي العام
**ما سندخله في v1 فعليًا**

سنقسم الـ schema إلى 3 طبقات تنفيذ:

**Phase A --- Core Foundation**

لازم تدخل من البداية:

-   organizations

-   users/profile linkage

-   catalog الأساسي

-   qualifications

-   student profiles

-   british subject model

-   rule registry

-   evaluation runtime

-   tenant activation

**Phase B --- Governance Essentials**

تدخل مبكرًا لكن بعد الأساس:

-   rule versioning

-   validation issues

-   audit logs

-   publish actions الأساسي

**Phase C --- Import Pipeline**

تدخل بعد ثبات النواة:

-   import_batches

-   import_batch_rows

-   staging/review flows

**السبب:**\
لا نريد أن نبني import system قبل أن تكون الجداول الأساسية
نفسها مستقرة.

## 3) الـ Enums الرسمية في v1
هذه enum values يجب تثبيتها الآن مفاهيميًا، حتى لو نفذناها
لاحقًا كـ PostgreSQL enums أو check constraints.

**3.1 owner_scope**

-   platform

-   organization

**3.2 organization_status**

-   active

-   inactive

**3.3 membership_role**

-   owner

-   manager

-   advisor

**3.4 membership_status**

-   active

-   inactive

**3.5 visibility_status**

-   active

-   hidden

-   inactive

**3.6 qualification_complexity_model**

-   simple_form

-   subject_based

**3.7 profile_kind**

-   runtime

-   sample

**3.8 profile_status**

-   draft

-   finalized

**3.9 rule_target_scope**

-   university

-   program

-   offering

**3.10 rule_set_lifecycle_status**

-   draft

-   published

-   archived

**3.11 rule_group_evaluation_mode**

-   all_required

-   any_of

-   advisory_only

**3.12 rule_group_severity**

-   blocking

-   conditional

-   advisory

-   review

**3.13 evaluation_flow_type**

-   direct_evaluation

-   general_comparison

-   program_search

**3.14 evaluation_final_status**

-   eligible

-   conditional

-   not_eligible

-   needs_review

-   incomplete_info

**3.15 trace_outcome**

-   passed

-   failed

-   triggered

-   skipped

**3.16 validation_issue_severity**

-   error

-   warning

-   info

**3.17 import_status**

-   uploaded

-   parsing

-   validated

-   review_required

-   published

-   failed

**3.18 import_target_scope**

-   platform_library

-   organization_library

**3.19 import_source_kind**

-   csv

-   excel

-   pdf

-   ai_structured

**3.20 import_entity_scope**

-   catalog

-   rules

-   mixed

**3.21 import_row_status**

-   pending

-   valid

-   invalid

-   published

-   skipped

**3.22 audit_action_type**

-   create

-   update

-   publish

-   deactivate

-   hide

-   delete

-   restore

## 4) الجداول التي تدخل في Migration 1
هذه هي الجداول التي أعتبرها **الحد الأدنى الصحيح** لبدء
البناء.

**4.1 Identity & Organization**

**user_profiles**

الغرض: طبقة تطبيقية مرتبطة بـ auth.users

**أعمدة أساسية**

-   id uuid pk --- يساوي auth.users.id

-   full_name text

-   email_normalized text

-   is_active boolean default true

-   created_at timestamptz

-   updated_at timestamptz

**ملاحظات**

-   unique على email_normalized إذا أردنا، لكن ليس ضروريًا
    الآن لأن auth يدير ذلك غالبًا

**organizations**

**أعمدة أساسية**

-   id uuid pk

-   slug text unique

-   name_ar text

-   status organization_status

-   created_at timestamptz

-   updated_at timestamptz

**organization_branding**

**أعمدة أساسية**

-   organization_id uuid pk fk -\> organizations.id

-   display_name_ar text

-   logo_url text null

-   primary_color text null

-   secondary_color text null

-   created_at timestamptz

-   updated_at timestamptz

**organization_memberships**

**أعمدة أساسية**

-   id uuid pk

-   organization_id uuid fk -\> organizations.id

-   user_id uuid fk -\> user_profiles.id

-   role_key membership_role

-   membership_status membership_status

-   created_at timestamptz

-   updated_at timestamptz

**قيود**

-   unique (organization_id, user_id)

**4.2 Catalog Core**

**countries**

**أعمدة أساسية**

-   id uuid pk

-   code text unique

-   name_ar text

-   is_active boolean default true

**university_types**

**أعمدة أساسية**

-   id uuid pk

-   key text unique

-   name_ar text

-   is_active boolean default true

**degrees**

**أعمدة أساسية**

-   id uuid pk

-   key text unique

-   name_ar text

-   level_rank int

-   is_active boolean default true

**universities**

**أعمدة أساسية**

-   id uuid pk

-   owner_scope owner_scope

-   owner_organization_id uuid null fk -\> organizations.id

-   country_id uuid fk -\> countries.id

-   university_type_id uuid fk -\> university_types.id

-   name_ar text

-   name_en text null

-   is_active boolean default true

-   created_at timestamptz

-   updated_at timestamptz

**قيود**

-   check ownership:

    -   إذا owner_scope = \'platform\' →
        owner_organization_id is null

    -   إذا owner_scope = \'organization\' →
        owner_organization_id is not null

**faculties**

أوصي بإدخاله في Migration 1 لأنه مفيد تنظيميًا، لكن
يبقى nullable في البرامج.

**أعمدة أساسية**

-   id uuid pk

-   university_id uuid fk -\> universities.id

-   name_ar text

-   sort_order int default 0

-   is_active boolean default true

**programs**

**أعمدة أساسية**

-   id uuid pk

-   owner_scope owner_scope

-   owner_organization_id uuid null fk -\> organizations.id

-   university_id uuid fk -\> universities.id

-   faculty_id uuid null fk -\> faculties.id

-   degree_id uuid fk -\> degrees.id

-   program_code text null

-   title_ar text

-   title_en text null

-   canonical_search_title_ar text

-   is_active boolean default true

-   created_at timestamptz

-   updated_at timestamptz

**قيود**

-   نفس check ownership

**program_offerings**

**أعمدة أساسية**

-   id uuid pk

-   owner_scope owner_scope

-   owner_organization_id uuid null fk -\> organizations.id

-   program_id uuid fk -\> programs.id

-   intake_label_ar text

-   intake_term_key text null

-   intake_year int null

-   campus_name_ar text null

-   study_mode_key text null

-   duration_months int null

-   teaching_language_key text null

-   annual_tuition_amount numeric(12,2) null

-   currency_code text

-   application_fee_amount numeric(12,2) null

-   extra_fee_note_ar text null

-   scholarship_note_ar text null

-   is_active boolean default true

-   created_at timestamptz

-   updated_at timestamptz

**قيود**

-   نفس check ownership

**4.3 Tenant Activation & Overlay**

**organization_offering_settings**

**أعمدة أساسية**

-   id uuid pk

-   organization_id uuid fk -\> organizations.id

-   program_offering_id uuid fk -\> program_offerings.id

-   visibility_status visibility_status

-   tuition_override_amount numeric(12,2) null

-   application_fee_override_amount numeric(12,2) null

-   extra_fee_note_override_ar text null

-   scholarship_note_override_ar text null

-   internal_note_ar text null

-   created_at timestamptz

-   updated_at timestamptz

**قيود**

-   unique (organization_id, program_offering_id)

**4.4 Qualification & Profile**

**qualification_families**

**أعمدة أساسية**

-   id uuid pk

-   key text unique

-   name_ar text

-   academic_stage_key text

-   is_active boolean default true

**qualification_types**

**أعمدة أساسية**

-   id uuid pk

-   owner_scope owner_scope

-   owner_organization_id uuid null fk -\> organizations.id

-   family_id uuid fk -\> qualification_families.id

-   key text

-   name_ar text

-   complexity_model qualification_complexity_model

-   is_active boolean default true

**قيود**

-   check ownership

-   unique منطقيًا على (owner_scope, owner_organization_id,
    key) أو variant قريب

**qualification_question_sets**

**أعمدة أساسية**

-   id uuid pk

-   qualification_type_id uuid fk -\> qualification_types.id

-   version_number int

-   is_active boolean default true

-   created_at timestamptz

**قيود**

-   unique (qualification_type_id, version_number)

**qualification_questions**

**أعمدة أساسية**

-   id uuid pk

-   question_set_id uuid fk -\> qualification_question_sets.id

-   field_key text

-   label_ar text

-   input_type text

-   is_required boolean default false

-   order_index int

-   help_text_ar text null

-   config_jsonb jsonb null

-   visibility_rule_jsonb jsonb null

-   is_active boolean default true

**قيود**

-   unique (question_set_id, field_key)

**qualification_question_options**

**أعمدة أساسية**

-   id uuid pk

-   question_id uuid fk -\> qualification_questions.id

-   option_key text

-   label_ar text

-   sort_order int

-   is_active boolean default true

**قيود**

-   unique (question_id, option_key)

**student_profiles**

**أعمدة أساسية**

-   id uuid pk

-   organization_id uuid fk -\> organizations.id

-   created_by_user_id uuid fk -\> user_profiles.id

-   profile_kind profile_kind

-   qualification_type_id uuid fk -\> qualification_types.id

-   title_ar text null

-   profile_status profile_status

-   normalized_snapshot_jsonb jsonb null

-   last_evaluated_at timestamptz null

-   created_at timestamptz

-   updated_at timestamptz

**student_profile_answers**

**أعمدة أساسية**

-   id uuid pk

-   profile_id uuid fk -\> student_profiles.id

-   question_id uuid fk -\> qualification_questions.id

-   value_jsonb jsonb

-   normalized_value_jsonb jsonb null

-   created_at timestamptz

-   updated_at timestamptz

**قيود**

-   unique (profile_id, question_id)

**student_profile_subjects**

هذا الجدول يدخل من البداية، وليس لاحقًا، لأننا لا نريد ترقيع
البريطانية.

**أعمدة أساسية**

-   id uuid pk

-   profile_id uuid fk -\> student_profiles.id

-   segment_key text

-   subject_name_raw text

-   subject_name_normalized text

-   subject_level_key text

-   grade_raw text

-   grade_normalized_key text

-   grade_normalized_value numeric(8,2) null

-   is_countable boolean default true

-   note_ar text null

-   created_at timestamptz

**4.5 Rule Registry**

**rule_types**

**أعمدة أساسية**

-   id uuid pk

-   key text unique

-   name_ar text

-   config_schema_jsonb jsonb

-   evaluator_key text

-   supported_target_scopes_jsonb jsonb

-   supported_complexity_models_jsonb jsonb

-   allowed_group_severities_jsonb jsonb

-   is_active boolean default true

**rule_sets**

**أعمدة أساسية**

-   id uuid pk

-   owner_scope owner_scope

-   owner_organization_id uuid null fk -\> organizations.id

-   target_scope rule_target_scope

-   target_university_id uuid null fk -\> universities.id

-   target_program_id uuid null fk -\> programs.id

-   target_program_offering_id uuid null fk -\> program_offerings.id

-   qualification_type_id uuid null fk -\> qualification_types.id

-   name_ar text

-   description_ar text null

-   priority_order int default 0

-   is_active boolean default true

-   created_at timestamptz

-   updated_at timestamptz

**قيود مهمة جدًا**

-   check ownership

-   check target الواحد فقط:

    -   target_scope = university → فقط
        target_university_id non-null

    -   target_scope = program → فقط target_program_id
        non-null

    -   target_scope = offering → فقط
        target_program_offering_id non-null

**rule_set_versions**

**أعمدة أساسية**

-   id uuid pk

-   rule_set_id uuid fk -\> rule_sets.id

-   version_number int

-   lifecycle_status rule_set_lifecycle_status

-   based_on_version_id uuid null fk -\> rule_set_versions.id

-   change_summary_ar text null

-   created_by_user_id uuid fk -\> user_profiles.id

-   published_by_user_id uuid null fk -\> user_profiles.id

-   created_at timestamptz

-   published_at timestamptz null

**قيود**

-   unique (rule_set_id, version_number)

-   later partial unique for one published version per rule_set

**rule_groups**

**أعمدة أساسية**

-   id uuid pk

-   rule_set_version_id uuid fk -\> rule_set_versions.id

-   group_key text

-   label_ar text

-   evaluation_mode rule_group_evaluation_mode

-   group_severity rule_group_severity

-   order_index int

**قيود**

-   unique (rule_set_version_id, group_key)

**rules**

**أعمدة أساسية**

-   id uuid pk

-   rule_group_id uuid fk -\> rule_groups.id

-   rule_type_id uuid fk -\> rule_types.id

-   config_jsonb jsonb

-   message_override_ar text null

-   order_index int

-   is_active boolean default true

**4.6 Evaluation Runtime**

**evaluation_runs**

**أعمدة أساسية**

-   id uuid pk

-   organization_id uuid fk -\> organizations.id

-   actor_user_id uuid fk -\> user_profiles.id

-   flow_type evaluation_flow_type

-   source_profile_id uuid null fk -\> student_profiles.id

-   qualification_type_id uuid fk -\> qualification_types.id

-   normalized_profile_snapshot_jsonb jsonb

-   request_context_jsonb jsonb

-   created_at timestamptz

**evaluation_results**

**أعمدة أساسية**

-   id uuid pk

-   evaluation_run_id uuid fk -\> evaluation_runs.id

-   program_offering_id uuid fk -\> program_offerings.id

-   final_status evaluation_final_status

-   primary_reason_ar text

-   next_step_ar text null

-   tuition_amount_snapshot numeric(12,2) null

-   currency_code text null

-   application_fee_snapshot numeric(12,2) null

-   extra_fee_note_snapshot_ar text null

-   scholarship_note_snapshot_ar text null

-   advisory_notes_jsonb jsonb null

-   sort_bucket text

-   matched_rules_count int default 0

-   failed_groups_count int default 0

-   conditional_groups_count int default 0

-   trace_summary_jsonb jsonb null

-   created_at timestamptz

**evaluation_rule_traces**

**أعمدة أساسية**

-   id uuid pk

-   evaluation_result_id uuid fk -\> evaluation_results.id

-   rule_set_version_id uuid fk -\> rule_set_versions.id

-   rule_group_id uuid fk -\> rule_groups.id

-   rule_id uuid fk -\> rules.id

-   rule_type_key_snapshot text

-   group_severity_snapshot rule_group_severity

-   group_evaluation_mode_snapshot rule_group_evaluation_mode

-   outcome trace_outcome

-   explanation_ar text

-   created_at timestamptz

**4.7 Governance Essentials**

**validation_issues**

أوصي بإدخاله من البداية لأنه مهم جدًا حتى في admin
المبكر.

**أعمدة أساسية**

-   id uuid pk

-   parent_entity_type text

-   parent_entity_id uuid

-   severity validation_issue_severity

-   issue_code text

-   issue_message_ar text

-   field_path text null

-   suggested_fix_ar text null

-   is_resolved boolean default false

-   created_at timestamptz

**audit_logs**

**أعمدة أساسية**

-   id uuid pk

-   organization_id uuid null fk -\> organizations.id

-   actor_user_id uuid null fk -\> user_profiles.id

-   entity_type text

-   entity_id uuid

-   action_type audit_action_type

-   before_snapshot_jsonb jsonb null

-   after_snapshot_jsonb jsonb null

-   created_at timestamptz

## 5) الجداول التي تدخل في Migration 2
هذه لا أريدها في أول migration، لكن لا نؤجلها كثيرًا
أيضًا.

**5.1 Import / Publish**

**import_batches**

**أعمدة أساسية**

-   id uuid pk

-   organization_id uuid null fk -\> organizations.id

-   import_target_scope import_target_scope

-   source_kind import_source_kind

-   entity_scope import_entity_scope

-   status import_status

-   source_file_name text null

-   source_file_url text null

-   started_by_user_id uuid fk -\> user_profiles.id

-   started_at timestamptz

-   finished_at timestamptz null

-   summary_jsonb jsonb null

**import_batch_rows**

**أعمدة أساسية**

-   id uuid pk

-   import_batch_id uuid fk -\> import_batches.id

-   entity_type text

-   source_row_number int null

-   raw_payload_jsonb jsonb

-   mapped_payload_jsonb jsonb null

-   row_status import_row_status

-   target_record_id uuid null

-   created_at timestamptz

-   updated_at timestamptz

**publish_actions**

**أعمدة أساسية**

-   id uuid pk

-   organization_id uuid null fk -\> organizations.id

-   actor_user_id uuid fk -\> user_profiles.id

-   source_type text

-   source_id uuid

-   publish_scope text

-   summary_jsonb jsonb null

-   published_at timestamptz

## 6) الجداول المؤجلة بعد ذلك
هذه لا تدخل الآن:

-   document_requirements

-   visa_notes

-   training_modules

-   notifications

-   tasks

-   crm_integrations

-   subscription_plans

-   payment_records

-   marketplace_packages

-   translations

-   advanced_scholarship_rules

## 7) العلاقات الأساسية المختصرة
هذه أهم العلاقات التي يجب أن تبقى واضحة في رأسك:

**Organization Layer**

-   organization_branding.organization_id -\> organizations.id

-   organization_memberships.organization_id -\> organizations.id

-   organization_memberships.user_id -\> user_profiles.id

**Catalog**

-   universities.country_id -\> countries.id

-   universities.university_type_id -\> university_types.id

-   faculties.university_id -\> universities.id

-   programs.university_id -\> universities.id

-   programs.faculty_id -\> faculties.id

-   programs.degree_id -\> degrees.id

-   program_offerings.program_id -\> programs.id

**Overlay**

-   organization_offering_settings.organization_id -\> organizations.id

-   organization_offering_settings.program_offering_id -\>
    program_offerings.id

**Qualification**

-   qualification_types.family_id -\> qualification_families.id

-   qualification_question_sets.qualification_type_id -\>
    qualification_types.id

-   qualification_questions.question_set_id -\>
    qualification_question_sets.id

-   qualification_question_options.question_id -\>
    qualification_questions.id

-   student_profiles.organization_id -\> organizations.id

-   student_profiles.qualification_type_id -\> qualification_types.id

-   student_profile_answers.profile_id -\> student_profiles.id

-   student_profile_answers.question_id -\> qualification_questions.id

-   student_profile_subjects.profile_id -\> student_profiles.id

**Rules**

-   rule_sets.target_university_id -\> universities.id

-   rule_sets.target_program_id -\> programs.id

-   rule_sets.target_program_offering_id -\> program_offerings.id

-   rule_sets.qualification_type_id -\> qualification_types.id

-   rule_set_versions.rule_set_id -\> rule_sets.id

-   rule_groups.rule_set_version_id -\> rule_set_versions.id

-   rules.rule_group_id -\> rule_groups.id

-   rules.rule_type_id -\> rule_types.id

**Evaluation**

-   evaluation_runs.organization_id -\> organizations.id

-   evaluation_runs.actor_user_id -\> user_profiles.id

-   evaluation_runs.source_profile_id -\> student_profiles.id

-   evaluation_results.evaluation_run_id -\> evaluation_runs.id

-   evaluation_results.program_offering_id -\> program_offerings.id

-   evaluation_rule_traces.evaluation_result_id -\>
    evaluation_results.id

-   evaluation_rule_traces.rule_set_version_id -\> rule_set_versions.id

-   evaluation_rule_traces.rule_group_id -\> rule_groups.id

-   evaluation_rule_traces.rule_id -\> rules.id

**8) الـ Indexes التي أعتبرها إلزامية في
البداية**

**Identity**

-   unique (organization_id, user_id) على
    organization_memberships

-   index على organization_memberships.user_id

**Catalog**

-   index على universities.country_id

-   index على universities.university_type_id

-   index على programs.university_id

-   index على programs.degree_id

-   index على programs.canonical_search_title_ar

-   index على program_offerings.program_id

**Overlay**

-   unique (organization_id, program_offering_id) على
    organization_offering_settings

**Qualification**

-   index على qualification_types.family_id

-   index على student_profiles.organization_id

-   index على student_profile_answers.profile_id

-   index على student_profile_subjects.profile_id

**Rules**

-   index على rule_sets.target_scope

-   index على rule_sets.target_university_id

-   index على rule_sets.target_program_id

-   index على rule_sets.target_program_offering_id

-   index على rule_sets.qualification_type_id

-   unique (rule_set_id, version_number) على
    rule_set_versions

-   index على rule_groups.rule_set_version_id

-   index على rules.rule_group_id

**Evaluation**

-   index على evaluation_runs.organization_id

-   index على evaluation_results.evaluation_run_id

-   index على evaluation_results.final_status

-   index على evaluation_rule_traces.evaluation_result_id

**Governance**

-   index على (parent_entity_type, parent_entity_id)
    على validation_issues

## 9) الـ Checks التي يجب أن تدخل من البداية
هذه مهمة جدًا ولا تؤجل.

**9.1 ownership check**

في كل جدول فيه:

-   owner_scope

-   owner_organization_id

أضف check:

-   platform =\> org_id null

-   organization =\> org_id not null

**9.2 rule_sets target check**

أضف check يمنع:

-   أكثر من target field فعالة

-   أو target_scope لا يطابق الحقل المملوء

**9.3 rule_set_versions uniqueness**

امنع تكرار نفس version_number لنفس rule_set

**9.4 organization_offering_settings uniqueness**

امنع duplicate overlay لنفس الشركة ونفس
offering

**9.5 qualification question uniqueness**

امنع تكرار field_key داخل نفس question_set

## 10) ماذا يحصل عندما لا توجد Rules؟
هذه ليست table، لكنها قاعدة تنفيذية يجب أن تبنى
عليها queries والخدمات.

**القرار الرسمي**

إذا لم توجد rules منشورة ومطابقة لسياق
offering + qualification type:

**في الواجهة**

-   لا نظهر offering كخيار داعم لهذا النوع

**في الـ runtime**

-   evaluation_results.final_status = needs_review

-   reason مثل:

    -   no_published_rules_for_qualification

**هذا يجب أن يحترمه service layer من
البداية.**

## 11) أين يحدث الـ Normalization؟
القرار الرسمي:

**Raw input**

يحفظ في:

-   student_profile_answers.value_jsonb

-   student_profile_subjects.grade_raw

-   student_profile_subjects.subject_name_raw

**Normalized values**

تنتجها طبقة normalization وتُحفظ في:

-   student_profile_answers.normalized_value_jsonb

-   student_profile_subjects.subject_name_normalized

-   student_profile_subjects.grade_normalized_key

-   student_profile_subjects.grade_normalized_value

-   student_profiles.normalized_snapshot_jsonb

-   evaluation_runs.normalized_profile_snapshot_jsonb

**الواجهة لا تقرر normalized truth.**

## 12) ما الذي يدخل Sprint 1 فعلًا؟
إذا أردنا التنفيذ بعقلانية، Sprint 1 يجب أن يشمل
فقط:

**الجداول**

-   user_profiles

-   organizations

-   organization_branding

-   organization_memberships

-   countries

-   university_types

-   degrees

-   universities

-   faculties

-   programs

-   program_offerings

-   organization_offering_settings

-   qualification_families

-   qualification_types

-   qualification_question_sets

-   qualification_questions

-   qualification_question_options

-   student_profiles

-   student_profile_answers

-   student_profile_subjects

-   rule_types

-   rule_sets

-   rule_set_versions

-   rule_groups

-   rules

-   evaluation_runs

-   evaluation_results

-   evaluation_rule_traces

-   validation_issues

-   audit_logs

**ما لا يدخل Sprint 1**

-   import_batches

-   import_batch_rows

-   publish_actions

## 13) ما الذي يدخل Sprint 2؟
**الجداول**

-   import_batches

-   import_batch_rows

-   publish_actions

**الهدف**

-   إدخال CSV/Excel منظم

-   staging

-   validation

-   review

-   publish flow

## 14) ما الذي أعتبره خطرًا لو فعله Claude Code
هذه نقاط يجب أن تكون واضحة جدًا في أول prompt
تنفيذي:

1.  لا تدمج programs و program_offerings

2.  لا تحذف student_profile_subjects

3.  لا تعيد severity إلى مستوى rules

4.  لا تترك rule_sets بلا target check

5.  لا تنقل الـ normalization إلى الواجهة

6.  لا تضف جداول CRM

7.  لا تحول catalog أو rules core
    إلى JSON فقط

8.  لا تتجاوز rule_set_versions

9.  لا تبني imports قبل تثبيت core schema

10. لا تتجاهل needs_review كحالة رسمية

## 15) القرار التنفيذي النهائي
**Schema Map v1 المعتمد هو:**

-   **Migration 1** = النواة الكاملة للتشغيل

-   **Migration 2** = الاستيراد والنشر

-   **ما بعد ذلك** = الخصائص المؤجلة
