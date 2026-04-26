# Handoff

## Project

Advisor Workspace

## Current status

**Phase 1 is operationally closed.**
Phase 1 debt fixes have been applied.
Phase 2 Catalog Core is implemented (read-only service layer).
Phase 3 simple-form qualification preparation path is implemented.
Phase 4 British specialized qualification preparation path is implemented end-to-end through raw assembly, normalization, level handling, and British preparation services.
Phase 4 British count-based rules support baseline is implemented.
Phase 4 Evaluation rule context resolver with execution-ready rule group/rule loading is implemented.
Phase 5 Evaluation execution baseline is implemented.
Phase 6 narrow subject-based evaluator extensions are implemented (`minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`).
Phase 6 first simple-form evaluator baseline is implemented (`minimum_overall_grade`).
Phase 6 first cross-family evaluator baseline is implemented (`accepted_qualification_type`).
Phase 5 Result assembly baseline is implemented.
Phase 5 Explanation rendering baseline is implemented (primary reason, next step, advisory notes, trace-level rule explanations — all Arabic).

Four runtime repairs have been applied: (1) result assembly now returns `needs_review` when all groups are skipped instead of false `eligible`; (2) group outcome derivation now respects `any_of` evaluation mode instead of treating all groups as `all_required`; (3) `sourceProfileId` is now ownership-guarded at the server-side invocation boundary before workflow/persistence delegation; (4) direct-evaluation persistence is now atomic via a database-backed RPC function instead of sequential client-side staged inserts. Two post-repair hardening micro-slices have been applied: (1) the atomic persistence RPC function execution boundary was locked down via migration 9; (2) outward-facing source-profile route errors were unified and raw 500 internal messages were redacted.

British, simple-form, and generic multi-family direct-evaluation in-memory orchestration baselines are implemented. Direct-evaluation atomic persistence baseline, run-and-persist workflow baseline, first server-side invocation boundary, and first direct-evaluation POST route handler are implemented. Route layer is hardened (request/response/error-response schemas, narrow error classification, source-profile error unification, 500 message redaction). British and simple-form golden-case verification baselines are implemented and fully expanded — both cover all five current-state final-status outcomes (`eligible`, `not_eligible`, `conditional`, `needs_review`, advisory non-downgrade preserving `eligible`). Verification baseline is complete across all current runtime layers (307 tests across 20 test files via Vitest). No business UI. No import pipeline. No admin UI. No CRM features.

Milestone 2B (Constructor CS British A-Level supported-subset seed + smoke) is complete and accepted. Commit `1e67cec` added two local-only TypeScript scripts and nothing else: `scripts/seed/demo-seed.ts` (idempotent, localhost-only-guarded seed of Constructor University → Computer Science Bachelor → Fall 2026 Bremen offering, plus the supported-subset rule set) and `scripts/smoke/direct-evaluation-demo-smoke.ts` (pure-runtime Direct Evaluation smoke that composes the British assemble → prepare → execute → assemble-result → render path, then writes through `persist_direct_evaluation_run_atomic`). Validation passed: `npx supabase db reset` applied all 17 migrations, the seed first run PASS 23/23, the seed second run PASS 23/23 (idempotent — advisor auth user reused), the smoke PASS 16/16 (4 traces persisted, `finalStatus === "eligible"`), `npm test` 305/305 across 19 test files (the test suite at the time of Milestone 2B's validation), `npm run typecheck` clean. The British runtime grade scale is canonical and ordinal (A* = 8, A = 7, B = 6, C = 5, D = 4, E = 3, F = 2, G = 1, U = 0); the seed and smoke use `C = 5` for both `minimumNormalizedGradeValue` and `minimumGradeValue`. The smoke uses raw British grade letters and exercises the real normalizer (Mathematics A → `matchedGradeValue === 7`, `requiredMinimumGradeValue === 5`). Source data files (`source data/`) remain local-only and were not committed; `.claude/` and `AGENTS.md` were not committed. Arabic secondary was intentionally deferred — the supported-subset rule set explicitly does NOT enforce full Constructor admission logic. No business UI, no admin UI, no import pipeline, no CRM features exist.

Milestone 2B.1 (British grade-scale fixture alignment) is complete and accepted. Commit `4395f38` aligned five British test/fixture files with the canonical runtime ordinal scale (uppercase `gradeNormalizedKey`, ordinal `normalizedGradeValue` 0–8) and added one narrow normalizer scale-lock regression test (`src/modules/qualification/normalize-british-subject-based-profile.test.ts`). Old British percentile-style fixture values (e.g. `A = 80`, `B = 70`, `C = 60`, lowercase grade keys) were removed from British normalized fixture contexts; British rule-config thresholds were re-derived per test to preserve each test's original pass/fail intent (not blindly divided by 10); the five British golden-case expected statuses (`eligible`, `not_eligible`, `conditional`, `needs_review`, advisory non-downgrade preserving `eligible`) all hold under the ordinal scale. Simple-form percentage values (`finalAverage` / `gpa` / `totalPoints` / `minimum_overall_grade` mock returns) were intentionally NOT rescaled because they belong to family-specific scales, not to the British grade scale. No production runtime code changed — the normalizer, evaluator implementations, seed/smoke scripts, migrations, and `package.json` were untouched. Validation passed: `npm test` 307/307 across 20 test files (was 305/305 across 19; +2 tests and +1 file from the new normalizer scale-lock test); `npm run typecheck` clean.

## Authoritative references

1. `docs/project-definition.md`
2. `docs/system-architecture-v1.1.md`
3. `docs/database-design-v1.1.md`
4. `docs/schema-map-v1.md`

## What has been finalized

- Product definition
- System architecture
- Database design
- Schema map
- Core scope boundaries
- Role model
- Multi-tenant direction
- Rule registry direction
- British qualification handling direction
- No-rules runtime behavior
- Normalization ownership

## What has been implemented

### Schema

- Migration 1: core schema (`supabase/migrations/00001_core_schema.sql`)
  - 17 enums, 30 tables, 23 indexes, 3 partial unique indexes
  - Covers: Identity, Catalog, Overlay, Qualification, Rules, Evaluation, Governance
  - Runtime-validated via `supabase db reset`
- Migration 2: identity RLS baseline (`00002_identity_rls_baseline.sql`)
- Migration 3: organization branding RLS (`00003_organization_branding_rls.sql`)
- Migration 4: organization memberships owner-read RLS (`00004_organization_memberships_owner_read_rls.sql`)
- Migration 5: user profiles owner-read RLS (`00005_user_profiles_owner_read_rls.sql`)
- Migration 6: recursive RLS fix (`00006_fix_recursive_identity_rls.sql`)
  - Two SECURITY DEFINER helpers (`is_active_member_of`, `is_owner_of`)
- Migration 7: organization_offering_settings RLS (`00007_organization_offering_settings_rls.sql`)
  - Phase 1 debt fix — SELECT policy using `is_active_member_of`
- Migration 8: atomic persistence function (`00008_atomic_persist_direct_evaluation_run.sql`)
  - `persist_direct_evaluation_run_atomic` SECURITY DEFINER function wrapping evaluation_runs + evaluation_results + evaluation_rule_traces inserts in a single transactional function body
  - Runtime-validated via `supabase db reset` — function existence, successful writes, zero-trace support, and atomic rollback on failure all confirmed
- Migration 9: RPC execution boundary hardening (`00009_harden_persist_direct_evaluation_run_rpc.sql`)
  - `persist_direct_evaluation_run_atomic` execution locked down: `search_path` set to `public`; broad/default execute revoked; `anon` and `authenticated` explicitly blocked; execute granted only to `service_role` and `authenticator` (required for PostgREST schema discovery)
  - Runtime-validated via `supabase db reset` — privilege matrix confirmed, PostgREST RPC callable via service_role, anon blocked
- Migration 10: catalog dual-ownership RLS (`00010_catalog_dual_ownership_rls.sql`)
  - Reusable SECURITY DEFINER helper `public.is_visible_by_ownership(owner_scope, uuid)` — returns true for platform-owned rows; returns true for organization-owned rows only when `is_active_member_of(owner_organization_id)` is true; STABLE, `SET search_path = public`
  - RLS enabled on `universities`, `programs`, `program_offerings`
  - SELECT-only policies for `authenticated`: platform-owned rows visible to all authenticated users; organization-owned rows visible only to active members of the owning organization
  - No INSERT/UPDATE/DELETE policies; no anon access
  - Runtime-validated via `supabase db reset` — RLS enabled state confirmed, policies confirmed in `pg_policies`, helper existence and behavior confirmed, no out-of-scope tables affected
- Migration 11: faculties child RLS (`00011_faculties_child_rls.sql`)
  - RLS enabled on `faculties`
  - SELECT-only policy `faculties_select_visible` for `authenticated`: faculty visible only when parent university is visible through `public.is_visible_by_ownership(universities.owner_scope, universities.owner_organization_id)`
  - Platform-university faculties visible to all authenticated users; organization-university faculties visible only to active members of the owning organization
  - No write policies; no anon access; no helper changes
  - Runtime-validated via `supabase db reset` — RLS confirmed, policy confirmed, cross-organization isolation tested and confirmed, no out-of-scope tables affected
- Migration 12: qualification_types RLS (`00012_qualification_types_rls.sql`)
  - RLS enabled on `qualification_types`
  - SELECT-only policy `qualification_types_select_visible` for `authenticated` using `public.is_visible_by_ownership(owner_scope, owner_organization_id)`
  - Platform-owned qualification types visible to all authenticated users; organization-owned visible only to active members of the owning organization
  - No write policies; no anon access; no helper changes
  - Runtime-validated via `supabase db reset` — RLS confirmed, policy confirmed, three isolation scenarios tested (no membership, correct org, cross-org), no out-of-scope tables affected
- Migration 13: qualification children RLS (`00013_qualification_children_rls.sql`)
  - RLS enabled on `qualification_question_sets`, `qualification_questions`, `qualification_question_options`
  - SELECT-only policies for `authenticated`: `qualification_question_sets_select_visible`, `qualification_questions_select_visible`, `qualification_question_options_select_visible`
  - Pattern: root-direct EXISTS joins to `qualification_types`, applying `public.is_visible_by_ownership(qualification_types.owner_scope, qualification_types.owner_organization_id)` exactly once at the root ownership table
  - Child records under platform-owned qualification types visible to all authenticated users; child records under organization-owned qualification types visible only to active members of the owning organization
  - No write policies; no anon access; no helper changes
  - Runtime-validated via `supabase db reset` — RLS confirmed, policies confirmed, cross-organization isolation tested at all three child levels (no leakage), no out-of-scope tables affected
- Migration 14: student profile RLS (`00014_student_profiles_rls.sql`)
  - RLS enabled on `student_profiles`, `student_profile_answers`, `student_profile_subjects`
  - SELECT-only policies for `authenticated`: `student_profiles_select_member`, `student_profile_answers_select_member`, `student_profile_subjects_select_member`
  - `student_profiles` uses `public.is_active_member_of(organization_id)` directly; children use root-direct EXISTS joins to `student_profiles` and apply `public.is_active_member_of(student_profiles.organization_id)` at the root
  - Tenant-private only — no platform-owned student profile visibility
  - No write policies; no anon access; no helper changes
  - Runtime-validated via `supabase db reset` — RLS and policies confirmed, no-membership user sees 0/0/0 rows, org-A and org-B members see only their own org data, cross-organization isolation tested at all three levels, no out-of-scope tables affected
- Migration 15: evaluation runtime RLS (`00015_evaluation_runtime_rls.sql`)
  - RLS enabled on `evaluation_runs`, `evaluation_results`, `evaluation_rule_traces`
  - SELECT-only policies for `authenticated`: `evaluation_runs_select_member`, `evaluation_results_select_member`, `evaluation_rule_traces_select_member`
  - `evaluation_runs` uses `public.is_active_member_of(organization_id)` directly; `evaluation_results` uses root-direct EXISTS join to `evaluation_runs`; `evaluation_rule_traces` uses root-direct EXISTS join through `evaluation_results → evaluation_runs`; ownership check applied at the root ownership table
  - Tenant-private only — no platform-owned evaluation runtime visibility
  - No write policies; no anon access; no helper changes
  - Atomic persistence RPC `persist_direct_evaluation_run_atomic` and admin write path confirmed still working after RLS — SECURITY DEFINER bypasses RLS for writes; service_role admin client bypasses RLS by default
  - Runtime-validated via `supabase db reset` — RLS and policies confirmed, no-membership user sees 0/0/0 rows, org members see only their own org data, cross-organization isolation tested at all three levels, persistence RPC test returned valid run/result IDs, no out-of-scope tables affected
- Migration 16: rule registry RLS (`00016_rule_registry_rls.sql`)
  - RLS enabled on `rule_sets`, `rule_set_versions`, `rule_groups`, `rules`
  - SELECT-only policies for `authenticated`: `rule_sets_select_visible`, `rule_set_versions_select_visible`, `rule_groups_select_visible`, `rules_select_visible`
  - `rule_sets` uses `public.is_visible_by_ownership(owner_scope, owner_organization_id)` directly; child tables use root-direct EXISTS joins to `rule_sets` and apply the helper at the root ownership table
  - `rule_types` intentionally not touched — remains a platform reference table without RLS in this slice
  - Existing app-code ownership filtering in `resolve-direct-evaluation-rule-context.ts` remains unchanged as defense-in-depth (Decision 026)
  - No write policies; no anon access; no helper changes; no TypeScript changes
  - Resolver smoke validation passed for the full query chain `rule_sets → rule_set_versions → rule_groups → rules → rule_types` — platform-owned context resolves end-to-end, org-owned same-org context resolves end-to-end, cross-org access blocked at every level, `rule_types` lookup still works
  - Runtime-validated via `supabase db reset` — RLS and policies confirmed, no-membership user sees 1/1/1/1 (platform only), org-A sees 2/2/2/2 (platform + org-A), org-B sees 1/1/1/1 (platform only) with all org-A IDs invisible at all four levels, no out-of-scope tables affected
- Migration 17: governance deny-by-default RLS (`00017_governance_rls_deny_by_default.sql`)
  - RLS enabled on `validation_issues` and `audit_logs`
  - Zero policies intentionally — deny-by-default for `authenticated` users
  - `validation_issues` consumer-aware policy deferred because of generic `parent_entity_type` / `parent_entity_id` shape and absent `organization_id` column
  - `audit_logs` platform/org visibility policy deferred because `organization_id` is nullable and a platform-admin role/design does not exist yet
  - `service_role` and SECURITY DEFINER paths remain available for future controlled server-side governance services
  - No schema changes; no helper changes; no write policies; no anon access
  - Runtime-validated via `supabase db reset` — all 17 migrations applied; both tables show `rowsecurity = true` with zero policies in `pg_policies`; behavior smoke-tested across superuser (sees seeded rows), `authenticated` (sees 0 rows), and `service_role` (sees seeded rows); no out-of-scope tables affected
- Supabase project initialized (`supabase/config.toml`)
- Phase 1 smoke test (`scripts/smoke/phase1-foundation-smoke.ts`) — 25/25 pass

### Application scaffold

- `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `.env.example`
- `src/app/layout.tsx`, `src/app/page.tsx` — minimal App Router shell (Arabic RTL)
- `src/lib/env.ts` — runtime env validation
- `src/lib/supabase/server.ts`, `browser.ts`, `admin.ts` — typed Supabase client factories

### Phase 1 Foundation helpers

- Auth/session: `session.ts`, `actor.ts`, `actor-access.ts` (all RLS-aware)
- Permissions: `org-context.ts`, `guards.ts`, `ownership.ts`, `organization-ownership.ts`, `readable-owner-scope.ts`, `writable-owner-scope.ts`, `role-capabilities.ts`
- Organization services: current-organization, current-membership, current-workspace-context, current-workspace-capabilities, capability guards, role/role-guards, owned-data-access, branding, branding-access, memberships, user-profiles, members, members-management, settings-read, workspace-run-access, workspace-bootstrap
- Phase 1 debt fix: duplicated `request-access.ts` removed

### Phase 2 Catalog Core

- `src/modules/catalog/active-reference-lists.ts` — countries, university types, degrees
- `src/modules/catalog/effective-catalog-browse.ts` — effective activated catalog (overlay-first, owner-scoped)
- `src/modules/catalog/effective-catalog-selection.ts` — direct-evaluation stepwise selection chain
- `src/modules/catalog/effective-target-offering-context.ts` — single offering target context resolver

### Phase 3 Qualification & Profile (simple-form path)

- `src/types/qualification-raw-profile.ts` — raw profile contract (discriminated union, 4 families)
- `src/modules/qualification/direct-evaluation-raw-profile.ts` — raw profile validation
- `src/modules/qualification/active-qualification-definition.ts` — qualification definition read service
- `src/modules/qualification/direct-evaluation-input-bundle.ts` — validated input bundle assembly
- `src/modules/qualification/normalize-direct-evaluation-profile.ts` — normalization baseline (arabic_secondary, american_high_school, ib)
- `src/modules/qualification/assemble-simple-form-raw-profile.ts` — simple-form answer → raw profile assembler
- `src/modules/qualification/prepare-simple-form-direct-evaluation.ts` — end-to-end simple-form preparation

### Phase 4 British Specialized Path

- `src/types/british-subject-answer-payload.ts` — British subject-based payload types
- `src/types/normalized-british-profile.ts` — normalized British types with segment/level/grade keys
- `src/modules/qualification/assemble-british-subject-based-raw-profile.ts` — British raw profile assembler
- `src/modules/qualification/normalize-british-subject-based-profile.ts` — British normalization with grade scale, level handling, segment keys
- `src/modules/qualification/prepare-british-direct-evaluation.ts` — end-to-end British preparation

### Phase 4 British count-based rules support

- `src/types/british-subject-count-support.ts` — count params and result types
- `src/modules/qualification/count-british-subjects.ts` — pure counting helper with segment/level/grade filters
- `src/types/normalized-british-profile.ts` — updated with `isCountable` per subject record
- `src/modules/qualification/normalize-british-subject-based-profile.ts` — updated with countability baseline

### Phase 4 Evaluation — rule context resolution and loading

- `src/types/direct-evaluation-resolved-rule-context.ts` — execution-ready resolved context types (ordered groups, ordered rules, ruleTypeKey, ruleConfig)
- `src/modules/evaluation/resolve-direct-evaluation-rule-context.ts` — published rule context resolver with ownership filtering and rule group/rule loading

### Phase 5 Evaluation execution baseline

- `src/types/direct-evaluation-execution.ts` — execution trace types (rule/group outcomes, per-rule-type result interfaces)
- `src/modules/evaluation/evaluate-minimum-subject-count-rule.ts` — minimum_subject_count rule executor (composes British count helper)
- `src/modules/evaluation/execute-direct-evaluation-rule-context.ts` — resolved context executor (accepts both British and simple-form prepared input; British-only rule types skipped for non-British; unsupported types skipped)

### Phase 6 Narrow subject-based evaluator extensions

- `src/modules/evaluation/evaluate-required-subject-exists-rule.ts` — required_subject_exists rule evaluator (British-only; exact normalized subject name matching; no fuzzy/synonym/taxonomy logic; no grade thresholds; no deduplication policy)
- `src/types/direct-evaluation-execution.ts` — extended with `RequiredSubjectExistsRuleExecutionResult` and optional `matchedSubjectName`/`requiredSubjectNames` on `DirectEvaluationRuleExecution`
- `src/modules/evaluation/execute-direct-evaluation-rule-context.ts` — extended with `required_subject_exists` dispatch branch (British-only, skipped for non-British)
- `src/modules/evaluation/evaluate-minimum-subject-grade-rule.ts` — minimum_subject_grade rule evaluator (British-only; exact normalized subject-name matching; compares normalizedGradeValue against configured minimum grade threshold; no fuzzy matching, no synonym expansion, no taxonomy logic, no best-grade selection, no deduplication policy)
- `src/types/direct-evaluation-execution.ts` — extended with `MinimumSubjectGradeRuleExecutionResult` and optional `matchedGradeValue`/`requiredMinimumGradeValue` on `DirectEvaluationRuleExecution`
- `src/modules/evaluation/execute-direct-evaluation-rule-context.ts` — extended with `minimum_subject_grade` dispatch branch (British-only, skipped for non-British)

### Phase 6 First simple-form evaluator baseline

- `src/modules/evaluation/evaluate-minimum-overall-grade-rule.ts` — minimum_overall_grade rule evaluator (simple-form-only; reads a configured `profileField` from the normalized simple-form profile and compares against a configured `minimumValue`; supported field mapping: `arabic_secondary` → `finalAverage`, `american_high_school` → `gpa`, `international_baccalaureate` → `totalPoints`; non-applicable input returns `skipped`; no new normalization, no grade-scale conversion, no broader academic policy)
- `src/types/direct-evaluation-execution.ts` — extended with `MinimumOverallGradeRuleExecutionResult` and optional `actualValue`/`requiredMinimumValue` on `DirectEvaluationRuleExecution`
- `src/modules/evaluation/execute-direct-evaluation-rule-context.ts` — extended with `minimum_overall_grade` dispatch branch (simple-form-only, skipped for British)

### Phase 6 First cross-family evaluator baseline

- `src/modules/evaluation/evaluate-accepted-qualification-type-rule.ts` — accepted_qualification_type rule evaluator (cross-family; reads `qualificationDefinition.qualificationType.key` and compares against configured `acceptedQualificationTypeKeys` using exact string matching only; no aliases, no equivalence classes, no family inference, no normalization; works for both British and simple-form paths because `qualificationDefinition` is exposed uniformly)
- `src/types/direct-evaluation-execution.ts` — extended with `AcceptedQualificationTypeRuleExecutionResult` and optional `actualQualificationTypeKey`/`acceptedQualificationTypeKeys` on `DirectEvaluationRuleExecution`
- `src/modules/evaluation/execute-direct-evaluation-rule-context.ts` — extended with `accepted_qualification_type` dispatch branch (executes for all families, no British/simple-form narrowing needed)

### Phase 5 Result assembly baseline

- `src/types/direct-evaluation-result-assembly.ts` — final status, summary counters, assembled result types
- `src/modules/evaluation/assemble-direct-evaluation-result.ts` — final status derivation from group severities/outcomes

### Phase 5 Explanation rendering baseline

- `src/types/direct-evaluation-explanation.ts` — primary reason rendered type
- `src/types/direct-evaluation-next-step.ts` — next step rendered type
- `src/types/direct-evaluation-advisory-notes.ts` — advisory notes rendered type
- `src/modules/evaluation/render-direct-evaluation-primary-reason.ts` — Arabic primary reason from primaryReasonKey
- `src/modules/evaluation/render-direct-evaluation-next-step.ts` — Arabic next step from primaryReasonKey
- `src/modules/evaluation/render-direct-evaluation-advisory-notes.ts` — Arabic advisory notes from group outcomes
- `src/types/direct-evaluation-trace-explanation.ts` — trace-level explanation input/result types (includes optional `matchedSubjectName`, `requiredSubjectNames`, `matchedGradeValue`, `requiredMinimumGradeValue` for subject-based evaluator support; includes optional `actualValue`, `requiredMinimumValue` for simple-form evaluator support; includes optional `actualQualificationTypeKey`, `acceptedQualificationTypeKeys` for cross-family evaluator support)
- `src/modules/evaluation/render-direct-evaluation-rule-trace-explanation.ts` — dedicated pure Arabic trace explanation renderer (`minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`, `minimum_overall_grade`, and `accepted_qualification_type`; passed/failed/skipped; throws on unsupported types or missing required data)

### Phase 5 Orchestration baselines

- `src/types/direct-evaluation-orchestration.ts` — composed runtime result types and generic input contract (British + simple-form + generic)
- `src/modules/evaluation/run-british-direct-evaluation.ts` — British direct-evaluation in-memory orchestrator (composes preparation → rule resolution → execution → assembly → rendering)
- `src/modules/evaluation/run-simple-form-direct-evaluation.ts` — simple-form direct-evaluation in-memory orchestrator (same composition sequence, uses prepared-input resolver path)
- `src/modules/evaluation/run-direct-evaluation.ts` — generic multi-family router over British and simple-form orchestrators (thin switch on `family` discriminant)

### Phase 5 Persistence baseline

- `src/types/direct-evaluation-persistence.ts` — typed persistence payload/result shapes for evaluation_runs, evaluation_results, evaluation_rule_traces
- `src/modules/evaluation/persist-direct-evaluation-run.ts` — atomic RPC-backed write service; delegates all three inserts (run + result + traces) through a single `supabase.rpc("persist_direct_evaluation_run_atomic", ...)` call; caller-supplied Supabase client and caller-supplied already-computed payload; either the whole write succeeds or nothing is persisted; zero traces supported; no execution/assembly/rendering inside persistence

### Phase 5 Run-and-persist workflow baseline

- `src/types/direct-evaluation-run-and-persist.ts` — workflow input/result types and caller-owned persistence metadata
- `src/modules/evaluation/run-and-persist-direct-evaluation.ts` — service-layer composition: generic runtime + trace explanation renderer + persistence write service; caller-owned metadata explicit; `minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`, `minimum_overall_grade`, and `accepted_qualification_type` use dedicated renderer; unsupported trace explanation rule types use fixed compatibility fallback regardless of outcome; no UI, no routes, no API handlers, no server actions

### Phase 5 Server-side invocation boundary

- `src/types/direct-evaluation-server-invocation.ts` — invocation input/result types
- `src/modules/evaluation/invoke-direct-evaluation-workflow.ts` — first server-side invocation boundary; uses existing access helpers to resolve actor/org context; passes through organizationId and allowedRoles to requireActorAccess; derives organizationId and actorUserId from resolved access/session; when `sourceProfileId` is non-null, verifies existence and organization ownership of the referenced `student_profiles` row before workflow delegation (uses admin client); missing and foreign-organization profiles produce one unified access-denied error (outwardly indistinguishable); `sourceProfileId = null` remains allowed and unchanged; calls runAndPersistDirectEvaluation with admin client; returns workflow output unchanged; not a route, not an API handler, not a server action

### Phase 5 Direct-evaluation route handler baseline

- `src/types/direct-evaluation-route.ts` — transport request/response types, explicit hardened request parser (`parseDirectEvaluationRouteRequestBody`), `RouteValidationError`; validates transport shape: body object, sourceProfileId, evaluation object, supported family, offeringId, qualificationTypeKey, family-specific payload/answers, optional organizationId/allowedRoles
- `src/app/api/direct-evaluation/route.ts` — thin POST route over `invokeDirectEvaluationWorkflow(...)`; hardened transport-shape parsing via explicit parser; explicit success response serializer; explicit error response serializer with typed error codes; 400 for invalid JSON/invalid transport shape; narrow local error classification (401/409/403/500); source-profile boundary failures map through the existing 403 `access_denied` path with unified outward-facing message; unexpected internal 500 errors return a generic redacted message instead of raw internal strings; no business UI, no server actions, no broader transport framework

### Phase 5 Route hardening baselines

- `src/types/direct-evaluation-route.ts` — additionally exports: `DirectEvaluationRouteErrorCode`, `DirectEvaluationRouteErrorResponseBody`, `toDirectEvaluationRouteResponseBody(...)`, `toDirectEvaluationRouteErrorResponseBody(...)`
- Request schema hardening: explicit `parseDirectEvaluationRouteRequestBody(...)` with family-specific and access-param transport validation
- Response schema hardening: explicit `toDirectEvaluationRouteResponseBody(...)` mapping workflow output into typed response
- Error response schema hardening: explicit `toDirectEvaluationRouteErrorResponseBody(...)` with typed `DirectEvaluationRouteErrorCode` union

### Phase 5 Verification baselines

- `vitest.config.ts` — Vitest test framework bootstrap (node environment, @/ path alias)
- `src/app/api/direct-evaluation/route.test.ts` — 17 route integration tests (success, 400 invalid JSON/shape, 401/409/403/500 error classification, source-profile unified 403, source-profile outward indistinguishability, 500 message redaction)
- `src/modules/evaluation/invoke-direct-evaluation-workflow.test.ts` — 18 invocation boundary tests (access passthrough, metadata derivation, delegation, failure passthrough, source profile ownership guard: null skips lookup, matching-org delegates, different-org rejects, missing profile rejects, not-found/foreign-org indistinguishability, lookup error rejects)
- `src/modules/evaluation/run-and-persist-direct-evaluation.test.ts` — 19 workflow tests (delegation, metadata passthrough, trace explanation sourcing for minimum_subject_count, required_subject_exists, minimum_subject_grade, minimum_overall_grade, and accepted_qualification_type passed/failed, unsupported non-skipped compatibility fallback, unsupported skipped compatibility, null rule set, failure passthrough)
- `src/modules/evaluation/persist-direct-evaluation-run.test.ts` — 8 atomic persistence tests (single RPC delegation, run/result/trace payload passthrough, result mapping, zero traces support, RPC error passthrough, null-data rejection)
- `src/modules/evaluation/run-direct-evaluation.test.ts` — 14 generic orchestration tests (family routing, param passthrough, error passthrough)
- `src/modules/evaluation/run-british-direct-evaluation.test.ts` — 13 British orchestration tests (composition sequence, result shape, failure passthrough for all 7 stages)
- `src/modules/evaluation/run-simple-form-direct-evaluation.test.ts` — 13 simple-form orchestration tests (composition sequence, result shape, failure passthrough for all 7 stages)
- `src/modules/evaluation/evaluate-required-subject-exists-rule.test.ts` — 14 pure evaluator tests (pass/fail matching, multi-name matching, case-insensitive normalization, whitespace trimming, payload field verification, invalid config rejection, wrong ruleTypeKey guard)
- `src/modules/evaluation/evaluate-minimum-subject-grade-rule.test.ts` — 12 pure evaluator tests (pass/fail/no-match, exact threshold, case-insensitive normalization, whitespace trimming, first-match behavior, config validation, wrong ruleTypeKey guard)
- `src/modules/evaluation/evaluate-minimum-overall-grade-rule.test.ts` — 14 pure evaluator tests (pass/fail for arabic_secondary/american_high_school/IB, exact threshold, family mismatch skip, config validation, wrong ruleTypeKey guard)
- `src/modules/evaluation/evaluate-accepted-qualification-type-rule.test.ts` — 9 pure evaluator tests (pass/fail, single key, exact-match-only, config validation, wrong ruleTypeKey guard)
- `src/modules/evaluation/execute-direct-evaluation-rule-context.test.ts` — 27 execution engine tests (supported British pass/fail for minimum_subject_count, required_subject_exists, and minimum_subject_grade, non-British skip for all three, supported simple-form pass/fail for minimum_overall_grade, British skip for minimum_overall_grade, accepted_qualification_type pass/fail for both British and simple-form, unsupported type skip, group outcome derivation for all_required and any_of modes, empty groups, multiple groups, output structure)
- `src/modules/evaluation/render-direct-evaluation-rule-trace-explanation.test.ts` — 14 trace renderer tests (minimum_subject_grade passed/failed-below-threshold/failed-no-match/skipped, two-failure-shape distinction, minimum_overall_grade passed/failed/skipped, passed-vs-failed distinction, accepted_qualification_type passed/failed/skipped, passed-vs-failed distinction, unsupported type throw)
- `src/modules/evaluation/__tests__/british-golden-case.test.ts` — 37 British golden-case verification tests (eligible/not_eligible/conditional/needs_review/advisory-non-downgrade; real execution → assembly → rendering path with no mocking; exercises all three British subject-based rule types and dedicated trace rendering)
- `src/modules/evaluation/__tests__/simple-form-golden-case.test.ts` — 37 simple-form golden-case verification tests (eligible/not_eligible/conditional/needs_review/advisory-non-downgrade; real execution → assembly → rendering path with no mocking; exercises minimum_overall_grade with arabic_secondary and dedicated trace rendering)
- `src/modules/evaluation/assemble-direct-evaluation-result.test.ts` — 15 result assembly tests (final status derivation, severity priority, advisory non-downgrade, summary counters, trace preservation, empty input, all-skipped needs_review, mixed pass+skip eligible)
- `src/modules/evaluation/render-direct-evaluation-primary-reason.test.ts` — 7 primary-reason renderer tests (all 5 supported keys → Arabic mapping, unknown key throw, return shape)
- `src/modules/evaluation/render-direct-evaluation-next-step.test.ts` — 7 next-step renderer tests (all 5 supported keys → Arabic mapping, unknown key throw, return shape)
- `src/modules/evaluation/render-direct-evaluation-advisory-notes.test.ts` — 10 advisory-notes renderer tests (advisory failed note, skipped note, both notes, deduplication, return shape, non-advisory exclusion)

### Milestone 2B Constructor CS British A-Level supported-subset seed + smoke

- `scripts/seed/demo-seed.ts` — local-only TypeScript seed for Constructor University → Computer Science Bachelor → Fall 2026 Bremen offering with the supported-subset rule set; refuses unless `NODE_ENV !== "production"` and `URL.hostname` is `127.0.0.1`/`localhost`; uses Supabase `service_role` admin client; fixed UUIDs and `upsert(onConflict:"id")` for idempotency; advisor auth user reused via `listUsers` fallback; verifies `user_profiles.id == auth.users.id` and verifies the four rule configs via a semantic deep-equal helper (`isJsonSemanticallyEqual`) that ignores Postgres `jsonb` key reordering; seeds reference data (country `DE`, `university_types.private`, `degrees.bachelor`), catalog (one university, one program, one offering with `annual_tuition_amount = 20000`, `currency_code = "EUR"`, `application_fee_amount = 0`, `teaching_language_key = "en"`, `intake_term_key = "fall"`, `intake_year = 2026`), org/membership/overlay (one organization, one advisor membership, one `organization_offering_settings` overlay), qualification definition (one British family, one `british_a_level` type, one question set, one placeholder question), 5 supported `rule_types`, and the supported-subset rule registry (one `rule_set` → one published `rule_set_version` → one `blocking` `all_required` `rule_group` → four active rules); does not pre-seed `student_profiles*`, evaluation runtime tables, or governance tables; rule set name explicitly says "supported subset" and `description_ar` enumerates the deferred unsupported requirements; runtime-validated PASS 23/23 first run and PASS 23/23 second run (idempotent)
- `scripts/smoke/direct-evaluation-demo-smoke.ts` — pure-runtime Direct Evaluation smoke against the seeded data; refuses unless `NODE_ENV !== "production"` and `URL.hostname` is `127.0.0.1`/`localhost`; uses the Supabase `service_role` admin client to load the typed structures itself (`EffectiveTargetOfferingContext`, `ActiveQualificationDefinitionRead`, `CurrentWorkspaceCapabilities`, `ResolvedDirectEvaluationRuleContext`) because the workflow entry point `runAndPersistDirectEvaluation` cannot be invoked from a tsx script (its transitive imports reach `next/headers.cookies()` via `@/lib/supabase/server.createClient`); composes the pure runtime modules `assembleValidatedBritishSubjectBasedRawProfile` → `prepareValidatedBritishDirectEvaluation` → `executeDirectEvaluationRuleContext` → `assembleDirectEvaluationResult` → `renderDirectEvaluationPrimaryReason` / `renderDirectEvaluationNextStep` / `renderDirectEvaluationAdvisoryNotes` / `renderDirectEvaluationRuleTraceExplanation`; replicates the persistence-trace mapping inline (importing the same dedicated trace explanation renderer the workflow uses); writes through `persist_direct_evaluation_run_atomic`; uses raw British grade letters (Mathematics A / Physics B / Computer Science C, graduation 2026, subject level "A Level"); asserts Mathematics `normalizedGradeValue === 7` (A on ordinal scale), `segmentKey === "a_level"`, `finalStatus === "eligible"`, all four supported rules outcome `passed`, the Mathematics `minimum_subject_grade` trace `matchedGradeValue === 7` and `requiredMinimumGradeValue === 5`, persistence returns non-empty `evaluationRunId` and `evaluationResultId` and `persistedRuleTraceCount === 4`; documented limitations: does NOT validate HTTP route transport, cookie/session auth boundary, `requireActorAccess`, `sourceProfileId` ownership guard, role-capability resolution, the catalog browse / target-context resolver, the qualification definition resolver, or the published rule context resolver; RLS isolation not exercised (RLS coverage remains in Milestone 1 RLS migrations 00010–00017); runtime-validated PASS 16/16 with 4 traces persisted

## What has NOT started yet

- No broader direct-evaluation API surface beyond the first POST route baseline
- No business UI
- No broader evaluator support beyond the current narrow baselines (`minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade` for British; `minimum_overall_grade` for simple-form; `accepted_qualification_type` cross-family)
- No broader dedicated trace explanation rendering beyond `minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`, `minimum_overall_grade`, and `accepted_qualification_type` (other unsupported trace explanation rule types use a fixed compatibility fallback in workflow regardless of outcome)
- No import pipeline (tables or code)
- No admin UI
- No CRM features

## Current recommended next step

Verification baseline is complete across all current runtime layers (307 tests across 20 test files). Milestone 0 (core runtime + evaluators + trace renderers) is complete. Milestone 1B (catalog dual-ownership RLS for universities, programs, program_offerings) is complete and runtime-validated. Milestone 1C (faculties child RLS following parent university visibility) is complete and runtime-validated. Milestone 1D.1 (qualification_types dual-ownership RLS) and Milestone 1D.2 (qualification child RLS for question_sets/questions/options via root-direct joins) are both complete and runtime-validated — Milestone 1D qualification RLS is complete. Milestone 1E.1 (student profile RLS for student_profiles/answers/subjects) and Milestone 1E.2 (evaluation runtime RLS for runs/results/traces) are both complete and runtime-validated — Milestone 1E is complete. Milestone 1F (rule registry RLS for rule_sets/rule_set_versions/rule_groups/rules) is complete and runtime-validated. Milestone 1G (governance deny-by-default RLS for validation_issues and audit_logs) is complete and runtime-validated. Milestone 1 RLS closeout is complete for tenant-owned, tenant-private, dual-ownership, runtime, rule registry, and governance-risk tables. Platform reference tables remain intentionally outside RLS where previously accepted. Future governance access remains deferred: `validation_issues` consumer-aware policy and `audit_logs` platform-admin/org visibility design will land when their consumer surfaces and platform-admin role exist. Milestone 2B (Constructor CS British A-Level supported-subset seed + smoke) is complete and runtime-validated; commit `1e67cec` added `scripts/seed/demo-seed.ts` and `scripts/smoke/direct-evaluation-demo-smoke.ts`; the supported-subset rule set explicitly does NOT enforce full Constructor admission logic; Arabic secondary was intentionally deferred; the British runtime grade scale is canonical and ordinal (`C = 5`); `source data/` remains local/uncommitted. Milestone 2B.1 (British grade-scale fixture alignment) is complete; commit `4395f38` aligned British test/fixture grade values with the canonical runtime ordinal scale, re-derived rule-config thresholds preserving the original pass/fail intent, and added a narrow normalizer scale-lock regression test (no production runtime code changed; simple-form percentage values were intentionally not rescaled). Next recommended step: a Milestone 2 planning decision among the following candidate directions, none of which is chosen here: (a) a route-level smoke that exercises the HTTP transport / cookie-session auth boundary / `requireActorAccess` / `sourceProfileId` ownership guard against the seeded data (currently uncovered by Milestone 2B); (b) the next real-data seed slice (additional Constructor scenarios or a second university); (c) additional evaluator expansion; (d) Direct Evaluation UI baseline; (e) Milestone 2D candidate — resolver/runtime dependency injection that decouples the resolver/runtime path from the Next.js cookie-bound Supabase server client where appropriate, so standalone smoke/integration scripts can exercise the full orchestration path without fake request context (this remains a candidate, not currently selected); (f) General Comparison backend baseline. No business UI, no admin UI, no import pipeline, no CRM features exist.

## Follow-up tracking

- **Milestone 2B.1 — British grade-scale fixture alignment** — **complete** (Decision 083, commit `4395f38`). British test fixtures and rule-config thresholds now use the canonical runtime ordinal scale (`A* = 8, A = 7, B = 6, C = 5, D = 4, E = 3, F = 2, G = 1, U = 0`) with uppercase `gradeNormalizedKey`. Old percentile-style British fixture values (e.g. `A = 80`, `B = 70`, `C = 60`) and lowercase keys are no longer present in British normalized fixture contexts. A narrow scale-lock regression test (`src/modules/qualification/normalize-british-subject-based-profile.test.ts`) was added to prevent future drift. Simple-form percentage values were intentionally not rescaled because they belong to family-specific scales, not the British grade scale.
- **Milestone 2D candidate — resolver/runtime dependency injection** (future, not currently selected). The runtime rule/context resolution path is currently coupled to `next/headers.cookies()` via `@/lib/supabase/server.createClient`. This blocks standalone tsx scripts from invoking the user-facing `runAndPersistDirectEvaluation` workflow — Milestone 2B's smoke composes the pure runtime modules and replicates the workflow's persistence mapping inline as a result. A future candidate slice would dependency-inject the Supabase client into the resolver/runtime where appropriate so standalone smoke/integration scripts can exercise the full orchestration path without faking a Next.js request context. This is tracked as a Milestone 2D candidate only — not approved, not in-flight.
- **Route-level smoke** (future candidate, not currently selected). The Milestone 2B smoke does not exercise the HTTP route transport, the cookie-session auth boundary, `requireActorAccess`, or the `sourceProfileId` ownership guard — those layers remain covered only by the existing route/invocation unit tests. A future candidate slice would add a route-level smoke against the seeded data once the resolver/runtime path is decoupled from Next.js cookies (or once an alternative integration harness is selected). Tracked as a candidate only — not approved, not in-flight.

## Critical constraints to remember

- program != program_offering
- no logic in UI
- British qualification requires subject records
- no direct AI publish
- no CRM expansion
- missing rules => hide unsupported context in UI and return `needs_review` in runtime

## Last architectural state

Migration 1 core schema, 6 RLS migrations (00002–00007), migration 8 atomic persistence function (00008), migration 9 RPC execution boundary hardening (00009), migration 10 catalog dual-ownership RLS (00010), migration 11 faculties child RLS (00011), migration 12 qualification_types RLS (00012), migration 13 qualification children RLS (00013), migration 14 student profile RLS (00014), migration 15 evaluation runtime RLS (00015), migration 16 rule registry RLS (00016), and migration 17 governance deny-by-default RLS (00017) are runtime-validated on Supabase. Migration 10 introduces the reusable `public.is_visible_by_ownership(owner_scope, uuid)` SECURITY DEFINER helper and enables SELECT-only RLS on `universities`, `programs`, and `program_offerings` — platform-owned rows visible to all authenticated users, organization-owned rows visible only to active members of the owning organization. Migration 11 enables SELECT-only RLS on `faculties` following parent university visibility. Migration 12 enables SELECT-only RLS on `qualification_types` using the same dual-ownership visibility model as catalog tables. Migration 13 enables SELECT-only RLS on `qualification_question_sets`, `qualification_questions`, and `qualification_question_options` using root-direct EXISTS joins to `qualification_types`. Qualification RLS is complete: `qualification_types` via dual-ownership helper and qualification children via root-direct joins to `qualification_types`. Migration 14 enables SELECT-only RLS on `student_profiles`, `student_profile_answers`, and `student_profile_subjects` using `public.is_active_member_of` rooted at `student_profiles.organization_id` — student profile data is tenant-private, no platform-owned visibility. Migration 15 enables SELECT-only RLS on `evaluation_runs`, `evaluation_results`, and `evaluation_rule_traces` using `public.is_active_member_of` rooted at `evaluation_runs.organization_id` — evaluation runtime data is tenant-private, no platform-owned visibility. Student profile RLS and evaluation runtime RLS are both complete. The atomic persistence RPC `persist_direct_evaluation_run_atomic` and admin write path remain functional after evaluation runtime RLS — SECURITY DEFINER and service_role bypass RLS for writes. Migration 16 enables SELECT-only RLS on `rule_sets`, `rule_set_versions`, `rule_groups`, and `rules` — `rule_sets` uses `public.is_visible_by_ownership(owner_scope, owner_organization_id)` directly, child tables use root-direct EXISTS joins to `rule_sets`, and the ownership check is applied at the root. `rule_types` was intentionally not touched in this slice (platform reference table without per-tenant data). Rule registry RLS is complete. Decision 026 application-code ownership filtering in `resolve-direct-evaluation-rule-context.ts` is now defense-in-depth rather than the only protection for rule tables. Migration 17 enables RLS on `validation_issues` and `audit_logs` with no policies — deny-by-default for `authenticated` users; `service_role` and SECURITY DEFINER paths can still bypass RLS for any future controlled server-side governance services. Governance-risk tables are now deny-by-default under RLS. Milestone 1 RLS closeout is complete for tenant-owned, tenant-private, dual-ownership, runtime, rule registry, and governance-risk tables. Platform reference tables remain intentionally outside RLS where previously accepted. Phase 1 smoke test passed (25/25). Phase 2 Catalog Core provides read-only activated catalog browse, selection, and target context. Phase 3 provides simple-form qualification preparation end-to-end. Phase 4 provides British specialized preparation end-to-end, British count-based rules support baseline, and execution-ready published rule context resolution with ordered groups/rules. Phase 5 provides minimum_subject_count execution baseline, final status result assembly, and Arabic explanation rendering (primary reason, next step, advisory notes, trace-level rule explanations). Phase 6 adds `required_subject_exists` and `minimum_subject_grade` as narrow British-only evaluators. `required_subject_exists` uses exact normalized subject name matching only; no fuzzy/synonym/taxonomy logic; non-British input remains skipped. `minimum_subject_grade` uses exact normalized subject-name matching and compares `normalizedGradeValue` against a configured minimum grade threshold; no fuzzy matching, no synonym expansion, no taxonomy logic, no best-grade selection, no deduplication policy; non-British input remains skipped. A first simple-form evaluator baseline (`minimum_overall_grade`) exists; it is simple-form-only, reads a configured `profileField` from the normalized profile, and compares against a configured `minimumValue`; supported field mapping: `arabic_secondary` → `finalAverage`, `american_high_school` → `gpa`, `international_baccalaureate` → `totalPoints`; non-applicable input returns `skipped`; no new normalization or broader policy. Trace-level explanation renderer now supports `minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`, `minimum_overall_grade`, and `accepted_qualification_type` with dedicated Arabic rendering for passed/failed/skipped outcomes. Workflow no longer throws on unsupported non-skipped trace explanation rule types — it falls back to a fixed compatibility string for any unsupported rule type regardless of outcome. British and simple-form direct-evaluation in-memory orchestration baselines exist. Executor prepared-input contract is widened for both families; `minimum_subject_count`, `required_subject_exists`, and `minimum_subject_grade` are British-only; `minimum_overall_grade` is simple-form-only; `accepted_qualification_type` is cross-family (works for both British and simple-form because `qualificationDefinition` is exposed uniformly). `accepted_qualification_type` is the first cross-family evaluator baseline — it reads `qualificationDefinition.qualificationType.key` and compares exact key(s) against configured `acceptedQualificationTypeKeys`; no aliases, no equivalence classes, no family inference, no normalization. Dedicated trace renderer support for `accepted_qualification_type` now exists with Arabic rendering for passed/failed/skipped outcomes. Generic multi-family direct-evaluation orchestration baseline exists as a thin in-memory router. Direct-evaluation atomic persistence baseline (via `persist_direct_evaluation_run_atomic` RPC function), run-and-persist workflow baseline, first server-side invocation boundary, and first POST route handler baseline exist. Persistence is now atomic — either the whole write unit (run + result + traces) succeeds or nothing is persisted; the previous sequential client-side staged write path has been replaced. Route layer is hardened at request/response/error-response level with narrow local error classification. Result assembly now correctly returns `needs_review` when all groups are skipped (previously false `eligible`). Group outcome derivation now respects `any_of` evaluation mode — passes if at least one rule passes, fails only when no rule passes and at least one fails (previously treated identically to `all_required`). The server-side invocation boundary now validates `sourceProfileId` organization ownership before workflow/persistence delegation — when non-null, the referenced `student_profiles` row must exist and its `organization_id` must match the resolved organization context; `sourceProfileId = null` remains allowed and unchanged; source-profile boundary failures produce one unified outward-facing access-denied message (not-found and foreign-org are indistinguishable); the route classifier maps source-profile failures through the existing 403 path. The atomic persistence RPC function execution boundary has been hardened: `search_path` set to `public`, broad/default execute revoked, `anon` and `authenticated` blocked, execute granted only to `service_role` and `authenticator`. Unexpected internal 500 errors are now redacted to a generic outward-facing message at the route surface. British golden-case verification baseline covers `eligible`, `not_eligible`, `conditional`, `needs_review`, and advisory non-downgrade using the real execution → assembly → rendering path with no mocking. Simple-form golden-case verification baseline covers `eligible`, `not_eligible`, `conditional`, `needs_review`, and advisory non-downgrade for `arabic_secondary` using the real execution → assembly → rendering path with no mocking. Both British and simple-form golden-case baselines now cover all five current-state final-status outcomes. Verification baseline covers route, invocation boundary, workflow, persistence, generic orchestration, British orchestration, simple-form orchestration, execution engine, result assembly, all three explanation renderers, the pure `required_subject_exists` evaluator, the pure `minimum_subject_grade` evaluator, the pure `minimum_overall_grade` evaluator, the pure `accepted_qualification_type` evaluator, the dedicated trace-level explanation renderer, British golden cases, simple-form golden cases, and a narrow normalizer scale-lock regression test (307 tests across 20 test files via Vitest). Business UI, broader API surface, and import pipeline do not exist yet. Milestone 2B added two local-only TypeScript scripts (`scripts/seed/demo-seed.ts` and `scripts/smoke/direct-evaluation-demo-smoke.ts`) for the Constructor University Computer Science Bachelor → Fall 2026 Bremen offering → British A-Level supported-subset demo; no migrations, no `supabase/seed.sql`, no evaluator changes, no fixture/test changes, no docs changes, no `package.json` changes, no source data committed; the supported-subset rule set explicitly does NOT enforce full Constructor admission logic and excludes Arabic secondary by design; runtime-validated end-to-end (`db reset` → seed × 2 → smoke → `npm test` → `npm run typecheck`) on a local Supabase using the `service_role` admin client. Milestone 2B.1 (commit `4395f38`) realigned five British test/fixture files with the canonical runtime ordinal grade scale (uppercase `gradeNormalizedKey`, ordinal `normalizedGradeValue` 0–8) and added one narrow normalizer scale-lock regression test (`src/modules/qualification/normalize-british-subject-based-profile.test.ts`); rule-config thresholds were re-derived per test to preserve each test's original pass/fail intent (not blindly divided by 10); existing British golden-case expected statuses were preserved; simple-form percentage values were intentionally not rescaled because they belong to family-specific scales, not the British grade scale; no production runtime code changed; `npm test` 307/307 across 20 test files; `npm run typecheck` clean.

## If this project is reopened in a new chat

Ask for:

- latest handoff (docs were refreshed to match the current approved branch state)
- latest decisions log
- whether any code was already implemented
- whether the schema changed after the last documented state
