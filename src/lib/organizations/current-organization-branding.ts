/**
 * Server-side current organization branding summary helper.
 *
 * Resolves the current accessible organization branding for the
 * authenticated actor's resolved org context. Read-only, current-session scoped.
 *
 * Uses the RLS-aware server client. Note: organization_branding does not
 * have its own RLS policy yet — it is accessible via the server client
 * but scoped here by the resolved org context.
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getOptionalActorAccess,
  requireActorAccess,
} from "@/lib/auth/actor-access";
import type { OrganizationBrandingSummary } from "@/types/organization-branding";

/**
 * Get the current accessible organization branding summary.
 * Returns null if:
 * - no authenticated actor
 * - no resolved org context
 * - no branding row for the current organization
 */
export async function getCurrentOrganizationBrandingSummary(
  params?: { organizationId?: string | null }
): Promise<OrganizationBrandingSummary | null> {
  const { orgContext } = await getOptionalActorAccess({
    organizationId: params?.organizationId,
  });

  if (!orgContext) {
    return null;
  }

  const supabase = await createClient();

  const { data: branding } = await supabase
    .from("organization_branding")
    .select("organization_id, display_name_ar, logo_url, primary_color, secondary_color")
    .eq("organization_id", orgContext.organizationId)
    .single<{
      organization_id: string;
      display_name_ar: string;
      logo_url: string | null;
      primary_color: string | null;
      secondary_color: string | null;
    }>();

  if (!branding) {
    return null;
  }

  return {
    organizationId: branding.organization_id,
    displayNameAr: branding.display_name_ar,
    logoUrl: branding.logo_url,
    primaryColor: branding.primary_color,
    secondaryColor: branding.secondary_color,
  };
}

/**
 * Require the current accessible organization branding summary, or throw.
 */
export async function requireCurrentOrganizationBrandingSummary(
  params?: { organizationId?: string | null }
): Promise<OrganizationBrandingSummary> {
  const { orgContext } = await requireActorAccess({
    organizationId: params?.organizationId,
  });

  const supabase = await createClient();

  const { data: branding } = await supabase
    .from("organization_branding")
    .select("organization_id, display_name_ar, logo_url, primary_color, secondary_color")
    .eq("organization_id", orgContext.organizationId)
    .single<{
      organization_id: string;
      display_name_ar: string;
      logo_url: string | null;
      primary_color: string | null;
      secondary_color: string | null;
    }>();

  if (!branding) {
    throw new Error("Organization branding not found");
  }

  return {
    organizationId: branding.organization_id,
    displayNameAr: branding.display_name_ar,
    logoUrl: branding.logo_url,
    primaryColor: branding.primary_color,
    secondaryColor: branding.secondary_color,
  };
}
