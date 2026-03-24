# CLAUDE.md

## Project identity

This project is **Advisor Workspace**.

It is an Arabic-first B2B SaaS for student recruitment agencies.

Its purpose is to help academic advisors evaluate student eligibility and compare options across universities/programs using structured rules.

## Core scope

The v1 core includes:

1. Direct evaluation
2. General comparison
3. Admin configuration

The system is **not** a CRM.

Do not expand into:

- document workflows
- application tracking
- student portal features
- CRM pipelines
- communication logs
- full task systems

unless explicitly requested.

## Non-negotiable architecture rules

1. `program` is NOT the same as `program_offering`
2. Business logic must NOT live in UI
3. Do NOT model all qualifications the same way
4. British qualification requires subject-based handling
5. Data errors are NOT automatically engine errors
6. Do NOT replace core relational structures with uncontrolled JSON
7. AI-assisted data entry must NEVER publish directly to production
8. Rule sets must support versioning
9. No-rules behavior must be respected:
   - unsupported contexts should be hidden in UI where possible
   - runtime must return `needs_review`, not fake eligibility
10. This project must always respect:
    - `docs/project-definition.md`
    - `docs/system-architecture-v1.1.md`
    - `docs/database-design-v1.1.md`
    - `docs/schema-map-v1.md`

## Working style rules

When asked to implement something:

- First propose a short plan
- State what files you will touch
- State what you will NOT touch
- Keep changes narrow
- Do not refactor unrelated code
- Do not invent business rules
- Do not simplify the British qualification model into generic key/value shortcuts
- Do not bypass schema constraints to make code "work"

## Implementation guardrails

Never do these without explicit approval:

- merge `programs` and `program_offerings`
- remove `student_profile_subjects`
- move normalization logic into frontend UI
- reintroduce severity at rule level inside mixed groups
- create CRM-related tables or workflows
- skip rule versioning
- skip evaluation traces
- replace relational catalog/rule structures with JSON blobs

## Testing expectations

Do not treat passing unit tests as proof of business correctness.

Implementation should respect:

- unit tests
- integration tests
- golden real-world cases
- regression cases

## Documents to read first

Always read these before major implementation:

- `docs/project-definition.md`
- `docs/system-architecture-v1.1.md`
- `docs/database-design-v1.1.md`
- `docs/schema-map-v1.md`
- `docs/current-phase.md`
- `docs/handoff.md`

## Output expectations

When completing a task:

- summarize what was changed
- mention risks
- mention any unresolved points
- mention the next practical step
