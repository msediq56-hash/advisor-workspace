import { createClient } from "@/lib/supabase/server";
import type { AppSession, SessionUser } from "@/types/auth";
import type { DbUserProfile } from "@/types/database";

/**
 * Get the current authenticated session from the server-side Supabase client.
 * Returns null if not authenticated or if the user profile is missing/inactive.
 *
 * Does NOT create or sync user_profiles rows — that will be handled
 * by a dedicated auth callback in a later task.
 */
export async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id || !authUser.email) {
    return null;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, full_name, email_normalized, is_active")
    .eq("id", authUser.id)
    .single<Pick<DbUserProfile, "id" | "full_name" | "email_normalized" | "is_active">>();

  if (!profile || !profile.is_active) {
    return null;
  }

  const sessionUser: SessionUser = {
    id: profile.id,
    email: profile.email_normalized,
    fullName: profile.full_name,
    isActive: profile.is_active,
  };

  return { user: sessionUser };
}
