import { createClient } from "@/lib/supabase/server";
import type { AppSession, SessionUser } from "@/types/auth";

/**
 * Get the current authenticated session from the server-side Supabase client.
 * Returns null if no authenticated user exists.
 *
 * Does NOT load org memberships — use org-context.ts for that.
 * Does NOT create or sync user_profiles rows.
 */
export async function getAppSession(): Promise<AppSession | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id || !authUser.email) {
    return null;
  }

  const sessionUser: SessionUser = {
    id: authUser.id,
    email: authUser.email,
  };

  return { user: sessionUser };
}

/**
 * Get the current authenticated session or throw.
 * Use in server code paths that require authentication.
 */
export async function requireAppSession(): Promise<AppSession> {
  const session = await getAppSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
}
