# Advisor Workspace

Arabic-first B2B SaaS for education agencies.

## Core purpose

Advisor Workspace is a decision-support system for academic advisors inside student recruitment agencies.

It is built around:

1. Direct evaluation
2. General comparison
3. Admin configuration

It is **not** a CRM.

It does **not** handle application tracking, document workflows, or student portal features in v1.

## Core product scope

- Structured university and program catalog
- Qualification-aware student profile input
- Rule-based eligibility engine
- Explainable evaluation results
- General comparison workflow
- Admin panel for managing universities, programs, offerings, and rules

## Primary market

- Arabic-speaking student recruitment agencies
- Germany private universities first

## User roles

- Owner
- Manager
- Advisor

## Current authoritative documents

- `docs/project-definition.md`
- `docs/system-architecture-v1.1.md`
- `docs/database-design-v1.1.md`
- `docs/schema-map-v1.md`

## Working rules

- Do not put business logic in UI
- Do not treat program and program offering as the same entity
- Do not assume all qualifications can be modeled the same way
- British qualification requires subject-based handling
- Data errors are not automatically engine errors
- No uncontrolled expansion into CRM scope

## Repo status

This repository starts from architecture and schema first.

No production code should be added before the core documentation and constraints are respected.
