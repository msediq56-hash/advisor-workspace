# Phase 1 Foundation Smoke Report

**Date:** 2026-03-25
**Environment:** Local Supabase (Docker), all 6 migrations applied via `supabase db reset`

## Verdict

**Phase 1 smoke test passed after RLS recursion fix.**

All 6 migrations apply cleanly. All 25 RLS-dependent test scenarios pass.

## History

### Initial run (before Migration 6)

All 25 scenarios failed due to infinite recursion in RLS policies on `organization_memberships`. The root cause was that RLS policies referenced `organization_memberships` in subqueries, and PostgreSQL applies RLS to those subqueries, triggering the same policies recursively.

### Fix applied (Migration 6)

Migration 6 (`00006_fix_recursive_identity_rls.sql`) introduced two `SECURITY DEFINER` helper functions:
- `is_active_member_of(target_org_id uuid)` — checks active membership in an active org, bypassing RLS
- `is_owner_of(target_org_id uuid)` — checks active owner membership in an active org, bypassing RLS

The 4 affected policies were dropped and recreated using these functions:
- `organizations_select_active_member`
- `organization_branding_select_active_member`
- `organization_memberships_select_org_owner`
- `user_profiles_select_org_owner`

The 2 safe baseline self-read policies were not touched:
- `user_profiles_select_own` (`id = auth.uid()`)
- `organization_memberships_select_own` (`user_id = auth.uid()`)

### Rerun (after Migration 6)

All 25 scenarios passed.

## What was executed

| Step | Status |
|---|---|
| `supabase db reset` (6 migrations) | PASSED |
| Smoke data setup (5 users, 2 orgs, 2 brandings, 4 memberships) | PASSED |
| Auth sign-in for all 5 users | PASSED |
| 25 RLS-dependent SELECT scenarios | ALL PASSED |

## Test results (25 scenarios)

### 1. Identity / Actor
- 1a: Active user reads own profile — PASS
- 1b: Inactive user reads own profile (is_active=false visible) — PASS
- 1c: Non-org-mate cannot read another user's profile — PASS
- 1d: No-membership user sees only own profile — PASS

### 2. Organization Context
- 2a: Owner A sees exactly org A — PASS
- 2b: No-membership user sees zero organizations — PASS
- 2c: Member B sees only org B — PASS
- 2d: Member A (advisor) sees only org A — PASS

### 3. Membership RLS
- 3a: Owner A can read own membership — PASS
- 3b: Owner A reads all 3 org A memberships via owner-read — PASS
- 3c: Owner A cannot read org B memberships — PASS
- 3d: Advisor reads only own membership — PASS
- 3e: Member B cannot read org A memberships — PASS

### 4. User Profile Owner-Read RLS
- 4a: Owner A reads 3 org A user profiles via owner-read — PASS
- 4b: Owner A cannot read org B member's profile — PASS
- 4c: Advisor reads only own profile — PASS

### 5. Organization Branding RLS
- 5a: Owner A reads org A branding — PASS
- 5b: Owner A cannot read org B branding — PASS
- 5c: Member B reads only org B branding — PASS
- 5d: No-membership user reads zero branding rows — PASS

### 6. Cross-Org Isolation
- 6a: Member B cannot see org A — PASS
- 6b: Owner A cannot see org B — PASS
- 6c: Member B cannot read owner A's profile — PASS
- 6d: Member B cannot read org A memberships — PASS
- 6e: Member B cannot read org A branding — PASS

## Can Phase 1 be considered operationally closed?

**Yes.** All identity, organization, membership, branding, and cross-org isolation RLS behaviors are validated. The RLS recursion bug has been fixed. The schema and RLS foundation are ready for Catalog Core.

## Helper-level smoke coverage

Not attempted in this smoke run. The application-layer helpers (actor, org-context, workspace bootstrap) compose the same Supabase client and RLS-protected queries validated here. Full helper-level integration testing will be meaningful when the first real consumer (Catalog Core or workspace bootstrap route) is implemented.

## Smoke test script

`scripts/smoke/phase1-foundation-smoke.ts` — reproducible, run with `npx tsx scripts/smoke/phase1-foundation-smoke.ts` after `npx supabase db reset`.
