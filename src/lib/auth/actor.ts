/**
 * Server-side active actor profile resolution.
 *
 * Resolves the current authenticated user into an active application actor
 * using only the user_profiles table.
 *
 * Current-session scoped: reads rely on RLS (user_profiles_select_own policy),
 * so only the authenticated user's own profile row is visible.
 */

import { createClient } from "@/lib/supabase/server";
import { getAppSession, requireAppSession } from "@/lib/auth/session";
import type { ActorProfile, AppActor } from "@/types/auth";
import type { DbUserProfile } from "@/types/database";

/**
 * Look up the active actor profile for a user id.
 * Returns null if:
 * - no authenticated session exists
 * - userId does not match the current authenticated user
 * - no profile row exists
 * - profile is inactive
 */
export async function getActiveActorProfileByUserId(
  userId: string
): Promise<ActorProfile | null> {
  const supabase = await createClient();

  // Verify current authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || authUser.id !== userId) {
    return null;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, full_name, email_normalized, is_active")
    .eq("id", userId)
    .single<Pick<DbUserProfile, "id" | "full_name" | "email_normalized" | "is_active">>();

  if (!profile || !profile.is_active) {
    return null;
  }

  return {
    id: profile.id,
    fullName: profile.full_name,
    emailNormalized: profile.email_normalized,
    isActive: profile.is_active,
  };
}

/**
 * Require an active actor profile for a user id, or throw.
 */
export async function requireActiveActorProfileByUserId(
  userId: string
): Promise<ActorProfile> {
  const profile = await getActiveActorProfileByUserId(userId);
  if (!profile) {
    throw new Error("Active user profile not found");
  }
  return profile;
}

/**
 * Get the current app actor (session + active profile).
 * Returns null if not authenticated or if the profile is missing/inactive.
 */
export async function getCurrentAppActor(): Promise<AppActor | null> {
  const session = await getAppSession();
  if (!session) {
    return null;
  }

  const profile = await getActiveActorProfileByUserId(session.user.id);
  if (!profile) {
    return null;
  }

  return { session, profile };
}

/**
 * Require the current app actor (session + active profile), or throw.
 */
export async function requireCurrentAppActor(): Promise<AppActor> {
  const session = await requireAppSession();
  const profile = await requireActiveActorProfileByUserId(session.user.id);
  return { session, profile };
}
