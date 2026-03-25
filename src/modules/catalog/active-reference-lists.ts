/**
 * Server-side active catalog reference lists service.
 *
 * Returns the active entries from global reference tables:
 * countries, university_types, degrees.
 *
 * These tables are not org-scoped and do not have RLS enabled —
 * they are shared platform reference data readable by any authenticated
 * user with workspace run access.
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentWorkspaceRunAccess,
  requireCurrentWorkspaceRunAccess,
} from "@/lib/organizations/current-workspace-run-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRole } from "@/types/enums";
import type {
  ActiveCatalogReferenceLists,
  CatalogCountryOption,
  CatalogUniversityTypeOption,
  CatalogDegreeOption,
} from "@/types/catalog-reference-lists";

/** Internal: query all 3 reference tables, throw on any query failure. */
async function fetchActiveReferenceLists(supabase: SupabaseClient): Promise<{
  countries: CatalogCountryOption[];
  universityTypes: CatalogUniversityTypeOption[];
  degrees: CatalogDegreeOption[];
}> {
  const [countriesResult, universityTypesResult, degreesResult] = await Promise.all([
    supabase
      .from("countries")
      .select("id, code, name_ar")
      .eq("is_active", true)
      .order("name_ar", { ascending: true }),
    supabase
      .from("university_types")
      .select("id, key, name_ar")
      .eq("is_active", true)
      .order("name_ar", { ascending: true }),
    supabase
      .from("degrees")
      .select("id, key, name_ar, level_rank")
      .eq("is_active", true)
      .order("level_rank", { ascending: true })
      .order("name_ar", { ascending: true }),
  ]);

  if (countriesResult.error) {
    throw new Error(`Failed to load countries: ${countriesResult.error.message}`);
  }
  if (universityTypesResult.error) {
    throw new Error(`Failed to load university types: ${universityTypesResult.error.message}`);
  }
  if (degreesResult.error) {
    throw new Error(`Failed to load degrees: ${degreesResult.error.message}`);
  }

  const countries: CatalogCountryOption[] = countriesResult.data.map((r) => ({
    id: r.id,
    code: r.code,
    nameAr: r.name_ar,
  }));

  const universityTypes: CatalogUniversityTypeOption[] = universityTypesResult.data.map((r) => ({
    id: r.id,
    key: r.key,
    nameAr: r.name_ar,
  }));

  const degrees: CatalogDegreeOption[] = degreesResult.data.map((r) => ({
    id: r.id,
    key: r.key,
    nameAr: r.name_ar,
    levelRank: r.level_rank,
  }));

  return { countries, universityTypes, degrees };
}

/**
 * Get active catalog reference lists for the current workspace.
 * Returns null if no workspace run access is available.
 * Throws on query failure — never silently returns empty lists.
 */
export async function getActiveCatalogReferenceLists(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<ActiveCatalogReferenceLists | null> {
  const runAccess = await getCurrentWorkspaceRunAccess(params);

  if (!runAccess) {
    return null;
  }

  const supabase = await createClient();
  const lists = await fetchActiveReferenceLists(supabase);

  return {
    workspace: runAccess.workspace,
    ...lists,
  };
}

/**
 * Require active catalog reference lists for the current workspace, or throw.
 */
export async function requireActiveCatalogReferenceLists(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<ActiveCatalogReferenceLists> {
  const runAccess = await requireCurrentWorkspaceRunAccess(params);

  const supabase = await createClient();
  const lists = await fetchActiveReferenceLists(supabase);

  return {
    workspace: runAccess.workspace,
    ...lists,
  };
}
