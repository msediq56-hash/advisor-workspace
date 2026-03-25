/**
 * Server-side effective target offering context resolver.
 *
 * Takes one offering id and resolves its full catalog chain:
 * offering → program → university → country + universityType + degree
 *
 * Composes existing effective catalog browse and reference lists services.
 * Does not re-query raw catalog tables or rebuild overlay logic.
 *
 * Server-side only — do not import from client components.
 */

import {
  getEffectiveCatalogBrowse,
  requireEffectiveCatalogBrowse,
} from "@/modules/catalog/effective-catalog-browse";
import {
  getActiveCatalogReferenceLists,
  requireActiveCatalogReferenceLists,
} from "@/modules/catalog/active-reference-lists";
import type { MembershipRole } from "@/types/enums";
import type { EffectiveTargetOfferingContext } from "@/types/catalog-target-context";
import type { EffectiveCatalogBrowse } from "@/types/catalog-effective-browse";
import type { ActiveCatalogReferenceLists } from "@/types/catalog-reference-lists";

/**
 * Internal: resolve the full context chain for one offering within
 * already-loaded effective browse and reference list data.
 * Throws on any structural integrity failure.
 */
function resolveOfferingContext(
  offeringId: string,
  browse: EffectiveCatalogBrowse,
  refLists: ActiveCatalogReferenceLists,
): EffectiveTargetOfferingContext | null {
  // Find the offering in the effective catalog
  const offering = browse.offerings.find((o) => o.id === offeringId);
  if (!offering) {
    return null;
  }

  // Resolve program
  const program = browse.programs.find((p) => p.id === offering.programId);
  if (!program) {
    throw new Error(
      `Data integrity error: offering ${offeringId} references program ${offering.programId} which is not in the effective catalog`
    );
  }

  // Resolve university
  const university = browse.universities.find((u) => u.id === program.universityId);
  if (!university) {
    throw new Error(
      `Data integrity error: program ${program.id} references university ${program.universityId} which is not in the effective catalog`
    );
  }

  // Resolve country
  const country = refLists.countries.find((c) => c.id === university.countryId);
  if (!country) {
    throw new Error(
      `Data integrity error: university ${university.id} references country ${university.countryId} which is not in active reference lists`
    );
  }

  // Resolve university type
  const universityType = refLists.universityTypes.find((ut) => ut.id === university.universityTypeId);
  if (!universityType) {
    throw new Error(
      `Data integrity error: university ${university.id} references university type ${university.universityTypeId} which is not in active reference lists`
    );
  }

  // Resolve degree
  const degree = refLists.degrees.find((d) => d.id === program.degreeId);
  if (!degree) {
    throw new Error(
      `Data integrity error: program ${program.id} references degree ${program.degreeId} which is not in active reference lists`
    );
  }

  return {
    workspace: browse.workspace,
    country,
    universityType,
    university,
    degree,
    program,
    offering,
  };
}

/**
 * Get the effective target offering context for one offering.
 * Returns null if workspace access is missing or offering is not reachable.
 * Throws on data integrity failures.
 */
export async function getEffectiveTargetOfferingContext(
  params: {
    offeringId: string;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<EffectiveTargetOfferingContext | null> {
  const accessParams = {
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  };

  const [browse, refLists] = await Promise.all([
    getEffectiveCatalogBrowse(accessParams),
    getActiveCatalogReferenceLists(accessParams),
  ]);

  if (!browse || !refLists) {
    return null;
  }

  return resolveOfferingContext(params.offeringId, browse, refLists);
}

/**
 * Require the effective target offering context for one offering, or throw.
 */
export async function requireEffectiveTargetOfferingContext(
  params: {
    offeringId: string;
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<EffectiveTargetOfferingContext> {
  const accessParams = {
    organizationId: params.organizationId,
    allowedRoles: params.allowedRoles,
  };

  const [browse, refLists] = await Promise.all([
    requireEffectiveCatalogBrowse(accessParams),
    requireActiveCatalogReferenceLists(accessParams),
  ]);

  const context = resolveOfferingContext(params.offeringId, browse, refLists);
  if (!context) {
    throw new Error(
      `Offering ${params.offeringId} is not reachable in the current effective catalog`
    );
  }

  return context;
}
