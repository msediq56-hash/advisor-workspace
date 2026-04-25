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

British, simple-form, and generic multi-family direct-evaluation in-memory orchestration baselines are implemented. Direct-evaluation atomic persistence baseline, run-and-persist workflow baseline, first server-side invocation boundary, and first direct-evaluation POST route handler are implemented. Route layer is hardened (request/response/error-response schemas, narrow error classification, source-profile error unification, 500 message redaction). British and simple-form golden-case verification baselines are implemented and fully expanded — both cover all five current-state final-status outcomes (`eligible`, `not_eligible`, `conditional`, `needs_review`, advisory non-downgrade preserving `eligible`). Verification baseline is complete across all current runtime layers (299 tests across 19 test files via Vitest). No business UI. No import pipeline. No admin UI. No CRM features.

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
- `src/types/direct-evaluation-trace-explanation.ts` — trace-level explanation input/result types (includes optional `matchedSubjectName`, `requiredSubjectNames`, `matchedGradeValue`, `requiredMinimumGradeValue` for subject-based evaluator support; includes optional `actualValue`, `requiredMinimumValue` for simple-form evaluator support)
- `src/modules/evaluation/render-direct-evaluation-rule-trace-explanation.ts` — dedicated pure Arabic trace explanation renderer (`minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`, and `minimum_overall_grade`; passed/failed/skipped; throws on unsupported types or missing required data)

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
- `src/modules/evaluation/run-and-persist-direct-evaluation.ts` — service-layer composition: generic runtime + trace explanation renderer + persistence write service; caller-owned metadata explicit; `minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`, and `minimum_overall_grade` use dedicated renderer; unsupported trace explanation rule types use fixed compatibility fallback regardless of outcome; no UI, no routes, no API handlers, no server actions

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
- `src/modules/evaluation/run-and-persist-direct-evaluation.test.ts` — 17 workflow tests (delegation, metadata passthrough, trace explanation sourcing for minimum_subject_count, required_subject_exists, minimum_subject_grade, and minimum_overall_grade passed/failed, unsupported non-skipped compatibility fallback, unsupported skipped compatibility, null rule set, failure passthrough)
- `src/modules/evaluation/persist-direct-evaluation-run.test.ts` — 8 atomic persistence tests (single RPC delegation, run/result/trace payload passthrough, result mapping, zero traces support, RPC error passthrough, null-data rejection)
- `src/modules/evaluation/run-direct-evaluation.test.ts` — 14 generic orchestration tests (family routing, param passthrough, error passthrough)
- `src/modules/evaluation/run-british-direct-evaluation.test.ts` — 13 British orchestration tests (composition sequence, result shape, failure passthrough for all 7 stages)
- `src/modules/evaluation/run-simple-form-direct-evaluation.test.ts` — 13 simple-form orchestration tests (composition sequence, result shape, failure passthrough for all 7 stages)
- `src/modules/evaluation/evaluate-required-subject-exists-rule.test.ts` — 14 pure evaluator tests (pass/fail matching, multi-name matching, case-insensitive normalization, whitespace trimming, payload field verification, invalid config rejection, wrong ruleTypeKey guard)
- `src/modules/evaluation/evaluate-minimum-subject-grade-rule.test.ts` — 12 pure evaluator tests (pass/fail/no-match, exact threshold, case-insensitive normalization, whitespace trimming, first-match behavior, config validation, wrong ruleTypeKey guard)
- `src/modules/evaluation/evaluate-minimum-overall-grade-rule.test.ts` — 14 pure evaluator tests (pass/fail for arabic_secondary/american_high_school/IB, exact threshold, family mismatch skip, config validation, wrong ruleTypeKey guard)
- `src/modules/evaluation/evaluate-accepted-qualification-type-rule.test.ts` — 9 pure evaluator tests (pass/fail, single key, exact-match-only, config validation, wrong ruleTypeKey guard)
- `src/modules/evaluation/execute-direct-evaluation-rule-context.test.ts` — 27 execution engine tests (supported British pass/fail for minimum_subject_count, required_subject_exists, and minimum_subject_grade, non-British skip for all three, supported simple-form pass/fail for minimum_overall_grade, British skip for minimum_overall_grade, accepted_qualification_type pass/fail for both British and simple-form, unsupported type skip, group outcome derivation for all_required and any_of modes, empty groups, multiple groups, output structure)
- `src/modules/evaluation/render-direct-evaluation-rule-trace-explanation.test.ts` — 10 trace renderer tests (minimum_subject_grade passed/failed-below-threshold/failed-no-match/skipped, two-failure-shape distinction, minimum_overall_grade passed/failed/skipped, passed-vs-failed distinction, unsupported type throw)
- `src/modules/evaluation/__tests__/british-golden-case.test.ts` — 37 British golden-case verification tests (eligible/not_eligible/conditional/needs_review/advisory-non-downgrade; real execution → assembly → rendering path with no mocking; exercises all three British subject-based rule types and dedicated trace rendering)
- `src/modules/evaluation/__tests__/simple-form-golden-case.test.ts` — 37 simple-form golden-case verification tests (eligible/not_eligible/conditional/needs_review/advisory-non-downgrade; real execution → assembly → rendering path with no mocking; exercises minimum_overall_grade with arabic_secondary and dedicated trace rendering)
- `src/modules/evaluation/assemble-direct-evaluation-result.test.ts` — 15 result assembly tests (final status derivation, severity priority, advisory non-downgrade, summary counters, trace preservation, empty input, all-skipped needs_review, mixed pass+skip eligible)
- `src/modules/evaluation/render-direct-evaluation-primary-reason.test.ts` — 7 primary-reason renderer tests (all 5 supported keys → Arabic mapping, unknown key throw, return shape)
- `src/modules/evaluation/render-direct-evaluation-next-step.test.ts` — 7 next-step renderer tests (all 5 supported keys → Arabic mapping, unknown key throw, return shape)
- `src/modules/evaluation/render-direct-evaluation-advisory-notes.test.ts` — 10 advisory-notes renderer tests (advisory failed note, skipped note, both notes, deduplication, return shape, non-advisory exclusion)

## What has NOT started yet

- No broader direct-evaluation API surface beyond the first POST route baseline
- No business UI
- No broader evaluator support beyond the current narrow baselines (`minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade` for British; `minimum_overall_grade` for simple-form; `accepted_qualification_type` cross-family)
- No broader dedicated trace explanation rendering beyond `minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`, and `minimum_overall_grade` (`accepted_qualification_type` and other unsupported trace explanation rule types use a fixed compatibility fallback in workflow regardless of outcome)
- No import pipeline (tables or code)
- No admin UI
- No CRM features

## Current recommended next step

Verification baseline is complete across all current runtime layers (299 tests across 19 test files). Four runtime repairs, two post-repair hardening micro-slices, British evaluator baselines (`minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`), simple-form evaluator baseline (`minimum_overall_grade`), cross-family evaluator baseline (`accepted_qualification_type`), dedicated trace renderers for four rule types, and fully expanded British + simple-form golden-case verification baselines (all five final-status outcomes covered for both paths) have been applied. Next narrow execution follow-up: dedicated trace explanation renderer support for `accepted_qualification_type`.

## Critical constraints to remember

- program != program_offering
- no logic in UI
- British qualification requires subject records
- no direct AI publish
- no CRM expansion
- missing rules => hide unsupported context in UI and return `needs_review` in runtime

## Last architectural state

Migration 1 core schema, 6 RLS migrations (00002–00007), migration 8 atomic persistence function (00008), and migration 9 RPC execution boundary hardening (00009) are runtime-validated on Supabase. Phase 1 smoke test passed (25/25). Phase 2 Catalog Core provides read-only activated catalog browse, selection, and target context. Phase 3 provides simple-form qualification preparation end-to-end. Phase 4 provides British specialized preparation end-to-end, British count-based rules support baseline, and execution-ready published rule context resolution with ordered groups/rules. Phase 5 provides minimum_subject_count execution baseline, final status result assembly, and Arabic explanation rendering (primary reason, next step, advisory notes, trace-level rule explanations). Phase 6 adds `required_subject_exists` and `minimum_subject_grade` as narrow British-only evaluators. `required_subject_exists` uses exact normalized subject name matching only; no fuzzy/synonym/taxonomy logic; non-British input remains skipped. `minimum_subject_grade` uses exact normalized subject-name matching and compares `normalizedGradeValue` against a configured minimum grade threshold; no fuzzy matching, no synonym expansion, no taxonomy logic, no best-grade selection, no deduplication policy; non-British input remains skipped. A first simple-form evaluator baseline (`minimum_overall_grade`) exists; it is simple-form-only, reads a configured `profileField` from the normalized profile, and compares against a configured `minimumValue`; supported field mapping: `arabic_secondary` → `finalAverage`, `american_high_school` → `gpa`, `international_baccalaureate` → `totalPoints`; non-applicable input returns `skipped`; no new normalization or broader policy. Trace-level explanation renderer now supports `minimum_subject_count`, `required_subject_exists`, `minimum_subject_grade`, and `minimum_overall_grade` with dedicated Arabic rendering for passed/failed/skipped outcomes. Workflow no longer throws on unsupported non-skipped trace explanation rule types — it falls back to a fixed compatibility string for any unsupported rule type regardless of outcome. British and simple-form direct-evaluation in-memory orchestration baselines exist. Executor prepared-input contract is widened for both families; `minimum_subject_count`, `required_subject_exists`, and `minimum_subject_grade` are British-only; `minimum_overall_grade` is simple-form-only; `accepted_qualification_type` is cross-family (works for both British and simple-form because `qualificationDefinition` is exposed uniformly). `accepted_qualification_type` is the first cross-family evaluator baseline — it reads `qualificationDefinition.qualificationType.key` and compares exact key(s) against configured `acceptedQualificationTypeKeys`; no aliases, no equivalence classes, no family inference, no normalization. Dedicated trace renderer support for `accepted_qualification_type` does NOT exist yet — it currently uses the workflow compatibility fallback. Generic multi-family direct-evaluation orchestration baseline exists as a thin in-memory router. Direct-evaluation atomic persistence baseline (via `persist_direct_evaluation_run_atomic` RPC function), run-and-persist workflow baseline, first server-side invocation boundary, and first POST route handler baseline exist. Persistence is now atomic — either the whole write unit (run + result + traces) succeeds or nothing is persisted; the previous sequential client-side staged write path has been replaced. Route layer is hardened at request/response/error-response level with narrow local error classification. Result assembly now correctly returns `needs_review` when all groups are skipped (previously false `eligible`). Group outcome derivation now respects `any_of` evaluation mode — passes if at least one rule passes, fails only when no rule passes and at least one fails (previously treated identically to `all_required`). The server-side invocation boundary now validates `sourceProfileId` organization ownership before workflow/persistence delegation — when non-null, the referenced `student_profiles` row must exist and its `organization_id` must match the resolved organization context; `sourceProfileId = null` remains allowed and unchanged; source-profile boundary failures produce one unified outward-facing access-denied message (not-found and foreign-org are indistinguishable); the route classifier maps source-profile failures through the existing 403 path. The atomic persistence RPC function execution boundary has been hardened: `search_path` set to `public`, broad/default execute revoked, `anon` and `authenticated` blocked, execute granted only to `service_role` and `authenticator`. Unexpected internal 500 errors are now redacted to a generic outward-facing message at the route surface. British golden-case verification baseline covers `eligible`, `not_eligible`, `conditional`, `needs_review`, and advisory non-downgrade using the real execution → assembly → rendering path with no mocking. Simple-form golden-case verification baseline covers `eligible`, `not_eligible`, `conditional`, `needs_review`, and advisory non-downgrade for `arabic_secondary` using the real execution → assembly → rendering path with no mocking. Both British and simple-form golden-case baselines now cover all five current-state final-status outcomes. Verification baseline covers route, invocation boundary, workflow, persistence, generic orchestration, British orchestration, simple-form orchestration, execution engine, result assembly, all three explanation renderers, the pure `required_subject_exists` evaluator, the pure `minimum_subject_grade` evaluator, the pure `minimum_overall_grade` evaluator, the pure `accepted_qualification_type` evaluator, the dedicated trace-level explanation renderer, British golden cases, and simple-form golden cases (299 tests across 19 test files via Vitest). Business UI, broader API surface, and import pipeline do not exist yet.

## If this project is reopened in a new chat

Ask for:

- latest handoff (docs were refreshed to match the current approved branch state)
- latest decisions log
- whether any code was already implemented
- whether the schema changed after the last documented state
