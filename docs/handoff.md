# Handoff

## Project

Advisor Workspace

## Current status

Migration 1 (core schema) has been implemented and validated against a live Supabase PostgreSQL instance.

Minimal Next.js + Supabase application scaffold is in place with typed auth/session and org-context foundations.

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

- Migration 1: core schema (`supabase/migrations/00001_core_schema.sql`)
  - 17 enums, 30 tables, 23 indexes, 3 partial unique indexes
  - Covers: Identity, Catalog, Overlay, Qualification, Rules, Evaluation, Governance
  - Validated against live Supabase PostgreSQL via `supabase db reset`
- Supabase project initialized (`supabase/config.toml`)
- `src/types/enums.ts` — temporary enum union types aligned with PostgreSQL enums
- `src/types/database.ts` — minimal DB-facing interfaces for early session/org-context type foundation
- Application scaffold (Next.js + Supabase):
  - `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `.env.example`
  - `src/app/layout.tsx`, `src/app/page.tsx` — minimal App Router shell (Arabic RTL)
  - `src/lib/env.ts` — runtime env validation
  - `src/lib/supabase/server.ts`, `browser.ts`, `admin.ts` — typed Supabase client factories
  - `src/lib/auth/session.ts` — server-side session resolution
  - `src/lib/permissions/org-context.ts` — org context resolution
  - `src/types/auth.ts` — session and org-context type shapes

## What has NOT started yet

- No Migration 2 (import pipeline tables)
- No catalog service
- No admin UI
- No evaluation engine
- No normalization layer
- No RLS policies
- No CRM features

## Current recommended next step

Backend service layer foundation (catalog read services or RLS policies).

## Critical constraints to remember

- program != program_offering
- no logic in UI
- British qualification requires subject records
- no direct AI publish
- no CRM expansion
- missing rules => hide unsupported context in UI and return `needs_review` in runtime

## Last architectural state

Migration 1 core schema is implemented and runtime-validated on Supabase. Minimal application scaffold with typed auth/session and org-context foundations is in place. No domain services or business UI exist yet.

## If this project is reopened in a new chat

Ask for:

- latest handoff
- latest decisions log
- whether any code was already implemented
- whether the schema changed after the last documented state
