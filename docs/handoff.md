# Handoff

## Project

Advisor Workspace

## Current status

The project has been redefined from scratch.

We are still in the pre-code foundation phase.

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

## What has NOT started yet

- No migrations have been implemented yet
- No application code should be assumed
- No admin UI exists
- No evaluation engine exists in the new repo
- No import pipeline exists yet

## Current recommended next step

Create the repo baseline and documentation files, then write the first Claude Code prompt for:

- core schema migration only
- enums
- constraints
- indexes
- no UI
- no imports
- no extra features

## Critical constraints to remember

- program != program_offering
- no logic in UI
- British qualification requires subject records
- no direct AI publish
- no CRM expansion
- missing rules => hide unsupported context in UI and return `needs_review` in runtime

## Last architectural state

We are ready to move from documentation into the first implementation prompt, but only after the repo baseline files are created.

## If this project is reopened in a new chat

Ask for:

- latest handoff
- latest decisions log
- whether any code was already implemented
- whether the schema changed after the last documented state
