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
Phase 5 Evaluation execution baseline is implemented (minimum_subject_count rule type only).
Phase 5 Result assembly baseline is implemented.
Phase 5 Explanation rendering baseline is implemented (primary reason, next step, advisory notes, trace-level rule explanations — all Arabic).

British, simple-form, and generic multi-family direct-evaluation in-memory orchestration baselines are implemented. Direct-evaluation persistence write baseline, run-and-persist workflow baseline, and first server-side invocation boundary are implemented (all service-layer only, no UI, no routes, no API handlers). No import pipeline. No admin UI. No business UI. No CRM features.

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

- `src/types/direct-evaluation-execution.ts` — execution trace types (rule/group outcomes)
- `src/modules/evaluation/evaluate-minimum-subject-count-rule.ts` — minimum_subject_count rule executor (composes British count helper)
- `src/modules/evaluation/execute-direct-evaluation-rule-context.ts` — resolved context executor (accepts both British and simple-form prepared input; minimum_subject_count British-only, skipped for non-British; unsupported types skipped)

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
- `src/types/direct-evaluation-trace-explanation.ts` — trace-level explanation input/result types
- `src/modules/evaluation/render-direct-evaluation-rule-trace-explanation.ts` — dedicated pure Arabic trace explanation renderer (minimum_subject_count only; passed/failed/skipped; throws on unsupported types or missing counts)

### Phase 5 Orchestration baselines

- `src/types/direct-evaluation-orchestration.ts` — composed runtime result types and generic input contract (British + simple-form + generic)
- `src/modules/evaluation/run-british-direct-evaluation.ts` — British direct-evaluation in-memory orchestrator (composes preparation → rule resolution → execution → assembly → rendering)
- `src/modules/evaluation/run-simple-form-direct-evaluation.ts` — simple-form direct-evaluation in-memory orchestrator (same composition sequence, uses prepared-input resolver path)
- `src/modules/evaluation/run-direct-evaluation.ts` — generic multi-family router over British and simple-form orchestrators (thin switch on `family` discriminant)

### Phase 5 Persistence baseline

- `src/types/direct-evaluation-persistence.ts` — typed persistence payload/result shapes for evaluation_runs, evaluation_results, evaluation_rule_traces
- `src/modules/evaluation/persist-direct-evaluation-run.ts` — sequential write service (run → result → traces); caller-supplied Supabase client and caller-supplied already-computed payload; no execution/assembly/rendering inside persistence

### Phase 5 Run-and-persist workflow baseline

- `src/types/direct-evaluation-run-and-persist.ts` — workflow input/result types and caller-owned persistence metadata
- `src/modules/evaluation/run-and-persist-direct-evaluation.ts` — service-layer composition: generic runtime + trace explanation renderer + persistence write service; caller-owned metadata explicit; unsupported skipped traces use fixed compatibility explanation; unsupported non-skipped traces throw; no UI, no routes, no API handlers, no server actions

### Phase 5 Server-side invocation boundary

- `src/types/direct-evaluation-server-invocation.ts` — invocation input/result types
- `src/modules/evaluation/invoke-direct-evaluation-workflow.ts` — first server-side invocation boundary; uses existing access helpers to resolve actor/org context; passes through organizationId and allowedRoles to requireActorAccess; derives organizationId and actorUserId from resolved access/session; keeps sourceProfileId explicit; calls runAndPersistDirectEvaluation with admin client; returns workflow output unchanged; not a route, not an API handler, not a server action

## What has NOT started yet

- No direct-evaluation routes or API handlers (invocation boundary exists but is not exposed as a route/API surface)
- No business UI
- No broader evaluator support beyond `minimum_subject_count`
- No broader trace explanation rendering across other rule types (trace-level rendering limited to `minimum_subject_count`; workflow uses fixed compatibility string for unsupported skipped traces only)
- No import pipeline (tables or code)
- No admin UI
- No business UI
- No CRM features

## Current recommended next step

First direct-evaluation route or API invocation surface (still no business UI).

## Critical constraints to remember

- program != program_offering
- no logic in UI
- British qualification requires subject records
- no direct AI publish
- no CRM expansion
- missing rules => hide unsupported context in UI and return `needs_review` in runtime

## Last architectural state

Migration 1 core schema and 6 RLS migrations (00002–00007) are runtime-validated on Supabase. Phase 1 smoke test passed (25/25). Phase 2 Catalog Core provides read-only activated catalog browse, selection, and target context. Phase 3 provides simple-form qualification preparation end-to-end. Phase 4 provides British specialized preparation end-to-end, British count-based rules support baseline, and execution-ready published rule context resolution with ordered groups/rules. Phase 5 provides minimum_subject_count execution baseline, final status result assembly, and Arabic explanation rendering (primary reason, next step, advisory notes, trace-level rule explanations). British and simple-form direct-evaluation in-memory orchestration baselines exist. Executor prepared-input contract is widened for both families; minimum_subject_count remains British-only. Generic multi-family direct-evaluation orchestration baseline exists as a thin in-memory router. Direct-evaluation persistence write baseline, run-and-persist workflow baseline, and first server-side invocation boundary exist (all service-layer only; invocation boundary resolves actor/org context via existing helpers and passes through to workflow). No direct-evaluation routes, API handlers, or business UI exist yet.

## If this project is reopened in a new chat

Ask for:

- latest handoff (docs were refreshed to match the current approved branch state)
- latest decisions log
- whether any code was already implemented
- whether the schema changed after the last documented state
