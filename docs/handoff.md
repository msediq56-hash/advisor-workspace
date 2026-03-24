# Handoff

## Project

Advisor Workspace

## Current status

Migration 1 (core schema) has been implemented and validated against a live Supabase PostgreSQL instance.

The project is past the pre-code foundation phase and into early implementation.

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

## What has NOT started yet

- No Migration 2 (import pipeline tables)
- No application code
- No admin UI
- No evaluation engine
- No RLS policies

## Current recommended next step

Proceed to Migration 2 (import pipeline tables: `import_batches`, `import_batch_rows`, `publish_actions`) or RLS policies, depending on priority.

## Critical constraints to remember

- program != program_offering
- no logic in UI
- British qualification requires subject records
- no direct AI publish
- no CRM expansion
- missing rules => hide unsupported context in UI and return `needs_review` in runtime

## Last architectural state

Migration 1 core schema is implemented and runtime-validated on Supabase. No application code exists.

## If this project is reopened in a new chat

Ask for:

- latest handoff
- latest decisions log
- whether any code was already implemented
- whether the schema changed after the last documented state
