# System Architecture v1.1
وثيقة المعمارية الرسمية لمشروع Advisor Workspace
مرجع معماري معتمد يوضح طبقات النظام، الحدود، منطق التقييم، الحوكمة،
والتحقق قبل الانتقال إلى تصميم قاعدة البيانات.
---
## 1) الغرض من هذه الوثيقة
هذه الوثيقة تحدد المعمارية الرسمية التي سنبني عليها المنتج من
الصفر.
هي ليست خطة coding، وليست وصفًا عامًا، بل مرجع معماري ملزم.
أي تنفيذ لاحق عبر Claude Code أو غيره يجب أن يحترم ما هنا، ولا يغيره من
نفسه.
هذه المعمارية مبنية لتخدم نسخة أولى قابلة للإطلاق والبيع، مع بقاء
الطريق مفتوحًا للتوسع لاحقًا بدون تدمير الأساس.
## 2) ما الذي تغير من v1.0 إلى v1.1
### 2.1 إضافة طبقة تحقق واختبار حقيقية
لم يعد الاختبار يعني فقط unit tests.
المعمارية الآن تشمل: code testing، business verification، regression
protection، و pre-publish validation.
### 2.2 التعامل مع الشهادات المعقدة كنماذج فرعية متخصصة
لم يعد dynamic questions كافيًا وحده.
بعض أنواع الشهادات، خصوصًا البريطانية، تحتاج sub-model متخصص داخل طبقة
qualification/profile.
### 2.3 فصل أخطاء المحرك عن أخطاء البيانات
المعمارية الآن تعترف رسميًا بأن الفشل قد يأتي من: engine bug، rule
modeling bug، data entry bug، أو semantic misconfiguration.
وتضيف لذلك طبقة governance وتحكم قبل النشر.
## 3) الهدف المعماري الرئيسي
المعمارية مصممة لتحقيق 8 أهداف فقط:
1) محرك أهلية دقيق وقابل للتفسير
2) دعم اختلاف الجامعات والبرامج والشهادات بدون ترميز خاص لكل
حالة
3) إدارة سهلة لشخص غير تقني
4) عزل واضح بين بيانات المنصة وبيانات الشركات
5) قابلية بيع النظام لشركات متعددة
6) منع الترقيع الناتج عن الشهادات المعقدة
7) القدرة على التحقق من صحة النتائج ومن صحة البيانات
8) التوسع التدريجي بدون refactor كبير كل مرة
## 4) طبيعة النظام
هذا النظام ليس CRM. وهذا القرار ثابت.
ليس نظام رفع مستندات، أو تتبع طلبات، أو إدارة pipeline، أو إدارة تواصل،
أو إدارة مهام تشغيلية كاملة.
هذا النظام هو منصة عربية للشركات التعليمية، هدفها تنظيم بيانات القبول
الجامعي، وتشغيل محرك أهلية ومقارنة واضح، مع لوحة إدارة سهلة، بدون التحول
إلى CRM.
## 5) المبادئ المعمارية الحاكمة
### 5.1 فصل الطبقات إلزامي
يجب دائمًا الفصل بين: data، logic، UI، architecture.
### 5.2 المنطق لا يعيش داخل الواجهة
أي قرار أهلية أو تفسير قرار يجب أن يخرج من engine layer، لا من React
components أو صفحات الواجهة.
### 5.3 الإدخال المرن لا يعني فوضى
لا نستخدم أعمدة ثابتة لكل شرط ممكن، ولا JSON حر غير منضبط.
بل نستخدم typed rule registry، schemas واضحة، evaluators معروفة، وadmin
forms موجهة.
### 5.4 بعض أنواع الشهادات تستحق نماذج متخصصة
ليست كل الشهادات مجرد key/value form. الشهادة البريطانية مثال واضح على
ذلك.
### 5.5 الاختبار ليس طبقة أخيرة
التحقق من الصحة جزء من المعمارية من البداية، وليس مرحلة
متأخرة.
### 5.6 AI مساعد منظم، وليس صاحب قرار
AI يمكنه الاستخراج والتنظيم والاقتراح وتحويل مصادر خام إلى drafts، لكنه
لا يملك النشر النهائي أو تعديل الإنتاج مباشرة أو اتخاذ القرار النهائي
بدل المحرك.
### 5.7 الحماية من التوسع أهم من كثرة الخصائص
أي ميزة جديدة لا تدخل إذا كانت توسع المشروع باتجاه CRM أو تربك محرك
الأهلية أو تزيد تعقيد الإدارة بدون قيمة مباشرة.
## 6) الطبقات الأساسية للنظام
### 6.1 Identity & Tenant Layer
مسؤولة عن الشركات، المستخدمين، الأدوار، الصلاحيات، حدود الوصول، وعزل
البيانات بين الشركات.
### 6.2 Platform Library Layer
مسؤولة عن المكتبة المركزية التي تملكها المنصة: الجامعات الأساسية،
البرامج الأساسية، أنواع الشهادات، قواعد الأهلية الأساسية، والباقات
الجاهزة مستقبلاً.
### 6.3 Tenant Overlay Layer
مسؤولة عن ما الذي تم تفعيله لكل شركة، وما الذي تم إخفاؤه أو تعديله أو
تخصيصه، وما يظهر فعليًا للمستشارين داخل كل شركة.
### 6.4 Catalog Layer
مسؤولة عن الدول، أنواع الجامعات، الجامعات، الدرجات، البرامج، الـ
offerings، الأسعار، والرسوم الأساسية.
### 6.5 Qualification & Profile Layer
مسؤولة عن أنواع الشهادات، الأسئلة الديناميكية، بروفايل الطالب،
normalization، والنماذج المتخصصة للشهادات المعقدة.
### 6.6 Eligibility Logic Layer
مسؤولة عن rule sets، rule evaluation، decision outcome، explanation،
next step، financial notes، وadvisory notes.
### 6.7 Advisor Workflow Layer
مسؤولة عن direct evaluation flow، comparison flow، profile entry UX،
وresult presentation.
### 6.8 Admin & Data Governance Layer
مسؤولة عن الإدارة، الاستيراد، التحقق، draft/publish، audit trail،
semantic validation، وpre-publish preview.
## 7) الحدود بين الطبقات
### 7.1 Identity & Tenant Layer لا تعرف الأهلية
هذه الطبقة لا تتعامل مع شروط قبول أو أسعار أو نتائج تقييم؛ هي تعرف فقط
من المستخدم، لأي شركة ينتمي، ما دوره، وما الذي يحق له رؤيته أو
تعديله.
### 7.2 Catalog Layer لا تقرر القبول
هي توفر structured data لكنها لا تقول: الطالب مؤهل أو غير
مؤهل.
### 7.3 Qualification Layer لا تعرف الجامعة تفصيليًا
هي مسؤولة عن وصف الطالب أكاديميًا وتنظيم بيانات الشهادة وتجهيز ملفه
للتقييم، لكنها لا تحمل logic القبول لبرنامج معين.
### 7.4 Eligibility Layer لا تدير UX
هي تستقبل context وnormalized profile وactive rules، وتخرج result، ولا
يجب أن تعرف شكل الصفحة أو ترتيب tabs أو مكونات React.
### 7.5 Admin Layer لا تكتب runtime logic حرًا
دور الإدارة هو تكوين البيانات والقواعد ونشرها ومراجعتها، وليس كتابة
logic غير منضبط أو bypass للمعمارية.
## 8) النموذج العام للـ Multi-Tenant
### 8.1 القرار المعتمد
المنصة يجب أن تكون multi-tenant ready من البداية، لكن بدون تعقيد
enterprise مبالغ فيه.
### 8.2 الكيانات الأساسية
لدينا: Platform، Organizations، Users، Memberships، Roles.
### 8.3 المكتبة المركزية
أنت كمالك المنصة تحتفظ بمكتبة أساسية تشمل الجامعات، البرامج، الشروط،
أنواع الشهادات، configurations الأساسية، والباقات الجاهزة.
### 8.4 الطبقة الخاصة بكل شركة
كل شركة ترى فقط الجامعات المفعلة لها، المستخدمين التابعين لها،
البروفايلات التي حفظها فريقها، والتخصيصات المرتبطة بها.
### 8.5 فلسفة الملكية
الأصل: المنصة تملك الأصل، والشركة تملك التفعيل والاستخدام والتخصيص
الداخلي.
## 9) النموذج المفاهيمي للبيانات
لن أدخل هنا في أسماء جداول SQL النهائية، لكن هذا هو الهيكل المفاهيمي
الرسمي.
1) طبقة الهوية والشركات: organization، user، membership، role، branding
settings
2) طبقة الكتالوج: country، university_type، university، degree،
faculty، program، program_offering، tuition/pricing، fee
notes
3) طبقة الشهادات والبروفايل: qualification_family، qualification_type،
profile_schema، profile_question، student_profile، profile_answer،
normalized_profile_snapshot
4) طبقة المنطق: rule_set، rule_group، rule، rule_type، rule_version،
evaluation_result، evaluation_trace
5) طبقة الإدارة والنشر: draft change set، import batch، staging entity،
validation issue، publish action، audit log
## 10) Catalog Architecture
### 10.1 الوحدة الأساسية ليست الجامعة فقط
الوحدة الحقيقية التي سيجري عليها التقييم غالبًا هي Program Offering وليس
فقط الجامعة أو اسم البرنامج النظري.
### 10.2 لماذا نحتاج Program و Program Offering معًا؟
لأن البرنامج الواحد قد يختلف حسب intake أو سنة أو campus أو سعر أو رسوم
تقديم أو availability أو company activation.
إذًا: Program = الكيان الأكاديمي المنطقي، وProgram Offering = النسخة
القابلة للتقديم في سياق زمني/تشغيلي محدد.
### 10.3 Faculty ليست دائمًا أساسية
الكلية مفيدة تنظيميًا في بعض الجامعات، لكنها ليست دائمًا جزءًا لازمًا من
المنطق.
### 10.4 Pricing Model
الحد الأدنى المطلوب: annual tuition، application fee، extra fee note،
scholarship note. ولا نبني الآن محرك منح مستقل.
## 11) Qualification & Profile Architecture
هذه الطبقة واحدة من أهم الطبقات، وهي التي كانت سببًا رئيسيًا في مشاكل
المراحل السابقة.
ليست كل الشهادات متساوية.
1) النوع الأول: شهادات بسيطة نسبيًا، مثل كثير من الشهادات العربية وبعض
الحالات التي يكفي فيها dynamic schema وcontrolled question
flow.
2) النوع الثاني: شهادات معقدة بنيويًا، مثل British Curriculum وبعض
الحالات اللاحقة في الماستر والدراسات السابقة. هذه لا يكفي فيها key/value
answers فقط، بل تحتاج بنية أكاديمية داخلية أوضح.
## 12) المعالجة الخاصة للشهادة البريطانية
### 12.1 لماذا البريطانية حالة خاصة؟
لأننا نتعامل فيها مع O-Level / IGCSE وAS-Level وA-Level وأسماء المواد
وعدد المواد ودرجات المواد، وأحيانًا اشتراط مواد معينة أو عدد مواد بمستوى
معين أو حد أدنى في مادة بعينها.
### 12.2 القرار المعماري
الشهادة البريطانية يجب أن تمثل عبر Qualification Header وSubject
Records منظم، وليس مجرد حقول متناثرة.
كل مادة يجب أن تحمل على الأقل: subject_name، subject_level، grade،
normalized grade value، countable flag عند الحاجة، وnotes إن
لزم.
### 12.3 لماذا هذا أفضل؟
لأنه يسمح لاحقًا بتقييم شروط مثل وجود Math في A-Level بدرجة لا تقل عن C
أو وجود 3 A-Levels على الأقل أو التمييز بين O-Level وAS-Level
وA-Level.
### 12.4 ماذا يعني هذا للواجهة؟
الواجهة قد تظل ديناميكية وسهلة، لكن في الخلف لا نختزن البريطانية
كمجموعة فوضوية من الحقول، بل كـ normalized subject-based
structure.
### 12.5 قاعدة عامة خرجت من هذه النقطة
بعض أنواع الشهادات تتطلب تمثيلًا domain-specific داخل profile
layer.
## 13) Profile Capture & Normalization Pipeline
كل بروفايل طالب يجب أن يمر بهذه المراحل:
1) Raw Input: إجابات المستشار داخل الواجهة
2) Structural Validation: هل كل الحقول المطلوبة موجودة؟ وهل نوع
المدخلات صحيح؟
3) Domain Normalization: تحويل الإجابات إلى صيغة موحدة داخليًا، مثل
توحيد درجات اللغة أو استخراج عدد المواد
4) Normalized Profile Snapshot: هذا هو الكائن الداخلي الذي يتعامل معه
محرك الأهلية
5) Optional Save: إذا اختار المستشار حفظ البروفايل، يحفظ داخليًا داخل
الشركة فقط
## 14) Eligibility Logic Architecture
### 14.1 لماذا لا نستخدم أعمدة ثابتة كثيرة؟
لأن الشروط تختلف بشدة بين جامعة وأخرى وبرنامج وآخر ودرجة وأخرى وشهادة
وأخرى.
### 14.2 لماذا لا نستخدم JSON حر بالكامل؟
لأنك ستخسر الانضباط والـ validation والإدارة الموجهة وسهولة الاختبار
والقدرة على فهم أين المشكلة.
### 14.3 القرار المعتمد
نستخدم Typed Rule Registry Architecture: rule types معروفة، schema واضح
لكل نوع، evaluator واضح لكل نوع، admin form موجه لكل نوع، وrenderer واضح
لتفسير النتيجة.
## 15) Rule Model
### 15.1 Rule Set
يمثل حزمة القواعد الخاصة بسياق معين، مثل شروط برنامج أو درجة أو
qualification scope محدد.
### 15.2 Rule Group
يجمع قواعد ضمن معنى مشترك مثل academic requirements أو language
requirements أو subject requirements أو special
requirements.
### 15.3 Rule
أصغر وحدة منطقية قابلة للتقييم.
### 15.4 Rule Type
تعريف reusable لنوع القاعدة، ويجب أن يملك identifier ثابت، input
schema، admin config schema، evaluator function، explanation template،
وvalidation rules.
## 16) أمثلة على Rule Types الأساسية
في النسخة الأولى، نتوقع أنواعًا مثل:
-   [accepted_qualification_type]

-   [minimum_overall_grade]

-   [minimum_gpa]

-   [minimum_language_score]

-   [required_subject_exists]

-   [minimum_subject_grade]

-   [minimum_subject_count]

-   [accepted_previous_major]

-   [required_test_score]

-   [qualification_pathway_condition]

-   [conditional_language_gap]

-   [manual_review_flag]

## 17) Rule Resolution Strategy
المحرك لا يقرأ كل القواعد في العالم، بل يختار القواعد المناسبة
للسياق.
1) المدخلات: organization context، target program offering، degree،
qualification type، normalized profile
2) اختيار القواعد الصحيحة: القواعد العامة، القواعد الخاصة بالبرنامج،
القواعد الخاصة بنوع الشهادة، القواعد الخاصة بالدرجة، وأي override خاص
بالشركة
3) قاعدة الأولوية: Hard Reject ثم Conditional ثم Eligible ثم Advisory
Layer
## 18) Evaluation Result Model
كل نتيجة تقييم يجب أن تخرج في بنية موحدة.
-   [status]

-   [primary_reason]

-   [failed_rules]

-   [satisfied_rules]

-   [conditional_flags]

-   [next_step]

-   [tuition_summary]

-   [extra_fee_note]

-   [scholarship_note]

-   [advisory_notes]

-   [trace_metadata]

القيم الأساسية للحالة: eligible، conditional، not_eligible.
القيم النادرة: needs_review، incomplete_info.
## 19) Advisor Workflow Architecture
### 19.1 Direct Evaluation Flow
المستشار يختار الدولة ونوع الجامعة والجامعة ودرجة البرنامج والبرنامج
ونوع الشهادة، ثم يعبئ الأسئلة الديناميكية، ثم normalization ثم
evaluation ثم result rendering.
### 19.2 General Comparison Flow
المستشار يدخل نوع الشهادة والبروفايل الكامل وأنواع البرامج المطلوبة، ثم
النظام يجلب الـ offerings المفعلة للشركة ويقيمها دفعة واحدة ويرتب
النتائج: مؤهل، مشروط، غير مؤهل.
### 19.3 Program Search Comparison Flow
هذا مسار مهم لكنه ليس أعلى الأولويات، ويفترض وجود catalog منظم جدًا؛
لذلك يبقى Phase 1.5 أو Phase 2.
## 20) Admin Architecture
### 20.1 Catalog Admin
مسؤول عن الدول والجامعات والبرامج والـ offerings والأسعار والتفعيل
والإخفاء والتعطيل.
### 20.2 Rule Admin
مسؤول عن إنشاء rule sets، اختيار qualification scope، إدخال القواعد عبر
forms موجهة، ومراجعة أثر القواعد.
### 20.3 Import Admin
مسؤول عن رفع الملفات وmapping وpreview وstaging وvalidation
وpublish.
### 20.4 Draft/Publish Admin
مسؤول عن إبقاء التعديلات في draft ثم مراجعتها ونشرها.
### 20.5 Audit Admin
مسؤول عن تسجيل من عدل وماذا عدل ومتى وعلى أي كيان.
## 21) Data Governance Architecture
هذه الإضافة من أهم ما جاء في v1.1.
نحتاجها لأن النتيجة الخاطئة قد لا يكون سببها الكود، بل قاعدة مكتوبة
بشكل خاطئ أو configuration غير صحيح أو semantics غير مناسب أو mapping
خطأ في الاستيراد.
1) Engine Error: evaluator أو runtime logic فيه bug
2) Rule Modeling Error: semantics المختارة لا تمثل الواقع بشكل
صحيح
3) Data Entry Error: المدير أدخل قيمة خاطئة أو ربطًا خاطئًا
4) Import/Transformation Error: البيانات المستوردة من Excel أو AI تم
تحويلها بشكل خاطئ
لا يجوز مستقبلاً أن نقول: المحرك غلط، قبل أن نعرف أي نوع من هذه الأنواع
هو السبب الحقيقي.
## 22) Validation Architecture
### 22.1 Structural Validation
هل البيانات مكتملة؟ هل الحقول من النوع الصحيح؟ هل القيم في المدى
المتوقع؟
### 22.2 Referential Validation
هل المراجع موجودة وصحيحة؟ مثل وجود qualification type أو program أو
university_type صالح.
### 22.3 Semantic Validation
التحقق لا يقتصر على هل الشكل صحيح، بل هل المعنى الذي أدخله المدير
منطقي؟
مثال: هل هذا rule type مسموح استخدامه كشرط conditional أم reject فقط؟
وهل هناك تعارض بين قاعدتين؟
### 22.4 Conflict Detection
نحتاج القدرة على كشف تعارضات مثل شروط مستحيلة معًا أو تناقض بين قاعدة
عامة وقاعدة خاصة بلا أولوية واضحة.
## 23) Draft / Preview / Publish Architecture
لماذا نحتاج Draft؟ لأن النشر المباشر خطر جدًا في أنظمة
القرار.
1) Draft State: كل تعديل جديد كبير يدخل كـ draft
2) Preview State: قبل النشر يجب أن يرى المدير ما الذي تغير وما الأثر
المتوقع
3) Publish State: فقط بعد الموافقة، تنتقل البيانات للحالة
الحية
4) Minimum Implementation: staging tables + manual review + explicit
publish action + audit trail
## 24) Rule Preview / Dry Run Architecture
قبل نشر rule set جديد، نحتاج أن نجربه على sample profiles أو golden
cases أو بروفايلات مثال محفوظة.
الهدف هو منع نشر قاعدة تغير النتائج بشكل غير مقصود.
الشكل الأدنى في البداية: تشغيل rule set draft على 3 إلى 5 بروفايلات
اختبار مع رؤية النتيجة والسبب.
## 25) Import Pipeline Architecture
لا يدخل أي ملف خام مباشرة إلى الجداول الحية.
1) Raw Source: Excel / CSV / PDF / AI-extracted draft
2) Parse & Map: تحويل المصدر إلى صيغة داخلية قابلة للفهم
3) Staging: دخولها إلى staging area
4) Validation: structural + referential + semantic
5) Review: preview للمسؤول
6) Publish: نقل إلى live entities
AI يدخل فقط في extraction وstructuring وsuggestion، ولا يدخل في direct
publish أو bypass validation.
## 26) Verification & Testing Architecture
هذه واحدة من أهم إضافات v1.1.
النظام قد يمر بكل tests التقنية ويظل يعطي نتائج خاطئة في الواقع، لذلك
نحتاج طبقات تحقق رسمية:
1) Unit Tests: لاختبار evaluators الفردية
2) Integration Tests: لاختبار المسار الكامل من raw input إلى result
assembly
3) Golden Real-World Cases: مجموعة حالات واقعية ثابتة مع expected
output وreason
4) Regression Suite: كل bug حقيقي يكتشف لاحقًا يجب أن يتحول إلى case
دائم
5) Draft Validation Cases: أي rule set جديد مهم يجب أن يُجرب على مجموعة
حالات قبل النشر
نرفض مبدأ: كل tests شغالة إذًا النظام صحيح.
## 27) Acceptance Verification Model
لا نقول إن ميزة الأهلية جاهزة فقط لأن الصفحة تعمل والـ API يرجع
result.
الميزة تعد جاهزة عندما تمر unit tests وintegration tests وgolden cases
وتكون explanations مقبولة.
المرجع الأعلى في محرك الأهلية هو Real-world acceptance cases، وليس test
count فقط.
## 28) Delete / Disable Strategy
الأصل هو active / inactive وhidden / visible.
الحذف يجب أن يبقى موجودًا لأنه مطلوب، لكن بشكل محدود ومحكوم وواضح
الأثر.
الحد الأدنى الآمن: soft delete أولًا أو hard delete فقط إن لم توجد
dependencies حساسة.
## 29) Permission Model
1) Owner: إدارة الشركة، المستخدمين، الإعدادات والبراند، ورؤية كل شيء
داخل الشركة
2) Manager: إدارة المحتوى، إدخال الشروط، الاستيراد، التفعيل والإخفاء،
النشر، مراجعة التغييرات
3) Advisor: التقييم، المقارنة، حفظ بروفايلات داخلية، عرض
النتائج
Advisor لا يملك تعديل المكتبة أو الشروط أو الـ offerings.
## 30) Runtime Evaluation Pipeline
كل عملية تقييم يجب أن تمر بهذه الخطوات الرسمية:
1) Context Resolution
2) Profile Capture
3) Input Validation
4) Normalization
5) Rule Resolution
6) Evaluation Execution
7) Result Assembly
8) Explanation Rendering
هذه المراحل لا يجب أن تختلط مع مكونات الواجهة.
## 31) Financial Information Architecture
السعر جزء مهم لكنه ليس قلب محرك الأهلية.
-   [annual tuition]

-   [application fee]

-   [extra fee note]

-   [scholarship note]

لا نبني الآن scholarship engine أو financial planning tool أو ROI
calculator.
في النتيجة يمكن عرض السعر مع ملاحظة الرسوم والمنح المحتملة بدون خلطها
مع status الأساسي.
## 32) Arabic-First Architecture
العربية هي اللغة الأساسية الكاملة في النسخة الأولى.
هذا يعني: كل labels للمستخدم بالعربي، كل النتائج بالعربي، لوحة الإدارة
بالعربي، وRTL من البداية.
لكن المفاتيح التقنية وenums وidentifiers الداخلية يفضل أن تبقى
بالإنجليزية.
## 33) Security & Data Isolation
كل شركة يجب أن تكون معزولة عن الأخرى بالكامل.
نعتمد على Supabase Auth وRow Level Security وorganization scoping
وexplicit permission checks.
لا نسمح بأي query أو route يتجاوز organization context
ضمنيًا.
## 34) Observability & Auditability
نحتاج على الأقل audit trail يحتوي على actor وaction وtarget entity
وtimestamp وbefore/after summary عند الإمكان.
ونحتاج Evaluation Trace داخلي لبعض النتائج يوضح أي rules تم تقييمها وما
الذي نجح أو فشل؛ ليس لازم عرضه كاملًا للمستشار في أول نسخة، لكن يجب أن
يكون متاحًا داخليًا للتشخيص.
## 35) Non-Goals في v1.1
-   [CRM workflows]

-   [document upload]

-   [application tracking]

-   [student portal]

-   [visa workflow engine]

-   [training hub]

-   [advanced reports]

-   [billing system متقدم]

-   [marketplace للباقات]

-   [external CRM sync]

-   [white-label الكامل]

-   [custom domains]

-   [AI autonomous content publishing]

## 36) الهيكل البرمجي المقترح
نستخدم تنظيمًا modular داخل المشروع.
src/\
app/\
(auth)/\
dashboard/\
owner/\
manager/\
advisor/\
\
modules/\
auth/\
organizations/\
platform-library/\
tenant-overlay/\
catalog/\
qualifications/\
eligibility/\
advisor-workflows/\
admin/\
imports/\
governance/\
audit/\
testing-support/\
\
components/\
ui/\
forms/\
tables/\
cards/\
results/\
\
lib/\
db/\
auth/\
permissions/\
validation/\
normalization/\
utils/\
\
types/\
config/\
docs/
هذا أفضل لأنه يفصل المسؤوليات حسب domain modules، وليس فقط حسب نوع
الملف.
## 37) خطة التنفيذ المعمارية المرحلية
1) Phase 1: Foundation --- auth، organizations، memberships، roles،
tenant isolation
2) Phase 2: Catalog Core --- countries، university types، universities،
degrees، programs، offerings، pricing basics
3) Phase 3: Qualification System --- qualification families/types،
dynamic question definitions، profile capture، normalization
framework
4) Phase 4: British Qualification Specialized Model --- subject
records، level handling، grade normalization، count-based rules
support
5) Phase 5: Eligibility Engine v1 --- rule registry، core rule types،
evaluator pipeline، result model
6) Phase 6: Direct Evaluation Flow --- advisor UX، end-to-end
evaluation، explanation rendering
7) Phase 7: General Comparison Flow --- batch evaluation، sorting and
grouping، comparison results
8) Phase 8: Admin Core --- catalog admin، rule admin،
activation/inactivation، audit basics
9) Phase 9: Import & Governance --- staging، validation، review،
publish، semantic checks
10) Phase 10: Verification Suite --- golden cases، regression harness،
draft validation support
11) Phase 11: Polish & Release --- Arabic UX refinement، performance،
test hardening، production checklist
## 38) القرارات التي لا يسمح بتغييرها عشوائيًا
1) Program و Program Offering كيانان مختلفان
2) المنطق لا يعيش داخل الواجهة
3) لا أعمدة ثابتة لكل الشروط
4) ولا JSON حر بالكامل
5) هناك Platform Library منفصلة عن Tenant Overlay
6) الشهادة البريطانية تحتاج sub-model متخصص
7) لا نشر مباشر من AI أو import raw
8) التحقق الحقيقي يشمل golden cases
9) أخطاء البيانات ليست تلقائيًا أخطاء محرك
10) النظام ليس CRM
## 39) القرار التنفيذي النهائي
المعمارية v1.1 المعتمدة هي منصة عربية للشركات التعليمية، فيها مكتبة
مركزية للجامعات والشروط، وتفعيل وتخصيص لكل شركة، وكتالوج منظم مبني على
program offerings، وطبقة بروفايل وشهادات تدعم الشهادات المعقدة بشكل
صحيح، ومحرك أهلية typed وقابل للتفسير، وواجهات تقييم ومقارنة للمستشار،
ولوحة إدارة محكومة بالتحقق والمراجعة قبل النشر، مع اعتماد حالات اختبار
حقيقية كجزء أساسي من ضمان الصحة.
## 40) ما الخطوة التالية الصحيحة الآن
الخطوة التالية ليست coding بعد.
الخطوة التالية هي Database Design v1.
ويجب أن تشمل تحديدًا: ما هو platform-level، ما هو tenant-level، ما هو
overlay، كيف نمثل program vs offering، كيف نمثل qualification types، كيف
نمثل البريطانية بشكل منضبط، كيف نبني rule registry، كيف نبني staging /
validation / publish، كيف نخزن results و traces، وما الذي نؤجله من الـ
schema حتى لا نبالغ.