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
Phase 5 Explanation rendering baseline is implemented (primary reason, next step, advisory notes — all Arabic).

British direct-evaluation in-memory orchestration baseline is implemented. No simple-form orchestration baseline yet. No persistence for evaluation runs/results/traces. No import pipeline. No admin UI. No business UI. No CRM features.

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
- `src/modules/evaluation/execute-direct-evaluation-rule-context.ts` — resolved context executor (minimum_subject_count supported, unsupported types skipped)

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

### Phase 5 Orchestration baseline (British only)

- `src/types/direct-evaluation-orchestration.ts` — composed runtime result type
- `src/modules/evaluation/run-british-direct-evaluation.ts` — British direct-evaluation in-memory orchestrator (composes preparation → rule resolution → execution → assembly → rendering)

## What has NOT started yet

- No simple-form direct-evaluation orchestration baseline yet
- No generic multi-family orchestration yet
- No persistence for evaluation runs, results, or traces
- No broader evaluator support beyond `minimum_subject_count`
- No broader explanation rendering beyond the current Arabic baseline
- No import pipeline (tables or code)
- No admin UI
- No business UI
- No CRM features

## Current recommended next step

Simple-form direct-evaluation orchestration baseline (in-memory only, no persistence, no UI).

## Critical constraints to remember

- program != program_offering
- no logic in UI
- British qualification requires subject records
- no direct AI publish
- no CRM expansion
- missing rules => hide unsupported context in UI and return `needs_review` in runtime

## Last architectural state

Migration 1 core schema and 6 RLS migrations (00002–00007) are runtime-validated on Supabase. Phase 1 smoke test passed (25/25). Phase 2 Catalog Core provides read-only activated catalog browse, selection, and target context. Phase 3 provides simple-form qualification preparation end-to-end. Phase 4 provides British specialized preparation end-to-end, British count-based rules support baseline, and execution-ready published rule context resolution with ordered groups/rules. Phase 5 provides minimum_subject_count execution baseline, final status result assembly, and Arabic explanation rendering (primary reason, next step, advisory notes). British direct-evaluation in-memory orchestration baseline exists. No simple-form orchestration, persistence layer, or business UI exists yet.

## If this project is reopened in a new chat

Ask for:

- latest handoff (docs were refreshed to match the current approved branch state)
- latest decisions log
- whether any code was already implemented
- whether the schema changed after the last documented state
