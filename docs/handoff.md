# Handoff

## Project

Advisor Workspace

## Current status

**Phase 1 is operationally closed.**
Phase 1 debt fixes have been applied.
Phase 2 Catalog Core is implemented (read-only service layer).
Phase 3 simple-form qualification preparation path is implemented.
Phase 4 British specialized qualification preparation path is implemented end-to-end through raw assembly, normalization, level handling, and British preparation services.
Phase 4 Evaluation slice 1 (published direct-evaluation rule context resolver) is implemented.

No evaluator logic exists yet. No count-based rules support. No import pipeline. No admin UI. No CRM features.

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

### Phase 4 Evaluation (slice 1)

- `src/modules/evaluation/resolve-direct-evaluation-rule-context.ts` — published rule context resolver with ownership filtering

## What has NOT started yet

- No evaluator logic (rule group/rule execution, result calculation)
- No count-based rules support
- No import pipeline (tables or code)
- No admin UI
- No business UI
- No CRM features

## Current recommended next step

British count-based rules support baseline.

## Critical constraints to remember

- program != program_offering
- no logic in UI
- British qualification requires subject records
- no direct AI publish
- no CRM expansion
- missing rules => hide unsupported context in UI and return `needs_review` in runtime

## Last architectural state

Migration 1 core schema and 6 RLS migrations (00002–00007) are runtime-validated on Supabase. Phase 1 smoke test passed (25/25). Phase 2 Catalog Core provides read-only activated catalog browse, selection, and target context. Phase 3 provides simple-form qualification preparation end-to-end. Phase 4 provides British specialized preparation end-to-end and rule context resolution (slice 1). No evaluator or rule execution exists yet.

## If this project is reopened in a new chat

Ask for:

- latest handoff
- latest decisions log
- whether any code was already implemented
- whether the schema changed after the last documented state
