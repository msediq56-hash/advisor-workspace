# Handoff

## Project

Advisor Workspace

## Current status

**Phase 1 is operationally closed.**

Migration 1 (core schema) and 5 RLS migrations (00002–00006) are runtime-validated on Supabase.
Minimal Next.js + Supabase scaffold is in place.
Phase 1 Foundation (identity, organization, tenant-scoping, role-capability, ownership, workspace access) is implemented.
Phase 1 smoke test passed (25/25 scenarios) against the live local Supabase stack.

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
- Migration 2: identity RLS baseline (`supabase/migrations/00002_identity_rls_baseline.sql`)
  - SELECT-only policies for user_profiles, organizations, organization_memberships
- Migration 3: organization branding RLS (`supabase/migrations/00003_organization_branding_rls.sql`)
  - SELECT-only policy for organization_branding scoped to active membership
- Migration 4: organization memberships owner-read RLS (`supabase/migrations/00004_organization_memberships_owner_read_rls.sql`)
  - Owners can read all memberships in their active organization
- Migration 5: user profiles owner-read RLS (`supabase/migrations/00005_user_profiles_owner_read_rls.sql`)
  - Owners can read profiles of members in their active organization
- Migration 6: recursive RLS fix (`supabase/migrations/00006_fix_recursive_identity_rls.sql`)
  - Two SECURITY DEFINER helpers (`is_active_member_of`, `is_owner_of`) replace recursive policy subqueries
- Supabase project initialized (`supabase/config.toml`)
- Phase 1 smoke test (`scripts/smoke/phase1-foundation-smoke.ts`) — 25/25 pass

### Application scaffold

- `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `.env.example`
- `src/app/layout.tsx`, `src/app/page.tsx` — minimal App Router shell (Arabic RTL)
- `src/lib/env.ts` — runtime env validation
- `src/lib/supabase/server.ts`, `browser.ts`, `admin.ts` — typed Supabase client factories

### Type foundation

- `src/types/enums.ts` — temporary enum unions aligned with PostgreSQL enums
- `src/types/database.ts` — minimal DB-facing interfaces
- `src/types/auth.ts` — session, org-context, actor, actor-access types
- `src/types/ownership.ts` — owner-scope record types
- `src/types/organization.ts` — organization summary type
- `src/types/membership.ts` — membership summary type
- `src/types/workspace-context.ts` — current workspace context type
- `src/types/role-capabilities.ts` — role capability key type
- `src/types/workspace-capabilities.ts` — workspace capabilities type
- `src/types/workspace-role.ts` — workspace role type
- `src/types/workspace-owned-data-access.ts` — readable/writable owned data access types
- `src/types/organization-branding.ts` — branding summary type
- `src/types/organization-branding-access.ts` — branding settings access type
- `src/types/organization-memberships-read.ts` — memberships read access type
- `src/types/user-profiles-read.ts` — user profile summary and profiles read access type
- `src/types/organization-members-read.ts` — organization members read access type
- `src/types/organization-members-management-access.ts` — members management access type
- `src/types/organization-settings-read-access.ts` — org settings read access type
- `src/types/workspace-run-access.ts` — workspace run access type
- `src/types/workspace-bootstrap.ts` — workspace bootstrap type

### Phase 1 Foundation helpers

- `src/lib/auth/session.ts` — server-side session resolution (RLS-aware)
- `src/lib/auth/actor.ts` — active actor profile resolution (RLS-aware)
- `src/lib/auth/actor-access.ts` — actor-aware request access composition
- `src/lib/permissions/org-context.ts` — org context resolution (RLS-aware)
- `src/lib/permissions/guards.ts` — org context and role guards
- `src/lib/permissions/request-access.ts` — composed request access helper
- `src/lib/permissions/ownership.ts` — pure ownership shape validation
- `src/lib/permissions/organization-ownership.ts` — org-owned record access
- `src/lib/permissions/readable-owner-scope.ts` — read-side tenant scope
- `src/lib/permissions/writable-owner-scope.ts` — write-side tenant scope
- `src/lib/permissions/role-capabilities.ts` — fixed role-capability mapping
- `src/lib/organizations/current-organization.ts` — current org summary
- `src/lib/organizations/current-membership.ts` — current membership summary
- `src/lib/organizations/current-workspace-context.ts` — workspace context composition
- `src/lib/organizations/current-workspace-capabilities.ts` — workspace capabilities
- `src/lib/organizations/current-workspace-capability-guards.ts` — capability guards
- `src/lib/organizations/current-workspace-role.ts` — workspace role
- `src/lib/organizations/current-workspace-role-guards.ts` — workspace role guards
- `src/lib/organizations/current-workspace-owned-data-access.ts` — owned data access guards
- `src/lib/organizations/current-organization-branding.ts` — branding summary
- `src/lib/organizations/current-organization-branding-access.ts` — branding settings access
- `src/lib/organizations/current-organization-memberships.ts` — memberships read
- `src/lib/organizations/current-organization-user-profiles.ts` — user profiles read
- `src/lib/organizations/current-organization-members.ts` — combined members read
- `src/lib/organizations/current-organization-members-management-access.ts` — members management
- `src/lib/organizations/current-organization-settings-read-access.ts` — org settings read
- `src/lib/organizations/current-workspace-run-access.ts` — workspace run access
- `src/lib/organizations/current-workspace-bootstrap.ts` — workspace bootstrap

## What has NOT started yet

- No catalog service (read or write)
- No evaluation engine
- No normalization layer
- No import pipeline (tables or code)
- No admin UI
- No business UI
- No CRM features

## Current recommended next step

First Catalog Core slice — read-only catalog service foundation for countries, universities, programs, and program offerings.

## Critical constraints to remember

- program != program_offering
- no logic in UI
- British qualification requires subject records
- no direct AI publish
- no CRM expansion
- missing rules => hide unsupported context in UI and return `needs_review` in runtime

## Last architectural state

Migration 1 core schema and 5 RLS migrations (00002–00006) are runtime-validated on Supabase. Phase 1 smoke test passed (25/25). Minimal application scaffold with complete Phase 1 Foundation (auth, actor, org context, role-capability, ownership, workspace access) is in place. Phase 1 is operationally closed. No domain services or business UI exist yet.

## If this project is reopened in a new chat

Ask for:

- latest handoff
- latest decisions log
- whether any code was already implemented
- whether the schema changed after the last documented state
