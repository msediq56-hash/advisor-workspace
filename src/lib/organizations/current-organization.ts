/**
 * Server-side current organization summary helper.
 *
 * Resolves the current accessible organization for the authenticated
 * actor's resolved org context. Read-only, current-session scoped.
 *
 * Uses the RLS-aware server client — only organizations the current
 * user has an active membership in are visible.
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getOptionalActorAccess,
  requireActorAccess,
} from "@/lib/auth/actor-access";
import type { OrganizationSummary } from "@/types/organization";
import type { DbOrganization } from "@/types/database";

/**
 * Get the current accessible organization summary.
 * Returns null if:
 * - no authenticated actor
 * - no resolved org context
 * - no matching active organization row
 */
export async function getCurrentOrganizationSummary(
  params?: { organizationId?: string | null }
): Promise<OrganizationSummary | null> {
  const { orgContext } = await getOptionalActorAccess({
    organizationId: params?.organizationId,
  });

  if (!orgContext) {
    return null;
  }

  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name_ar, status")
    .eq("id", orgContext.organizationId)
    .single<Pick<DbOrganization, "id" | "slug" | "name_ar" | "status">>();

  if (!org || org.status !== "active") {
    return null;
  }

  return {
    id: org.id,
    slug: org.slug,
    nameAr: org.name_ar,
    status: org.status,
  };
}

/**
 * Require the current accessible organization summary, or throw.
 */
export async function requireCurrentOrganizationSummary(
  params?: { organizationId?: string | null }
): Promise<OrganizationSummary> {
  const { orgContext } = await requireActorAccess({
    organizationId: params?.organizationId,
  });

  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name_ar, status")
    .eq("id", orgContext.organizationId)
    .single<Pick<DbOrganization, "id" | "slug" | "name_ar" | "status">>();

  if (!org || org.status !== "active") {
    throw new Error("Active organization not found");
  }

  return {
    id: org.id,
    slug: org.slug,
    nameAr: org.name_ar,
    status: org.status,
  };
}
