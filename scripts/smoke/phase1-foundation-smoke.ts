/**
 * Phase 1 Foundation Smoke Test
 *
 * Validates the identity, organization, RLS, and workspace bootstrap
 * foundation against a running local Supabase instance.
 *
 * Prerequisites:
 *   - `npx supabase db reset` has been run successfully
 *   - Local Supabase is running on default ports
 *
 * Run with:
 *   npx tsx scripts/smoke/phase1-foundation-smoke.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Read from environment or use defaults from `npx supabase status`
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error("FATAL: Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY env vars.");
  console.error("Get them from: npx supabase status");
  process.exit(1);
}

// Admin client (bypasses RLS)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const results: { name: string; pass: boolean; detail?: string }[] = [];

function pass(name: string) {
  results.push({ name, pass: true });
  console.log(`  PASS  ${name}`);
}

function fail(name: string, detail: string) {
  results.push({ name, pass: false, detail });
  console.log(`  FAIL  ${name}: ${detail}`);
}

async function createAuthUser(email: string, password: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Failed to create auth user ${email}: ${error?.message}`);
  return data.user.id;
}

function authedClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(email: string, password: string): Promise<{ accessToken: string; userId: string }> {
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return { accessToken: data.session.access_token, userId: data.user.id };
}

// ---------------------------------------------------------------------------
// Data Setup
// ---------------------------------------------------------------------------

interface SmokeData {
  orgA_id: string;
  orgB_id: string;
  ownerA_id: string;
  memberA_id: string;
  memberB_id: string;
  inactiveUser_id: string;
  noMembershipUser_id: string;
  ownerA_token: string;
  memberA_token: string;
  memberB_token: string;
  inactiveUser_token: string;
  noMembershipUser_token: string;
}

async function setupSmokeData(): Promise<SmokeData> {
  console.log("\n--- Setting up smoke test data ---\n");

  // Create auth users
  const ownerA_id = await createAuthUser("owner-a@smoke.test", "smoke-pass-1");
  const memberA_id = await createAuthUser("member-a@smoke.test", "smoke-pass-2");
  const memberB_id = await createAuthUser("member-b@smoke.test", "smoke-pass-3");
  const inactiveUser_id = await createAuthUser("inactive@smoke.test", "smoke-pass-4");
  const noMembershipUser_id = await createAuthUser("nomember@smoke.test", "smoke-pass-5");

  // Create user_profiles via admin (bypass RLS)
  await admin.from("user_profiles").insert([
    { id: ownerA_id, full_name: "Owner A", email_normalized: "owner-a@smoke.test", is_active: true },
    { id: memberA_id, full_name: "Member A", email_normalized: "member-a@smoke.test", is_active: true },
    { id: memberB_id, full_name: "Member B", email_normalized: "member-b@smoke.test", is_active: true },
    { id: inactiveUser_id, full_name: "Inactive User", email_normalized: "inactive@smoke.test", is_active: false },
    { id: noMembershipUser_id, full_name: "No Membership", email_normalized: "nomember@smoke.test", is_active: true },
  ]);

  // Create organizations
  const { data: orgAData } = await admin.from("organizations").insert({
    slug: "org-a", name_ar: "Organization A", status: "active",
  }).select("id").single();
  const orgA_id = orgAData!.id;

  const { data: orgBData } = await admin.from("organizations").insert({
    slug: "org-b", name_ar: "Organization B", status: "active",
  }).select("id").single();
  const orgB_id = orgBData!.id;

  // Create branding for org A
  await admin.from("organization_branding").insert({
    organization_id: orgA_id,
    display_name_ar: "Org A Display",
    logo_url: "https://example.com/logo-a.png",
    primary_color: "#FF0000",
    secondary_color: "#0000FF",
  });

  // Create branding for org B
  await admin.from("organization_branding").insert({
    organization_id: orgB_id,
    display_name_ar: "Org B Display",
    logo_url: null,
    primary_color: "#00FF00",
    secondary_color: null,
  });

  // Create memberships
  await admin.from("organization_memberships").insert([
    { organization_id: orgA_id, user_id: ownerA_id, role_key: "owner", membership_status: "active" },
    { organization_id: orgA_id, user_id: memberA_id, role_key: "advisor", membership_status: "active" },
    { organization_id: orgB_id, user_id: memberB_id, role_key: "manager", membership_status: "active" },
    { organization_id: orgA_id, user_id: inactiveUser_id, role_key: "advisor", membership_status: "active" },
  ]);

  // Sign in all users to get tokens
  const ownerA = await signIn("owner-a@smoke.test", "smoke-pass-1");
  const memberA = await signIn("member-a@smoke.test", "smoke-pass-2");
  const memberB = await signIn("member-b@smoke.test", "smoke-pass-3");
  const inactiveUser = await signIn("inactive@smoke.test", "smoke-pass-4");
  const noMembershipUser = await signIn("nomember@smoke.test", "smoke-pass-5");

  console.log("  Smoke data created successfully.\n");

  return {
    orgA_id, orgB_id,
    ownerA_id, memberA_id, memberB_id, inactiveUser_id, noMembershipUser_id,
    ownerA_token: ownerA.accessToken,
    memberA_token: memberA.accessToken,
    memberB_token: memberB.accessToken,
    inactiveUser_token: inactiveUser.accessToken,
    noMembershipUser_token: noMembershipUser.accessToken,
  };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

async function testIdentityActor(d: SmokeData) {
  console.log("\n--- 1. Identity / Actor ---\n");

  // 1a: Active user can read own profile
  {
    const c = authedClient(d.ownerA_token);
    const { data, error } = await c.from("user_profiles").select("id, full_name, is_active").eq("id", d.ownerA_id);
    if (!error && data && data.length === 1 && data[0].is_active === true) {
      pass("1a: Active user reads own profile");
    } else {
      fail("1a: Active user reads own profile", `error=${error?.message}, rows=${data?.length}`);
    }
  }

  // 1b: Inactive-profile user can still read own row (RLS only checks auth.uid = id)
  {
    const c = authedClient(d.inactiveUser_token);
    const { data, error } = await c.from("user_profiles").select("id, is_active").eq("id", d.inactiveUser_id);
    if (!error && data && data.length === 1 && data[0].is_active === false) {
      pass("1b: Inactive user reads own profile (is_active=false visible)");
    } else {
      fail("1b: Inactive user reads own profile", `error=${error?.message}, rows=${data?.length}`);
    }
  }

  // 1c: User cannot read another user's profile directly (unless owner-read policy applies)
  {
    const c = authedClient(d.memberB_token);
    const { data } = await c.from("user_profiles").select("id").eq("id", d.ownerA_id);
    if (data && data.length === 0) {
      pass("1c: Non-org-mate cannot read another user's profile");
    } else {
      fail("1c: Non-org-mate cannot read another user's profile", `rows=${data?.length}`);
    }
  }

  // 1d: No-membership user reads own profile only
  {
    const c = authedClient(d.noMembershipUser_token);
    const { data } = await c.from("user_profiles").select("id");
    if (data && data.length === 1 && data[0].id === d.noMembershipUser_id) {
      pass("1d: No-membership user sees only own profile");
    } else {
      fail("1d: No-membership user sees only own profile", `rows=${data?.length}`);
    }
  }
}

async function testOrganizationContext(d: SmokeData) {
  console.log("\n--- 2. Organization Context ---\n");

  // 2a: User with one active membership sees exactly one org
  {
    const c = authedClient(d.ownerA_token);
    const { data } = await c.from("organizations").select("id, slug");
    if (data && data.length === 1 && data[0].id === d.orgA_id) {
      pass("2a: Owner A sees exactly org A");
    } else {
      fail("2a: Owner A sees exactly org A", `rows=${data?.length}, ids=${JSON.stringify(data?.map(r => r.id))}`);
    }
  }

  // 2b: User with no memberships sees zero orgs
  {
    const c = authedClient(d.noMembershipUser_token);
    const { data } = await c.from("organizations").select("id");
    if (data && data.length === 0) {
      pass("2b: No-membership user sees zero organizations");
    } else {
      fail("2b: No-membership user sees zero organizations", `rows=${data?.length}`);
    }
  }

  // 2c: Member B sees only org B
  {
    const c = authedClient(d.memberB_token);
    const { data } = await c.from("organizations").select("id");
    if (data && data.length === 1 && data[0].id === d.orgB_id) {
      pass("2c: Member B sees only org B");
    } else {
      fail("2c: Member B sees only org B", `rows=${data?.length}`);
    }
  }

  // 2d: Member A sees only org A
  {
    const c = authedClient(d.memberA_token);
    const { data } = await c.from("organizations").select("id");
    if (data && data.length === 1 && data[0].id === d.orgA_id) {
      pass("2d: Member A (advisor) sees only org A");
    } else {
      fail("2d: Member A (advisor) sees only org A", `rows=${data?.length}`);
    }
  }
}

async function testMembershipRLS(d: SmokeData) {
  console.log("\n--- 3. Membership RLS ---\n");

  // 3a: Owner A reads own memberships (baseline policy)
  {
    const c = authedClient(d.ownerA_token);
    const { data } = await c.from("organization_memberships").select("id, user_id, organization_id, role_key");
    // Owner A should see: own membership in org A + all org A memberships (owner-read extension)
    const ownRows = data?.filter(r => r.user_id === d.ownerA_id) || [];
    if (ownRows.length >= 1) {
      pass("3a: Owner A can read own membership");
    } else {
      fail("3a: Owner A can read own membership", `own rows=${ownRows.length}`);
    }
  }

  // 3b: Owner A reads all org A memberships (owner-read extension)
  {
    const c = authedClient(d.ownerA_token);
    const { data } = await c.from("organization_memberships").select("id, user_id, organization_id")
      .eq("organization_id", d.orgA_id);
    // Should see: ownerA, memberA, inactiveUser (3 members in org A)
    if (data && data.length === 3) {
      pass("3b: Owner A reads all 3 org A memberships via owner-read");
    } else {
      fail("3b: Owner A reads all 3 org A memberships via owner-read", `rows=${data?.length}`);
    }
  }

  // 3c: Owner A cannot read org B memberships
  {
    const c = authedClient(d.ownerA_token);
    const { data } = await c.from("organization_memberships").select("id")
      .eq("organization_id", d.orgB_id);
    if (data && data.length === 0) {
      pass("3c: Owner A cannot read org B memberships");
    } else {
      fail("3c: Owner A cannot read org B memberships", `rows=${data?.length}`);
    }
  }

  // 3d: Advisor (memberA) reads only own membership (no owner-read)
  {
    const c = authedClient(d.memberA_token);
    const { data } = await c.from("organization_memberships").select("id, user_id");
    if (data && data.length === 1 && data[0].user_id === d.memberA_id) {
      pass("3d: Advisor reads only own membership");
    } else {
      fail("3d: Advisor reads only own membership", `rows=${data?.length}`);
    }
  }

  // 3e: Member B cannot read org A memberships
  {
    const c = authedClient(d.memberB_token);
    const { data } = await c.from("organization_memberships").select("id")
      .eq("organization_id", d.orgA_id);
    if (data && data.length === 0) {
      pass("3e: Member B cannot read org A memberships");
    } else {
      fail("3e: Member B cannot read org A memberships", `rows=${data?.length}`);
    }
  }
}

async function testUserProfileOwnerRead(d: SmokeData) {
  console.log("\n--- 4. User Profile Owner-Read RLS ---\n");

  // 4a: Owner A can read profiles for users in org A
  {
    const c = authedClient(d.ownerA_token);
    const { data } = await c.from("user_profiles").select("id, full_name");
    // Should see: own profile + memberA + inactiveUser (all org A members)
    if (data && data.length === 3) {
      pass("4a: Owner A reads 3 org A user profiles via owner-read");
    } else {
      fail("4a: Owner A reads 3 org A user profiles via owner-read", `rows=${data?.length}, ids=${JSON.stringify(data?.map(r => r.id))}`);
    }
  }

  // 4b: Owner A cannot read member B's profile (org B user)
  {
    const c = authedClient(d.ownerA_token);
    const { data } = await c.from("user_profiles").select("id").eq("id", d.memberB_id);
    if (data && data.length === 0) {
      pass("4b: Owner A cannot read org B member's profile");
    } else {
      fail("4b: Owner A cannot read org B member's profile", `rows=${data?.length}`);
    }
  }

  // 4c: Advisor (memberA) can only read own profile (no owner-read)
  {
    const c = authedClient(d.memberA_token);
    const { data } = await c.from("user_profiles").select("id");
    if (data && data.length === 1 && data[0].id === d.memberA_id) {
      pass("4c: Advisor reads only own profile");
    } else {
      fail("4c: Advisor reads only own profile", `rows=${data?.length}`);
    }
  }
}

async function testBrandingRLS(d: SmokeData) {
  console.log("\n--- 5. Organization Branding RLS ---\n");

  // 5a: Owner A reads branding for org A
  {
    const c = authedClient(d.ownerA_token);
    const { data } = await c.from("organization_branding").select("organization_id, display_name_ar");
    if (data && data.length === 1 && data[0].organization_id === d.orgA_id) {
      pass("5a: Owner A reads org A branding");
    } else {
      fail("5a: Owner A reads org A branding", `rows=${data?.length}`);
    }
  }

  // 5b: Owner A cannot read org B branding
  {
    const c = authedClient(d.ownerA_token);
    const { data } = await c.from("organization_branding").select("organization_id")
      .eq("organization_id", d.orgB_id);
    if (data && data.length === 0) {
      pass("5b: Owner A cannot read org B branding");
    } else {
      fail("5b: Owner A cannot read org B branding", `rows=${data?.length}`);
    }
  }

  // 5c: Member B reads only org B branding
  {
    const c = authedClient(d.memberB_token);
    const { data } = await c.from("organization_branding").select("organization_id, display_name_ar");
    if (data && data.length === 1 && data[0].organization_id === d.orgB_id) {
      pass("5c: Member B reads only org B branding");
    } else {
      fail("5c: Member B reads only org B branding", `rows=${data?.length}`);
    }
  }

  // 5d: No-membership user cannot read any branding
  {
    const c = authedClient(d.noMembershipUser_token);
    const { data } = await c.from("organization_branding").select("organization_id");
    if (data && data.length === 0) {
      pass("5d: No-membership user reads zero branding rows");
    } else {
      fail("5d: No-membership user reads zero branding rows", `rows=${data?.length}`);
    }
  }
}

async function testCrossOrgIsolation(d: SmokeData) {
  console.log("\n--- 6. Cross-Org Isolation ---\n");

  // 6a: Member B cannot see org A
  {
    const c = authedClient(d.memberB_token);
    const { data } = await c.from("organizations").select("id").eq("id", d.orgA_id);
    if (data && data.length === 0) {
      pass("6a: Member B cannot see org A");
    } else {
      fail("6a: Member B cannot see org A", `rows=${data?.length}`);
    }
  }

  // 6b: Owner A cannot see org B
  {
    const c = authedClient(d.ownerA_token);
    const { data } = await c.from("organizations").select("id").eq("id", d.orgB_id);
    if (data && data.length === 0) {
      pass("6b: Owner A cannot see org B");
    } else {
      fail("6b: Owner A cannot see org B", `rows=${data?.length}`);
    }
  }

  // 6c: Member B cannot read org A user profiles
  {
    const c = authedClient(d.memberB_token);
    const { data } = await c.from("user_profiles").select("id").eq("id", d.ownerA_id);
    if (data && data.length === 0) {
      pass("6c: Member B cannot read owner A's profile");
    } else {
      fail("6c: Member B cannot read owner A's profile", `rows=${data?.length}`);
    }
  }

  // 6d: Member B cannot read org A memberships
  {
    const c = authedClient(d.memberB_token);
    const { data } = await c.from("organization_memberships").select("id").eq("organization_id", d.orgA_id);
    if (data && data.length === 0) {
      pass("6d: Member B cannot read org A memberships");
    } else {
      fail("6d: Member B cannot read org A memberships", `rows=${data?.length}`);
    }
  }

  // 6e: Member B cannot read org A branding
  {
    const c = authedClient(d.memberB_token);
    const { data } = await c.from("organization_branding").select("organization_id").eq("organization_id", d.orgA_id);
    if (data && data.length === 0) {
      pass("6e: Member B cannot read org A branding");
    } else {
      fail("6e: Member B cannot read org A branding", `rows=${data?.length}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("========================================");
  console.log("Phase 1 Foundation Smoke Test");
  console.log("========================================");

  let data: SmokeData;
  try {
    data = await setupSmokeData();
  } catch (err: any) {
    console.error("\nFATAL: Data setup failed:", err.message);
    process.exit(1);
  }

  await testIdentityActor(data);
  await testOrganizationContext(data);
  await testMembershipRLS(data);
  await testUserProfileOwnerRead(data);
  await testBrandingRLS(data);
  await testCrossOrgIsolation(data);

  // Summary
  console.log("\n========================================");
  console.log("Summary");
  console.log("========================================\n");

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;

  console.log(`  Total: ${total}  Passed: ${passed}  Failed: ${failed}\n`);

  if (failed > 0) {
    console.log("  Failures:");
    for (const r of results.filter(r => !r.pass)) {
      console.log(`    - ${r.name}: ${r.detail}`);
    }
  }

  console.log(`\n  Verdict: ${failed === 0 ? "PHASE 1 SMOKE TEST PASSED" : "PHASE 1 SMOKE TEST DID NOT FULLY PASS"}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
