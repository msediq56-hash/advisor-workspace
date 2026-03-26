# Decisions Log

## Decision 001

**Title:** The product is not a CRM
**Status:** Final
**Why:** Scope protection. The product focuses on advisor enablement through eligibility and comparison, not application tracking or document workflows.

---

## Decision 002

**Title:** Core v1 scope
**Status:** Final
**Decision:** v1 focuses on:

1. Direct evaluation
2. General comparison
3. Admin configuration

---

## Decision 003

**Title:** Arabic-first product
**Status:** Final
**Decision:** The full v1 user experience is Arabic-first, including advisor-facing UI and admin-facing UI.

---

## Decision 004

**Title:** program and program_offering are separate entities
**Status:** Final
**Why:** One academic program can have multiple operational offerings with different intakes, fees, campuses, or availability.

---

## Decision 005

**Title:** British qualification requires subject-based modeling
**Status:** Final
**Why:** British profiles cannot be handled safely as generic key/value-only answers.

---

## Decision 006

**Title:** Business logic must not live in UI
**Status:** Final
**Why:** Prevents duplication, hidden behavior, and architectural drift.

---

## Decision 007

**Title:** Rule engine direction
**Status:** Final
**Decision:** Use typed rule registry architecture, not hardcoded columns and not uncontrolled JSON.

---

## Decision 008

**Title:** Rule severity location
**Status:** Final
**Decision:** In v1.1, severity is defined at the rule group level, not per rule.

---

## Decision 009

**Title:** No-rules behavior
**Status:** Final
**Decision:** Unsupported offering + qualification contexts should be hidden in UI where possible, and runtime must return `needs_review`.

---

## Decision 010

**Title:** Normalization ownership
**Status:** Final
**Decision:** Normalization happens in backend/service normalization layer, not in UI.

---

## Decision 011

**Title:** Data errors are not automatically engine errors
**Status:** Final
**Decision:** The system must distinguish between engine bugs, rule modeling errors, data entry errors, and import/transformation errors.

---

## Decision 012

**Title:** Platform library + tenant overlay
**Status:** Final
**Decision:** The platform owns the core library. Organizations activate and optionally override what they use.

---

## Decision 013

**Title:** Versioning for rules
**Status:** Final
**Decision:** Rules must support draft/published/archived lifecycle through versioned rule sets.

---

## Decision 014

**Title:** Import pipeline is not phase 1
**Status:** Final
**Decision:** Core schema comes first. Import/staging/publish comes after core schema is stable.

---

## Decision 015

**Title:** Migration 1 accepted after local runtime validation
**Status:** Final
**Decision:** Migration 1 core schema (30 tables, 17 enums, 23 indexes, 3 partial unique indexes) was validated by applying it against a live Supabase PostgreSQL instance via `supabase db reset`. It is now the accepted baseline schema.

---

## Decision 016

**Title:** qualification_types uniqueness uses partial unique indexes
**Status:** Final
**Decision:** A single composite unique constraint cannot enforce key uniqueness for platform-owned rows because PostgreSQL treats NULLs as distinct. Two partial unique indexes are used: one for platform-owned rows (`UNIQUE (key) WHERE owner_scope = 'platform'`) and one for organization-owned rows (`UNIQUE (owner_organization_id, key) WHERE owner_scope = 'organization'`).

---

## Decision 017

**Title:** Supabase CLI is the standard local migration workflow
**Status:** Final
**Decision:** The project uses Supabase CLI for migration management and local development. Migrations live in `supabase/migrations/`. Local validation uses `supabase db reset`.

---

## Decision 018

**Title:** RLS policies must not self-reference tables recursively
**Status:** Final
**Decision:** Membership-based RLS policies must avoid recursive self-reference on `organization_memberships`. When a policy needs to check membership or ownership internally, use narrowly scoped `SECURITY DEFINER` helper functions that bypass RLS for the lookup.

---

## Decision 019

**Title:** Phase closeout requires smoke validation against live local Supabase
**Status:** Final
**Decision:** A phase is not considered operationally closed until a smoke test passes against the live local Supabase stack via `supabase db reset` and real authenticated queries.

---

## Decision 020

**Title:** RLS added for organization_offering_settings
**Status:** Final
**Decision:** Phase 1 debt fix. `organization_offering_settings` has RLS enabled with a SELECT policy using the existing `is_active_member_of` SECURITY DEFINER helper. Enforces tenant isolation at the database level for the overlay table.

---

## Decision 021

**Title:** Duplicated request-access path removed
**Status:** Final
**Decision:** Phase 1 cleanup. `src/lib/permissions/request-access.ts` was removed because the canonical access path goes through `actor-access.ts`. The duplicated helper added confusion without adding value.

---

## Decision 022

**Title:** Catalog Core uses read-only service-layer composition
**Status:** Final
**Decision:** Catalog services compose existing workspace access helpers and the RLS-aware Supabase client. Overlay logic lives in the effective catalog browse service only. Selection and target context services derive from the browse result without reimplementing overlay/ownership logic.

---

## Decision 023

**Title:** Direct evaluation runtime pipeline is split into sequential composable phases
**Status:** Final
**Decision:** Direct evaluation runtime is being built as sequential composable phases: (1) target context resolution, (2) qualification definition/profile capture, (3) normalization, (4) rule context resolution, (5) evaluation execution, (6) result assembly, (7) explanation rendering. Each phase is a separate composable service. Phases 1–4 are implemented. Service-layer baselines for later evaluation phases are implemented in part. Per-family orchestration baselines exist for British and simple-form paths, plus a generic multi-family router. No persistence layer, business UI, or full general comparison flow exists yet.

---

## Decision 024

**Title:** British path is a specialized subject-based preparation path
**Status:** Final
**Decision:** British qualification is handled separately from simple-form families. It has its own assembler, normalizer, and preparation service. British normalization preserves subject records, submitted levels, and adds normalized grade values, segment keys, and level keys.

---

## Decision 025

**Title:** British count-based support is a separate baseline below evaluator semantics
**Status:** Final
**Decision:** Countability (`isCountable`) is added on normalized British subject records based on segment key only. Counting is a pure filter-based helper (segment, level, minimum grade). It does not implement required-subject logic, subject-name classification, deduplication, best-grade selection, or combination policy.

---

## Decision 026

**Title:** Resolved direct-evaluation rule context is execution-ready at baseline level
**Status:** Final
**Decision:** The published rule context resolver now returns ordered published rule groups and ordered active rules with `ruleTypeKey` and raw `ruleConfig` transport. Loading is still separate from execution. Ownership filtering (platform + current org) is enforced in application code because rule tables do not have RLS yet.

---

## Decision 027

**Title:** Evaluation execution baseline is intentionally narrow
**Status:** Final
**Decision:** The execution baseline supports only `minimum_subject_count` rule type. It consumes already-resolved context without re-querying. Unsupported rule types are skipped in execution traces. The execution layer does not calculate final status — that belongs to result assembly.

---

## Decision 028

**Title:** Result assembly is separate from execution
**Status:** Final
**Decision:** Final status is derived from group outcomes and group severities only. Blocking failures → not_eligible, review failures → needs_review, conditional failures → conditional, all satisfied → eligible. Advisory groups do not downgrade final status. Output includes summary counters and preserves group execution traces.

---

## Decision 029

**Title:** Explanation rendering is separate from result assembly and persistence
**Status:** Final
**Decision:** Arabic explanation rendering consumes assembled output only and does not re-execute or re-assemble. Three rendering baselines exist: primary reason, next step, advisory notes. Each maps from `primaryReasonKey` or group-level outcomes to fixed Arabic strings. Unknown keys throw rather than silently degrading.

---

## Decision 030

**Title:** British direct-evaluation orchestration baseline is an in-memory composition layer
**Status:** Final
**Decision:** The British direct-evaluation orchestration baseline composes existing runtime slices in sequence (preparation → rule resolution → execution → assembly → rendering) and returns one composed result object in memory. It is British-only in this slice. It does not add persistence, UI, new rule types, or generic multi-family routing.

---

## Decision 031

**Title:** Simple-form direct-evaluation orchestration baseline is an in-memory composition layer
**Status:** Final
**Decision:** The simple-form direct-evaluation orchestration baseline composes existing runtime slices in the same sequence as the British orchestrator (preparation → rule resolution → execution → assembly → rendering) and returns one composed result object in memory. It is simple-form-only in this slice. It uses the prepared-input resolver path to avoid double preparation. It does not add persistence, UI, new rule types, or generic multi-family routing.

---

## Decision 032

**Title:** Executor prepared-input contract accepts both British and simple-form families
**Status:** Final
**Decision:** The direct-evaluation rule-context executor accepts both `PreparedBritishDirectEvaluation` and `PreparedSimpleFormDirectEvaluation` as prepared input. `minimum_subject_count` remains British-only — for non-British prepared input it produces a `skipped` trace entry instead of executing. This uses the `qualificationFamily` discriminant on the normalized profile for narrowing.

---

## Decision 033

**Title:** Generic multi-family direct-evaluation orchestration baseline accepted
**Status:** Final
**Decision:** The generic direct-evaluation orchestrator (`run-direct-evaluation.ts`) is a thin in-memory router over the existing British and simple-form per-family orchestrators. It uses a `DirectEvaluationInput` discriminated union on `family` to route `british_curriculum` to the British orchestrator and supported simple-form families (`arabic_secondary`, `american_high_school`, `international_baccalaureate`) to the simple-form orchestrator. It does not reimplement preparation, rule resolution, execution, result assembly, or explanation rendering. It does not add persistence, UI, or new rule types. It preserves British specialized routing instead of flattening British into generic simple-form behavior.

---

## Decision 034

**Title:** Direct-evaluation persistence write baseline accepted
**Status:** Final
**Decision:** The direct-evaluation persistence baseline (`persist-direct-evaluation-run.ts`) writes one `evaluation_runs` row, one linked `evaluation_results` row, and zero or more linked `evaluation_rule_traces` rows sequentially. It is write baseline only — server-side/service-layer only. It requires a caller-supplied typed Supabase client and caller-supplied already-computed evaluation data. It does not resolve session, org context, or workspace context. It does not execute rules, assemble results, or render explanations. It does not add UI, routes, or API handlers. It does not create a run-and-persist orchestration flow yet.
