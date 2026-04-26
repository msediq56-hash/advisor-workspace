/**
 * Milestone 2C — Direct Evaluation route-level smoke.
 *
 * Exercises the real POST /api/direct-evaluation route on a running local
 * Next dev server, against the data created by scripts/seed/demo-seed.ts.
 *
 * VALIDATES end-to-end:
 *   - HTTP POST transport at /api/direct-evaluation
 *   - Supabase cookie/session auth boundary (real cookies written by
 *     @supabase/ssr; no hand-crafted cookie names)
 *   - requireActorAccess through the real route path (resolves the
 *     seeded advisor's auth user → user_profiles → org/membership)
 *   - Route error classification: 400 invalid_json, 400 invalid_request_shape,
 *     401 authentication_required, 403 access_denied (sourceProfileId guard)
 *   - Happy-path persistence through the route — one run, one result, four
 *     traces written through persist_direct_evaluation_run_atomic
 *   - Matching-org non-null sourceProfileId happy path: an authenticated
 *     POST that references the seeded same-org student_profiles row
 *     (added in Milestone 2C.1) passes the ownership guard and persists,
 *     and the FK on evaluation_runs.source_profile_id is satisfied.
 *
 * DOES NOT VALIDATE:
 *   - Cross-organization isolation, role-based 403, multi-membership
 *     selection, RLS isolation. RLS coverage stays in Milestone 1 RLS
 *     migrations 00010–00017.
 *
 * PREREQUISITES:
 *   1. Local Supabase up: `npx supabase status`.
 *   2. DB reset and Milestone 2B seed applied:
 *      `npx supabase db reset && npx tsx scripts/seed/demo-seed.ts`.
 *   3. Next dev server running on NEXT_BASE_URL (default
 *      http://127.0.0.1:3000): `npm run dev`.
 *
 * Run with:
 *   npx tsx scripts/smoke/direct-evaluation-route-smoke.ts
 *
 * Required env (defaults from `npx supabase status -o env`):
 *   SUPABASE_URL                  default http://127.0.0.1:54321
 *   SUPABASE_ANON_KEY             required
 *   NEXT_BASE_URL                 optional, default http://127.0.0.1:3000
 *
 * SAFETY:
 *   Refuses NODE_ENV=production. Refuses unless SUPABASE_URL hostname is
 *   exactly "127.0.0.1" or "localhost", and the same for NEXT_BASE_URL
 *   (parsed via URL.hostname, not weak string matching). Never logs the
 *   anon key or auth tokens.
 */

import { createClient as createSupabasePlainClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// Safety guards — must run before any client construction or DB/HTTP access
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === "production") {
  console.error("FATAL: Refusing to run route smoke in NODE_ENV=production.");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const NEXT_BASE_URL = process.env.NEXT_BASE_URL || "http://127.0.0.1:3000";

if (!SUPABASE_ANON_KEY) {
  console.error(
    "FATAL: Set SUPABASE_ANON_KEY env var (from `npx supabase status -o env`).",
  );
  process.exit(1);
}

function requireLocalHostname(label: string, urlString: string): string {
  let host: string;
  try {
    host = new URL(urlString).hostname;
  } catch {
    console.error(`FATAL: ${label} is not a valid URL: "${urlString}"`);
    process.exit(1);
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    console.error(
      `FATAL: ${label} hostname "${host}" is not local. ` +
        "This smoke refuses to run against non-localhost endpoints.",
    );
    process.exit(1);
  }
  return host;
}

const supabaseHost = requireLocalHostname("SUPABASE_URL", SUPABASE_URL);
const nextHost = requireLocalHostname("NEXT_BASE_URL", NEXT_BASE_URL);

// ---------------------------------------------------------------------------
// Constants — must mirror scripts/seed/demo-seed.ts
// ---------------------------------------------------------------------------

const ADVISOR_EMAIL = "advisor@constructor-demo.local";
const ADVISOR_PASSWORD = "constructor-demo-pass-2026";

const SEEDED = {
  countryDeId: "00000000-0000-0000-0000-000000000d01",
  programOfferingId: "00000000-0000-0000-0000-000000000d12",
  qualificationTypeKey: "british_a_level",
  // Same-org sample student profile created by scripts/seed/demo-seed.ts
  // (Milestone 2C.1). Used by assertion F to exercise the matching-org
  // sourceProfileId happy path. If you change this UUID, also change
  // ID.studentProfile in scripts/seed/demo-seed.ts.
  studentProfileId: "00000000-0000-0000-0000-000000000d70",
} as const;

const ROUTE_PATH = "/api/direct-evaluation";
const ROUTE_URL = `${NEXT_BASE_URL}${ROUTE_PATH}`;

// A random UUID that is extremely unlikely to exist in any seeded table.
// Used to exercise the unified outward source-profile failure (403).
const NONEXISTENT_SOURCE_PROFILE_ID = "99999999-9999-9999-9999-999999999999";

const HAPPY_REQUEST_BODY = {
  sourceProfileId: null as string | null,
  evaluation: {
    family: "british_curriculum",
    offeringId: SEEDED.programOfferingId,
    qualificationTypeKey: SEEDED.qualificationTypeKey,
    payload: {
      header: {
        countryId: SEEDED.countryDeId,
        notesAr: null,
        curriculumLabel: "British A-Level",
        graduationYear: 2026,
        headerNotesAr: null,
      },
      subjects: [
        {
          subjectName: "Mathematics",
          subjectLevel: "A Level",
          grade: "A",
          notesAr: null,
        },
        {
          subjectName: "Physics",
          subjectLevel: "A Level",
          grade: "B",
          notesAr: null,
        },
        {
          subjectName: "Computer Science",
          subjectLevel: "A Level",
          grade: "C",
          notesAr: null,
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

interface AssertionRecord {
  name: string;
  ok: boolean;
  detail?: string;
}
const results: AssertionRecord[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string): never {
  results.push({ name, ok: false, detail });
  console.log(`  FAIL  ${name} — ${detail}`);
  throw new Error(`Smoke step failed: ${name} — ${detail}`);
}

// ---------------------------------------------------------------------------
// Step 1 — Reachability gate
// ---------------------------------------------------------------------------

async function checkDevServerReachable(): Promise<void> {
  // GET on a POST-only route returns 405. Any HTTP response confirms the
  // dev server is up; we intentionally do not require any specific status.
  let res: Response;
  try {
    res = await fetch(ROUTE_URL, { method: "GET" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `\nFATAL: Could not reach ${NEXT_BASE_URL} (${msg}).` +
        "\nStart the Next dev server first: npm run dev",
    );
    process.exit(1);
  }
  pass("dev server reachable", `HTTP ${res.status} on GET ${ROUTE_PATH}`);
}

// ---------------------------------------------------------------------------
// Step 2 — Sign in advisor and capture Supabase auth cookies
// ---------------------------------------------------------------------------

async function signInAdvisor(): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
}> {
  const plainClient = createSupabasePlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await plainClient.auth.signInWithPassword({
    email: ADVISOR_EMAIL,
    password: ADVISOR_PASSWORD,
  });

  if (error || !data.session || !data.user) {
    fail(
      "signInWithPassword (advisor)",
      error?.message ?? "no session/user returned",
    );
  }

  pass(
    "signInWithPassword (advisor)",
    `auth user ${data.user.id} (tokens captured in-memory; not logged)`,
  );
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    userId: data.user.id,
  };
}

async function captureAuthCookieHeader(
  accessToken: string,
  refreshToken: string,
): Promise<string> {
  // In-memory cookie jar that satisfies the @supabase/ssr cookies adapter
  // contract. We use the same library that the route uses on the server, so
  // cookie names and serialization are guaranteed to match.
  const jar = new Map<string, string>();

  const ssrClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return [...jar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: CookieOptions;
        }>,
      ) {
        for (const { name, value } of cookiesToSet) {
          if (value === "") {
            jar.delete(name);
          } else {
            jar.set(name, value);
          }
        }
      },
    },
  });

  const { error: setSessionErr } = await ssrClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (setSessionErr) {
    fail("ssr setSession", setSessionErr.message);
  }

  // Belt-and-suspenders flush: getUser triggers a verified token exchange and
  // ensures the adapter has been written through.
  const { data: userData, error: getUserErr } = await ssrClient.auth.getUser();
  if (getUserErr || !userData?.user) {
    fail(
      "ssr getUser (post-setSession)",
      getUserErr?.message ?? "no user resolved from captured cookies",
    );
  }

  if (jar.size === 0) {
    fail(
      "auth cookie capture",
      "no cookies were written by @supabase/ssr after setSession",
    );
  }

  // Serialize captured cookies into a single Cookie header. Names and values
  // are already cookie-safe because they were produced by @supabase/ssr.
  const cookieHeader = [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  pass(
    "captured Supabase auth cookies",
    `${jar.size} cookie(s) (names redacted; values not logged)`,
  );
  return cookieHeader;
}

// ---------------------------------------------------------------------------
// Step 3 — Assertions A–E
// ---------------------------------------------------------------------------

async function postRoute(params: {
  rawBody: string;
  cookieHeader?: string;
}): Promise<{ status: number; body: unknown; rawText: string }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (params.cookieHeader) {
    headers["cookie"] = params.cookieHeader;
  }

  const res = await fetch(ROUTE_URL, {
    method: "POST",
    headers,
    body: params.rawBody,
  });

  const rawText = await res.text();
  let parsed: unknown = undefined;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Leave parsed as undefined; assertions can still inspect rawText.
  }

  return { status: res.status, body: parsed, rawText };
}

function expectErrorBody(
  step: string,
  body: unknown,
  expectedCode: string,
): { code: string; message: string } {
  if (
    !body ||
    typeof body !== "object" ||
    !("error" in body) ||
    typeof (body as { error: unknown }).error !== "object" ||
    (body as { error: object | null }).error === null
  ) {
    fail(step, `expected error body but got: ${JSON.stringify(body)}`);
  }
  const err = (body as { error: { code: unknown; message: unknown } }).error;
  if (typeof err.code !== "string" || typeof err.message !== "string") {
    fail(step, `error.code/message must be strings; got: ${JSON.stringify(err)}`);
  }
  if (err.code !== expectedCode) {
    fail(step, `expected error.code "${expectedCode}" but got "${err.code}"`);
  }
  return { code: err.code, message: err.message };
}

async function assertA_HappyAuthenticatedPost(cookieHeader: string): Promise<void> {
  const { status, body, rawText } = await postRoute({
    rawBody: JSON.stringify(HAPPY_REQUEST_BODY),
    cookieHeader,
  });

  if (status !== 200) {
    fail(
      "A: happy POST status",
      `expected 200 but got ${status}: ${rawText.slice(0, 500)}`,
    );
  }

  if (!body || typeof body !== "object") {
    fail("A: response shape", `body is not an object: ${rawText.slice(0, 500)}`);
  }
  const obj = body as Record<string, unknown>;
  if (!obj.runtime || typeof obj.runtime !== "object") {
    fail("A: response.runtime", "missing or not an object");
  }
  if (!obj.persistence || typeof obj.persistence !== "object") {
    fail("A: response.persistence", "missing or not an object");
  }

  const runtime = obj.runtime as Record<string, unknown>;
  const assembled = runtime.assembled as Record<string, unknown> | undefined;
  if (!assembled || assembled.finalStatus !== "eligible") {
    fail(
      "A: runtime.assembled.finalStatus",
      `expected "eligible" but got "${assembled?.finalStatus}"`,
    );
  }

  const persistence = obj.persistence as Record<string, unknown>;
  if (
    typeof persistence.evaluationRunId !== "string" ||
    persistence.evaluationRunId.length === 0
  ) {
    fail("A: persistence.evaluationRunId", "missing or empty");
  }
  if (
    typeof persistence.evaluationResultId !== "string" ||
    persistence.evaluationResultId.length === 0
  ) {
    fail("A: persistence.evaluationResultId", "missing or empty");
  }
  if (persistence.persistedRuleTraceCount !== 4) {
    fail(
      "A: persistence.persistedRuleTraceCount",
      `expected 4 but got ${persistence.persistedRuleTraceCount}`,
    );
  }

  pass(
    "A: happy authenticated POST",
    `200 OK, finalStatus=eligible, runId=${persistence.evaluationRunId}, resultId=${persistence.evaluationResultId}, traces=4`,
  );
}

async function assertB_UnauthenticatedPost(): Promise<void> {
  const { status, body, rawText } = await postRoute({
    rawBody: JSON.stringify(HAPPY_REQUEST_BODY),
    // No Cookie header — anonymous request
  });

  if (status !== 401) {
    fail(
      "B: unauthenticated POST status",
      `expected 401 but got ${status}: ${rawText.slice(0, 500)}`,
    );
  }
  expectErrorBody("B: unauthenticated POST error body", body, "authentication_required");
  pass("B: unauthenticated POST", "401 authentication_required");
}

async function assertC_InvalidJson(cookieHeader: string): Promise<void> {
  const { status, body, rawText } = await postRoute({
    rawBody: "{ this is not valid json",
    cookieHeader,
  });

  if (status !== 400) {
    fail(
      "C: invalid JSON status",
      `expected 400 but got ${status}: ${rawText.slice(0, 500)}`,
    );
  }
  expectErrorBody("C: invalid JSON error body", body, "invalid_json");
  pass("C: invalid JSON body", "400 invalid_json");
}

async function assertD_InvalidRequestShape(cookieHeader: string): Promise<void> {
  // Valid JSON but missing the british_curriculum-required `payload` field.
  const malformedBody = {
    sourceProfileId: null,
    evaluation: {
      family: "british_curriculum",
      offeringId: SEEDED.programOfferingId,
      qualificationTypeKey: SEEDED.qualificationTypeKey,
      // payload intentionally omitted — parser must reject this for british_curriculum
    },
  };

  const { status, body, rawText } = await postRoute({
    rawBody: JSON.stringify(malformedBody),
    cookieHeader,
  });

  if (status !== 400) {
    fail(
      "D: invalid shape status",
      `expected 400 but got ${status}: ${rawText.slice(0, 500)}`,
    );
  }
  expectErrorBody("D: invalid shape error body", body, "invalid_request_shape");
  pass("D: invalid request shape", "400 invalid_request_shape");
}

async function assertE_SourceProfileGuard(cookieHeader: string): Promise<void> {
  const guardedBody = {
    ...HAPPY_REQUEST_BODY,
    sourceProfileId: NONEXISTENT_SOURCE_PROFILE_ID,
  };

  const { status, body, rawText } = await postRoute({
    rawBody: JSON.stringify(guardedBody),
    cookieHeader,
  });

  if (status !== 403) {
    fail(
      "E: sourceProfileId guard status",
      `expected 403 but got ${status}: ${rawText.slice(0, 500)}`,
    );
  }
  expectErrorBody("E: sourceProfileId guard error body", body, "access_denied");
  pass(
    "E: sourceProfileId random UUID rejected",
    "403 access_denied (unified outward message)",
  );
}

async function assertF_MatchingOrgSourceProfile(cookieHeader: string): Promise<void> {
  // Same authenticated cookie, same valid British payload, but the
  // sourceProfileId references the seeded same-org student_profiles row.
  // Expected: ownership guard passes; runtime evaluates the request payload
  // unchanged; persistence inserts the run with source_profile_id set
  // (FK on evaluation_runs.source_profile_id is satisfied).
  const matchingOrgBody = {
    ...HAPPY_REQUEST_BODY,
    sourceProfileId: SEEDED.studentProfileId,
  };

  const { status, body, rawText } = await postRoute({
    rawBody: JSON.stringify(matchingOrgBody),
    cookieHeader,
  });

  if (status !== 200) {
    fail(
      "F: matching-org sourceProfileId status",
      `expected 200 but got ${status}: ${rawText.slice(0, 500)}`,
    );
  }

  if (!body || typeof body !== "object") {
    fail(
      "F: response shape",
      `body is not an object: ${rawText.slice(0, 500)}`,
    );
  }
  const obj = body as Record<string, unknown>;
  const runtime = obj.runtime as Record<string, unknown> | undefined;
  const assembled = runtime?.assembled as Record<string, unknown> | undefined;
  if (!assembled || assembled.finalStatus !== "eligible") {
    fail(
      "F: runtime.assembled.finalStatus",
      `expected "eligible" but got "${assembled?.finalStatus}"`,
    );
  }

  const persistence = obj.persistence as Record<string, unknown> | undefined;
  if (
    !persistence ||
    typeof persistence.evaluationRunId !== "string" ||
    persistence.evaluationRunId.length === 0
  ) {
    fail("F: persistence.evaluationRunId", "missing or empty");
  }
  if (
    typeof persistence.evaluationResultId !== "string" ||
    persistence.evaluationResultId.length === 0
  ) {
    fail("F: persistence.evaluationResultId", "missing or empty");
  }
  if (persistence.persistedRuleTraceCount !== 4) {
    fail(
      "F: persistence.persistedRuleTraceCount",
      `expected 4 but got ${persistence.persistedRuleTraceCount}`,
    );
  }

  pass(
    "F: matching-org sourceProfileId accepted",
    `200 OK, finalStatus=eligible, runId=${persistence.evaluationRunId}, resultId=${persistence.evaluationResultId}, traces=4`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(
    "\n=== Direct Evaluation route-level smoke (Constructor CS / British A-Level) ===\n",
  );
  console.log(`Supabase URL:     ${SUPABASE_URL}`);
  console.log(`Supabase host:    PASS (${supabaseHost})`);
  console.log(`Next base URL:    ${NEXT_BASE_URL}`);
  console.log(`Next host:        PASS (${nextHost})`);
  console.log(`NODE_ENV guard:   PASS (${process.env.NODE_ENV ?? "<unset>"})\n`);

  await checkDevServerReachable();

  const session = await signInAdvisor();
  const cookieHeader = await captureAuthCookieHeader(
    session.accessToken,
    session.refreshToken,
  );

  await assertA_HappyAuthenticatedPost(cookieHeader);
  await assertB_UnauthenticatedPost();
  await assertC_InvalidJson(cookieHeader);
  await assertD_InvalidRequestShape(cookieHeader);
  await assertE_SourceProfileGuard(cookieHeader);
  await assertF_MatchingOrgSourceProfile(cookieHeader);

  console.log("\n--- Summary ---");
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;
  console.log(`PASS: ${okCount}`);
  console.log(`FAIL: ${failCount}`);

  if (failCount > 0) {
    console.error("\nRoute smoke FAILED.");
    process.exit(1);
  }

  console.log("\nDirect Evaluation route-level smoke completed successfully.");
}

main().catch((err) => {
  console.error("\nFATAL during route smoke:", err instanceof Error ? err.message : err);
  process.exit(1);
});
