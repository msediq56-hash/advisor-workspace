# Database Design v1.1

## 1) هدف هذه الوثيقة
هذه الوثيقة هي **تصميم قاعدة البيانات الرسمي المعتمد** للنسخة الأولى من
المشروع، بعد دمج:

-   Project Definition v1

-   System Architecture v1.1

-   الملاحظات الحرجة الناتجة من تجربة V3.2

هذه الوثيقة ليست SQL نهائي بعد، لكنها المرجع الذي سنحوّله
لاحقًا إلى:

-   migrations

-   RLS policies

-   seed data

-   service layer bindings

-   eligibility engine integration

## 2) المبادئ الأساسية للتصميم
### 2.1 القرار الرئيسي
قاعدة البيانات تبنى على:

**Relational core + controlled JSONB at the edges**

يعني:

-   القلب الأساسي relational

-   الـ JSONB يستخدم فقط حيث المرونة مطلوبة
    فعلًا

-   لا نستخدم JSONB كبديل عن التصميم

-   ولا نغرق في أعمدة ثابتة لكل شرط محتمل

### 2.2 ما الذي يجب أن تحققه القاعدة
القاعدة يجب أن تحقق:

1.  فصل واضح بين **Platform data** و
    **Organization data**

2.  دعم multi-tenant من البداية

3.  تمثيل صحيح لـ:

    -   الجامعات

    -   البرامج

    -   الـ offerings

4.  دعم qualification models متعددة

5.  دعم special credential model للبريطانية

6.  دعم rule registry منضبط

7.  دعم draft / publish / validation

8.  حفظ evaluation results مع traces

9.  حفظ normalized snapshots

10. دعم التشخيص عندما يكون الخطأ من البيانات وليس من المحرك

### 2.3 ما لا تدعمه هذه النسخة
هذه الجداول ليست ضمن v1.1:

-   CRM data

-   student applications

-   document uploads

-   tasks/reminders

-   notifications

-   billing/subscriptions

-   visa workflows

-   training content

-   marketplace packs

-   advanced multilingual framework

## 3) قواعد ثابتة لا تتغير
### 3.1 قاعدة البيانات
-   PostgreSQL عبر Supabase

### 3.2 المعرّفات
-   كل الكيانات الأساسية تستخدم UUID

### 3.3 الأعمدة القياسية
معظم الجداول التشغيلية تحتوي على:

-   id

-   created_at

-   updated_at

-   created_by_user_id عند الحاجة

-   updated_by_user_id عند الحاجة

### 3.4 الحذف
الأصل:

-   is_active

-   أو status

-   أو visibility_status

الحذف الكامل ليس المسار الطبيعي.

### 3.5 المفاتيح التقنية
المفاتيح والـ enums بالإنجليزية\
والحقول الظاهرة للمستخدم بالعربية

### 3.6 schema
في v1.1 نستخدم:

-   public schema فقط

ولا نوزع الجداول على عدة PostgreSQL schemas من
البداية.

## 4) نموذج الملكية والعزل
### 4.1 أنواع الملكية
لدينا 3 مستويات من العلاقة مع البيانات:

**A) Platform-owned**

المنصة تملك:

-   الجامعات الأساسية

-   البرامج الأساسية

-   offerings الأساسية

-   qualification types الأساسية

-   rule types

-   rule sets الأساسية

**B) Organization-owned**

الشركة تملك:

-   المستخدمين

-   branding

-   saved profiles

-   sample profiles الخاصة بها

-   أي universities/programs/rules أضافتها هي
    لنفسها

**C) Organization overlay**

الشركة لا تملك الأصل، لكنها تملك:

-   التفعيل

-   الإخفاء

-   override لبعض الحقول

-   internal notes

### 4.2 الحقول المعتمدة
الكيانات القابلة للملكية تحتاج:

-   owner_scope

-   owner_organization_id

**قاعدة إلزامية**

-   إذا owner_scope = platform → owner_organization_id يجب
    أن يكون null

-   إذا owner_scope = organization → owner_organization_id
    يجب ألا يكون null

## 5) مجموعات الجداول الرئيسية
قاعدة البيانات تنقسم منطقيًا إلى 8 مجموعات:

1.  Identity & Organization

2.  Catalog Core

3.  Tenant Activation & Overlay

4.  Qualification & Profile

5.  Rule Registry

6.  Evaluation Runtime

7.  Import / Validation / Publish

8.  Audit

## 6) Identity & Organization Tables
### 6.1 user_profiles
طبقة تطبيقية فوق auth.users

**الحقول الأساسية**

-   id = auth.users.id

-   full_name

-   email_normalized

-   is_active

-   created_at

-   updated_at

### 6.2 organizations
**الحقول الأساسية**

-   id

-   slug

-   name_ar

-   status

-   created_at

-   updated_at

**القيم المقترحة لـ status**

-   active

-   inactive

### 6.3 organization_branding
**الحقول الأساسية**

-   organization_id

-   display_name_ar

-   logo_url

-   primary_color

-   secondary_color

-   created_at

-   updated_at

### 6.4 organization_memberships
**الحقول الأساسية**

-   id

-   organization_id

-   user_id

-   role_key

-   membership_status

-   created_at

-   updated_at

**القيم المقترحة لـ role_key**

-   owner

-   manager

-   advisor

**القيود**

-   unique (organization_id, user_id)

## 7) Catalog Core Tables
### 7.1 countries
**الحقول**

-   id

-   code

-   name_ar

-   is_active

### 7.2 university_types
**الحقول**

-   id

-   key

-   name_ar

-   is_active

**أمثلة**

-   private

-   public

### 7.3 degrees
**الحقول**

-   id

-   key

-   name_ar

-   level_rank

-   is_active

**أمثلة**

-   foundation

-   bachelor

-   master

-   doctorate

### 7.4 universities
**الحقول**

-   id

-   owner_scope

-   owner_organization_id nullable

-   country_id

-   university_type_id

-   name_ar

-   name_en nullable

-   is_active

-   created_at

-   updated_at

### 7.5 faculties
اختياري تنظيميًا

**الحقول**

-   id

-   university_id

-   name_ar

-   sort_order

-   is_active

### 7.6 programs
الكيان الأكاديمي المنطقي

**الحقول**

-   id

-   owner_scope

-   owner_organization_id nullable

-   university_id

-   faculty_id nullable

-   degree_id

-   program_code nullable

-   title_ar

-   title_en nullable

-   canonical_search_title_ar

-   is_active

-   created_at

-   updated_at

### 7.7 program_offerings
الكيان التشغيلي الأساسي للتقييم

**الحقول**

-   id

-   owner_scope

-   owner_organization_id nullable

-   program_id

-   intake_label_ar

-   intake_term_key nullable

-   intake_year nullable

-   campus_name_ar nullable

-   study_mode_key nullable

-   duration_months nullable

-   teaching_language_key nullable

-   annual_tuition_amount nullable

-   currency_code

-   application_fee_amount nullable

-   extra_fee_note_ar nullable

-   scholarship_note_ar nullable

-   is_active

-   created_at

-   updated_at

**قرار ثابت**

program و program_offering ليسا نفس الشيء، ولا يدمجان في
جدول واحد.

## 8) Tenant Activation & Overlay Tables
### 8.1 organization_offering_settings
هذا الجدول هو طبقة التفعيل والظهور للشركة.

**الحقول**

-   id

-   organization_id

-   program_offering_id

-   visibility_status

-   tuition_override_amount nullable

-   application_fee_override_amount nullable

-   extra_fee_note_override_ar nullable

-   scholarship_note_override_ar nullable

-   internal_note_ar nullable

-   created_at

-   updated_at

**القيم المقترحة لـ visibility_status**

-   active

-   hidden

-   inactive

**القيود**

-   unique (organization_id, program_offering_id)

**8.2 لماذا لا نضيف organization_university_settings
الآن؟**

لا نحتاجه في v1.1\
الظهور على مستوى offering يكفي، ويمكن اشتقاق الجامعات
والبرامج منه.

## 9) Qualification & Profile Tables
### 9.1 qualification_families
**الحقول**

-   id

-   key

-   name_ar

-   academic_stage_key

-   is_active

**أمثلة**

-   arabic_secondary

-   american_high_school

-   british_curriculum

-   ib

-   bachelor_degree

-   master_degree

### 9.2 qualification_types
**الحقول**

-   id

-   owner_scope

-   owner_organization_id nullable

-   family_id

-   key

-   name_ar

-   complexity_model

-   is_active

**القيم المقترحة لـ complexity_model**

-   simple_form

-   subject_based

**قرار مهم**

إذا complexity_model = subject_based فهذا يعني أن النوع
يحتاج دعم subject records، وليس answers
فقط.

### 9.3 qualification_question_sets
**الحقول**

-   id

-   qualification_type_id

-   version_number

-   is_active

-   created_at

### 9.4 qualification_questions
**الحقول**

-   id

-   question_set_id

-   field_key

-   label_ar

-   input_type

-   is_required

-   order_index

-   help_text_ar nullable

-   config_jsonb nullable

-   visibility_rule_jsonb nullable

-   is_active

### 9.5 qualification_question_options
**الحقول**

-   id

-   question_id

-   option_key

-   label_ar

-   sort_order

-   is_active

### 9.6 student_profiles
**الحقول**

-   id

-   organization_id

-   created_by_user_id

-   profile_kind

-   qualification_type_id

-   title_ar nullable

-   profile_status

-   normalized_snapshot_jsonb nullable

-   last_evaluated_at nullable

-   created_at

-   updated_at

**القيم المقترحة لـ profile_kind**

-   runtime

-   sample

**القيم المقترحة لـ profile_status**

-   draft

-   finalized

**قرار مهم**

normalized_snapshot_jsonb لا يُملأ من الواجهة، بل من طبقة
normalization بعد التحقق من المدخلات.

### 9.7 student_profile_answers
**الحقول**

-   id

-   profile_id

-   question_id

-   value_jsonb

-   normalized_value_jsonb nullable

-   created_at

-   updated_at

## 10) British / Subject-based Specialized Tables
هذه ليست إضافة جانبية، بل جزء أساسي من v1.1.

### 10.1 student_profile_subjects
**الحقول**

-   id

-   profile_id

-   segment_key

-   subject_name_raw

-   subject_name_normalized

-   subject_level_key

-   grade_raw

-   grade_normalized_key

-   grade_normalized_value nullable

-   is_countable

-   note_ar nullable

-   created_at

**القيم المقترحة لـ segment_key**

-   o_level

-   as_level

-   a_level

-   other

### 10.2 قرار مهم عن الـ normalization
الـ normalization للمواد والدرجات يحدث في:

**Normalization Layer في السيرفر / التطبيق**\
وليس في الواجهة.

**معنى ذلك**

-   الواجهة تجمع raw data

-   النظام ينتج normalized forms

-   المحرك يقرأ normalized values فقط

### 10.3 لماذا هذا مهم؟
حتى لا تتكرر مشاكل مثل:

-   سلم درجات بريطاني مختلف

-   تفسير grade letters بشكل متناقض

-   اختلاف behavior بين الإدخال اليدوي
    والاستيراد

## 11) سياسة غياب القواعد (No-rules behavior)
هذه نقطة جديدة ومهمة ويجب أن تنعكس في التصميم.

### 11.1 القرار الرسمي
إذا لم توجد rules منشورة ومطابقة لسياق التقييم ونوع
الشهادة:

**في الواجهة**

-   لا نظهر offering كخيار قابل للتقييم في
    Direct Evaluation بعد اختيار qualification type

-   وفي comparison لا نقيّم offerings غير
    المدعومة لهذا qualification type

**في الـ runtime**

إذا وصل الطلب رغم ذلك:

-   نعيد status = needs_review

-   مع سبب ثابت مثل:

    -   no_published_rules_for_qualification\
        أو

    -   unsupported_rule_context

### 11.2 لماذا هذا أفضل؟
لأنه يمنع:

-   نتائج مضللة

-   eligible/not eligible مبنية على غياب قواعد

-   تناقض سلوك النظام بين صفحة وأخرى

### 11.3 هل يحتاج جدولًا مستقلًا؟
لا.\
هذه **سياسة محرك** **+ query behavior** وليست كيان بيانات
مستقل.

لكنها تؤثر على:

-   rule resolution

-   UI filtering

-   evaluation result statuses

## 12) Rule Registry Tables
هذه أهم مجموعة جداول في النظام.

### 12.1 rule_types
**الحقول**

-   id

-   key

-   name_ar

-   config_schema_jsonb

-   evaluator_key

-   supported_target_scopes_jsonb

-   supported_complexity_models_jsonb

-   allowed_group_severities_jsonb

-   is_active

**قرار مهم**

لم نعد نستخدم allowed_severities على مستوى
rule الفردية.\
السبب: في v1.1 جعلنا severity **على
مستوى group** لتقليل الغموض.

### 12.2 rule_sets
تمثل حزمة قواعد لسياق محدد.

**الحقول**

-   id

-   owner_scope

-   owner_organization_id nullable

-   target_scope

-   target_university_id nullable

-   target_program_id nullable

-   target_program_offering_id nullable

-   qualification_type_id nullable

-   name_ar

-   description_ar nullable

-   priority_order

-   is_active

-   created_at

-   updated_at

**القيم المقترحة لـ target_scope**

-   university

-   program

-   offering

### 12.3 القيد المهم جدًا على rule_sets
هذه من أهم تعديلات v1.1:

**قاعدة target واحدة فقط**

-   إذا target_scope = university

    -   target_university_id يجب أن يكون non-null

    -   target_program_id و target_program_offering_id يجب
        أن يكونا null

-   إذا target_scope = program

    -   target_program_id يجب أن يكون non-null

    -   الباقي null

-   إذا target_scope = offering

    -   target_program_offering_id يجب أن يكون non-null

    -   الباقي null

### 12.4 لماذا هذا القرار؟
حتى نمنع حالات غريبة مثل:

-   rule set يشير إلى offering وبرنامج وجامعة
    متضاربة

-   أو يترك target fields بلا معنى

**ملاحظة**

الجامعة والبرنامج المرتبطان بالـ offering يمكن اشتقاقهما
لاحقًا عبر joins، فلا حاجة لتكرارها داخل
rule_sets.

### 12.5 rule_set_versions
هذا الجدول إلزامي.

**الحقول**

-   id

-   rule_set_id

-   version_number

-   lifecycle_status

-   based_on_version_id nullable

-   change_summary_ar nullable

-   created_by_user_id

-   published_by_user_id nullable

-   created_at

-   published_at nullable

**القيم المقترحة لـ lifecycle_status**

-   draft

-   published

-   archived

**قيد مهم**

لا يسمح بأكثر من version منشورة واحدة لنفس
rule_set.

### 12.6 rule_groups
هذه من أهم التعديلات.

**الحقول**

-   id

-   rule_set_version_id

-   group_key

-   label_ar

-   evaluation_mode

-   group_severity

-   order_index

**القيم المقترحة لـ evaluation_mode**

-   all_required

-   any_of

-   advisory_only

**القيم المقترحة لـ group_severity**

-   blocking

-   conditional

-   advisory

-   review

### 12.7 لماذا أضفنا group_severity؟
لأننا نريد إزالة الغموض بين:

-   evaluation_mode

-   و severity

**القرار الرسمي**

في v1.1:

**severity تُعرّف على مستوى المجموعة، وليس على مستوى كل
rule**

هذا يجعل السلوك واضحًا جدًا.

### 12.8 rules
**الحقول**

-   id

-   rule_group_id

-   rule_type_id

-   config_jsonb

-   message_override_ar nullable

-   order_index

-   is_active

**لماذا حذفنا severity من
rules؟**

لأن خلط severities داخل نفس المجموعة كان سيفتح غموضًا
منطقيًا كبيرًا.

## 13) تفسير evaluation_mode + group_severity
هذه نقطة يجب أن تكون محسومة قبل التنفيذ.

### 13.1 all_required
المعنى:

-   كل rules في المجموعة يجب أن تنجح

-   إذا فشلت واحدة، تفشل المجموعة

**أثر الفشل حسب group_severity**

-   blocking → النتيجة النهائية قد تصبح not_eligible

-   conditional → النتيجة قد تصبح conditional

-   advisory → تضيف advisory note فقط

-   review → قد تنتج needs_review

### 13.2 any_of
المعنى:

-   يكفي نجاح rule واحدة داخل المجموعة

-   إذا لم تنجح أي واحدة، تعتبر المجموعة فاشلة

**أثر الفشل حسب group_severity**

نفس المنطق أعلاه، لكن على مستوى المجموعة ككل

### 13.3 advisory_only
المعنى:

-   هذه المجموعة لا تؤثر على status الرئيسي

-   حتى لو فشلت كل rules، لا تنقل الحالة إلى
    not_eligible أو conditional

-   فقط تنتج note أو recommendation

### 13.4 لماذا هذا التبسيط مهم؟
لأنه يجعل المحرك قابلًا للفهم والاختبار، ويمنع تضارب تفسير
any_of مع blocking.

## 14) Rule Resolution داخل الـ schema
المحرك يجب أن يستطيع تحميل القواعد بهذا الترتيب:

1.  rule sets المنشورة فقط

2.  المطابقة على target scope

3.  المطابقة على qualification type إن وجد

4.  تفضيل organization-owned override عند
    وجوده

5.  وإلا fallback إلى platform-owned

6.  ترتيب حسب priority_order

### 14.1 ماذا لو لا توجد rules؟
هنا تطبق سياسة القسم 11:

-   UI hides unsupported contexts

-   runtime returns needs_review

## 15) Evaluation Runtime Tables
### 15.1 evaluation_runs
**الحقول**

-   id

-   organization_id

-   actor_user_id

-   flow_type

-   source_profile_id nullable

-   qualification_type_id

-   normalized_profile_snapshot_jsonb

-   request_context_jsonb

-   created_at

**القيم المقترحة لـ flow_type**

-   direct_evaluation

-   general_comparison

-   program_search

### 15.2 evaluation_results
**الحقول**

-   id

-   evaluation_run_id

-   program_offering_id

-   final_status

-   primary_reason_ar

-   next_step_ar nullable

-   tuition_amount_snapshot nullable

-   currency_code nullable

-   application_fee_snapshot nullable

-   extra_fee_note_snapshot_ar nullable

-   scholarship_note_snapshot_ar nullable

-   advisory_notes_jsonb nullable

-   sort_bucket

-   matched_rules_count

-   failed_groups_count

-   conditional_groups_count

-   trace_summary_jsonb nullable

-   created_at

**القيم المقترحة لـ final_status**

-   eligible

-   conditional

-   not_eligible

-   needs_review

-   incomplete_info

**ملاحظة**

استبدلنا count على مستوى rules فقط بمؤشرات
أوضح جزئيًا على مستوى groups لأن group أصبحت هي
الوحدة الحاكمة في severity.

### 15.3 evaluation_rule_traces
**الحقول**

-   id

-   evaluation_result_id

-   rule_set_version_id

-   rule_group_id

-   rule_id

-   rule_type_key_snapshot

-   group_severity_snapshot

-   group_evaluation_mode_snapshot

-   outcome

-   explanation_ar

-   created_at

**القيم المقترحة لـ outcome**

-   passed

-   failed

-   triggered

-   skipped

**لماذا هذا الجدول مهم؟**

حتى نقدر لاحقًا أن نعرف:

-   أي group فشلت

-   أي rule داخلها سبب المشكلة

-   هل المشكلة من البيانات أم من المحرك أم من modeling

## 16) Import / Validation / Publish Tables
### 16.1 import_batches
**الحقول**

-   id

-   organization_id nullable

-   import_target_scope

-   source_kind

-   entity_scope

-   status

-   source_file_name nullable

-   source_file_url nullable

-   started_by_user_id

-   started_at

-   finished_at nullable

-   summary_jsonb nullable

**القيم**

-   import_target_scope: platform_library / organization_library

-   source_kind: csv / excel / pdf / ai_structured

-   entity_scope: catalog / rules / mixed

-   status: uploaded / parsing / validated / review_required / published
    / failed

### 16.2 import_batch_rows
**الحقول**

-   id

-   import_batch_id

-   entity_type

-   source_row_number nullable

-   raw_payload_jsonb

-   mapped_payload_jsonb nullable

-   row_status

-   target_record_id nullable

-   created_at

-   updated_at

**القيم**

-   entity_type: university / program / offering / rule_set / rule_group
    / rule

-   row_status: pending / valid / invalid / published / skipped

### 16.3 validation_issues
**الحقول**

-   id

-   parent_entity_type

-   parent_entity_id

-   severity

-   issue_code

-   issue_message_ar

-   field_path nullable

-   suggested_fix_ar nullable

-   is_resolved

-   created_at

**القيم المقترحة لـ severity**

-   error

-   warning

-   info

**16.4 أنواع الـ validation التي يجب أن تمثل
هنا**

-   structural validation

-   referential validation

-   semantic validation

**semantic examples**

-   target_scope لا يطابق target field

-   rule_type غير صالح داخل group severity
    معينة

-   qualification type لا يطابق complexity model
    المطلوب

-   offering غير مفعل أو غير مدعوم لهذا qualification type

### 16.5 publish_actions
**الحقول**

-   id

-   organization_id nullable

-   actor_user_id

-   source_type

-   source_id

-   publish_scope

-   summary_jsonb nullable

-   published_at

**القيم**

-   source_type: import_batch / rule_set_version / manual_edit

## 17) Audit Tables
### 17.1 audit_logs
**الحقول**

-   id

-   organization_id nullable

-   actor_user_id

-   entity_type

-   entity_id

-   action_type

-   before_snapshot_jsonb nullable

-   after_snapshot_jsonb nullable

-   created_at

**القيم**

-   create

-   update

-   publish

-   deactivate

-   hide

-   delete

-   restore

## 18) أين نستخدم JSONB وأين لا
### 18.1 JSONB مسموح في:
-   question config

-   question visibility rules

-   rule type config schema

-   rule config

-   import raw payloads

-   import mapped payloads

-   normalized snapshots

-   request context

-   advisory notes

-   trace summary

-   audit snapshots

### 18.2 JSONB غير مقبول كبديل عن:
-   universities

-   programs

-   offerings

-   memberships

-   qualification types

-   subject records

-   rule set hierarchy

-   activation settings

-   financial core fields

## 19) الفهارس المطلوبة مبدئيًا
### 19.1 Identity
-   index على organization_memberships.user_id

-   unique (organization_id, user_id)

### 19.2 Catalog
-   index على universities.country_id

-   index على universities.university_type_id

-   index على programs.university_id

-   index على programs.degree_id

-   index على programs.canonical_search_title_ar

-   index على program_offerings.program_id

### 19.3 Overlay
-   unique (organization_id, program_offering_id)

### 19.4 Qualification
-   index على qualification_types.family_id

-   index على student_profiles.organization_id

-   index على student_profile_answers.profile_id

-   index على student_profile_subjects.profile_id

### 19.5 Rules
-   index على rule_sets.target_scope

-   index على rule_sets.target_university_id

-   index على rule_sets.target_program_id

-   index على rule_sets.target_program_offering_id

-   index على rule_sets.qualification_type_id

-   unique (rule_set_id, version_number)

-   index على rule_groups.rule_set_version_id

-   index على rules.rule_group_id

### 19.6 Evaluation
-   index على evaluation_runs.organization_id

-   index على evaluation_results.evaluation_run_id

-   index على evaluation_results.final_status

-   index على evaluation_rule_traces.evaluation_result_id

### 19.7 Governance
-   index على import_batches.status

-   index على (validation_issues.parent_entity_type,
    validation_issues.parent_entity_id)

## 20) قيود منطقية مهمة
### 20.1 ownership constraints
-   owner_scope = platform → owner_organization_id IS NULL

-   owner_scope = organization → owner_organization_id IS NOT NULL

### 20.2 rule set target constraints
-   target field واحدة فقط حسب target_scope

### 20.3 published rule version constraint
-   لا يوجد أكثر من version منشورة لنفس
    rule_set

### 20.4 qualification complexity constraint
-   إذا complexity_model = subject_based

    -   فالـ normalization pipeline يجب أن
        يدعم subject records

    -   والمحرك يجب أن يتوقعها

### 20.5 evaluation result integrity
-   لا توجد evaluation_results بلا
    evaluation_run_id

-   ولا بلا program_offering_id

## 21) كيف يخدم الـ schema التشخيص الصحيح
هذه نقطة مهمة جدًا بسبب مشاكل V3.2.

### 21.1 أنواع الفشل التي يجب أن نميزها
لدينا 4 أنواع:

-   Engine error

-   Rule modeling error

-   Data entry error

-   Import/transformation error

### 21.2 كيف تساعد الجداول على هذا؟
-   validation_issues تساعد على كشف مشاكل الإدخال والمعنى

-   evaluation_rule_traces تساعد على كشف سلوك المحرك

-   rule_set_versions تمنع خلط drafts بالمنشور

-   normalized snapshots تمنع ضياع السياق التاريخي

## 22) كيف يخدم الـ schema real-world verification
### 22.1 القرار
الـ golden cases المرجعية الحقيقية يجب أن تبقى
في:

-   test fixtures داخل repo

-   acceptance datasets

لكن داخل التطبيق نحتاج دعمًا تشغيليًا بسيطًا.

### 22.2 الحل
نستخدم:

-   student_profiles.profile_kind = sample

حتى نستطيع لاحقًا:

-   اختبار draft rules

-   تشغيل dry runs

-   عمل previews قبل النشر

## 23) ما الذي نؤجله من الـ schema
هذه الجداول مؤجلة عمدًا:

-   document_requirements

-   visa_notes

-   training_modules

-   whatsapp_templates

-   notifications

-   tasks

-   billing tables

-   crm_integrations

-   marketplace packages

-   full translation tables

-   advanced scholarship eligibility

**24) ما الذي أعتبره خطأ لو حاول Claude Code
يعمله**

هذه نقاط يجب منعها:

1.  دمج program و program_offering

2.  إعادة severity إلى مستوى rule الفردي داخل
    نفس group بدون قرار صريح

3.  ترك rule_sets تسمح بأكثر من target
    منطقي

4.  جعل الواجهة هي مصدر الـ normalization

5.  حذف student_profile_subjects

6.  تجاهل سياسة no-rules behavior

7.  حفظ النتائج بدون snapshots

8.  عدم إنشاء rule_set_versions

9.  القفز إلى CRM tables

10. تحويل معظم الـ schema إلى JSONB

## 25) القرار التنفيذي النهائي
**Database Design v1.1 المعتمد هو:**

**قاعدة بيانات PostgreSQL متعددة المستأجرين منطقيًا، فيها
مكتبة منصة مركزية، وطبقة تفعيل وتخصيص لكل شركة، وكتالوج أكاديمي مبني
على program offerings، وطبقة qualifications
تدعم النماذج البسيطة والنماذج المعقدة مثل البريطانية، وrule
registry مضبوط مع target scoping واضح
وversioning، ومجموعات rules موحدة
severity لتبسيط المنطق، وجداول تشغيل تحفظ normalized
snapshots وfinancial snapshots وtraces،
وطبقة governance تمنع الأخطاء قبل النشر.**

بالعربي العملي:

**قاعدة بيانات مرتبة، تحافظ على الأصل عندك، وتسمح لكل شركة تستخدم وتخصص
ما تحتاجه، وتمنع الفوضى في الـ rules، وتعالج البريطانية صح،
وتوضح ماذا يحصل إذا ما فيه rules، وتحفظ النتائج بطريقة
قابلة للمراجعة والتشخيص.**
