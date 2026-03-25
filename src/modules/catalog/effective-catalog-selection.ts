/**
 * Server-side Direct Evaluation catalog selection service.
 *
 * Provides stepwise filtered selection options for:
 * country → universityType → university → degree → program → offering
 *
 * Derives all data from the existing effective activated catalog browse
 * and active reference lists services. Does not reimplement overlay/ownership logic.
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
import type {
  EffectiveCatalogSelectionOptions,
  CatalogSelectionUniversityOption,
  CatalogSelectionProgramOption,
  CatalogSelectionOfferingOption,
} from "@/types/catalog-selection-options";
import type {
  CatalogCountryOption,
  CatalogUniversityTypeOption,
  CatalogDegreeOption,
} from "@/types/catalog-reference-lists";
import type {
  CatalogBrowseUniversity,
  CatalogBrowseProgram,
  EffectiveCatalogOffering,
} from "@/types/catalog-effective-browse";
import type { CurrentWorkspaceCapabilities } from "@/types/workspace-capabilities";

// ---------------------------------------------------------------------------
// Filter params
// ---------------------------------------------------------------------------

interface SelectionFilterParams {
  countryId?: string | null;
  universityTypeId?: string | null;
  universityId?: string | null;
  degreeId?: string | null;
  programId?: string | null;
}

// ---------------------------------------------------------------------------
// Hierarchy validation
// ---------------------------------------------------------------------------

function validateHierarchyParams(p: SelectionFilterParams): void {
  if (p.universityTypeId && !p.countryId) {
    throw new Error("universityTypeId requires countryId");
  }
  if (p.universityId && (!p.countryId || !p.universityTypeId)) {
    throw new Error("universityId requires countryId and universityTypeId");
  }
  if (p.degreeId && (!p.countryId || !p.universityTypeId || !p.universityId)) {
    throw new Error("degreeId requires countryId, universityTypeId, and universityId");
  }
  if (
    p.programId &&
    (!p.countryId || !p.universityTypeId || !p.universityId || !p.degreeId)
  ) {
    throw new Error(
      "programId requires countryId, universityTypeId, universityId, and degreeId"
    );
  }
}

// ---------------------------------------------------------------------------
// Internal: build selection options from browse + reference data
// ---------------------------------------------------------------------------

function buildSelectionOptions(
  workspace: CurrentWorkspaceCapabilities,
  allUniversities: readonly CatalogBrowseUniversity[],
  allPrograms: readonly CatalogBrowseProgram[],
  allOfferings: readonly EffectiveCatalogOffering[],
  allCountries: readonly CatalogCountryOption[],
  allUniversityTypes: readonly CatalogUniversityTypeOption[],
  allDegrees: readonly CatalogDegreeOption[],
  filters: SelectionFilterParams,
): EffectiveCatalogSelectionOptions {
  // Build lookup maps
  const universityById = new Map(allUniversities.map((u) => [u.id, u]));
  const programById = new Map(allPrograms.map((p) => [p.id, p]));

  // --- Step 1: Derive reachable offerings → programs → universities from browse ---

  // All offerings link to programs, programs link to universities
  // We filter progressively through the chain

  // Determine reachable universities by filter prefix
  // outputUniversities = country + universityType only (for the returned list)
  // downstreamUniversities = country + universityType + universityId (for downstream derivation)
  let outputUniversities = [...allUniversities];

  if (filters.countryId) {
    outputUniversities = outputUniversities.filter(
      (u) => u.countryId === filters.countryId
    );
  }
  if (filters.universityTypeId) {
    outputUniversities = outputUniversities.filter(
      (u) => u.universityTypeId === filters.universityTypeId
    );
  }

  let downstreamUniversities = outputUniversities;
  if (filters.universityId) {
    downstreamUniversities = downstreamUniversities.filter(
      (u) => u.id === filters.universityId
    );
  }

  const filteredUniversityIds = new Set(downstreamUniversities.map((u) => u.id));

  // Programs reachable under filtered universities
  // outputPrograms = country + universityType + university + degree (for the returned list)
  // downstreamPrograms = also filtered by programId (for downstream offering derivation)
  let outputPrograms = allPrograms.filter((p) =>
    filteredUniversityIds.has(p.universityId)
  );

  if (filters.degreeId) {
    outputPrograms = outputPrograms.filter(
      (p) => p.degreeId === filters.degreeId
    );
  }

  let downstreamPrograms = outputPrograms;
  if (filters.programId) {
    downstreamPrograms = downstreamPrograms.filter(
      (p) => p.id === filters.programId
    );
  }

  const filteredProgramIds = new Set(downstreamPrograms.map((p) => p.id));

  // Offerings reachable under filtered programs
  const filteredOfferings = allOfferings.filter((o) =>
    filteredProgramIds.has(o.programId)
  );

  // --- Step 2: Derive distinct option sets from reachable chain ---

  // Countries: distinct from universities reachable in effective catalog (pre-country-filter)
  // When no filter is applied, show all countries that have effective offerings
  const effectiveUniversityIds = new Set(
    allOfferings.map((o) => {
      const prog = programById.get(o.programId);
      return prog?.universityId;
    })
  );
  const countriesFromEffective = new Set(
    allUniversities
      .filter((u) => effectiveUniversityIds.has(u.id))
      .map((u) => u.countryId)
  );

  // If countryId is filtered, derive universityTypes from universities in that country
  // that still have effective offerings
  const uniIdsWithOfferings = new Set<string>();
  for (const o of allOfferings) {
    const prog = programById.get(o.programId);
    if (prog) uniIdsWithOfferings.add(prog.universityId);
  }

  // Universities that actually have offerings
  const universityTypesFromEffective = new Set(
    allUniversities
      .filter(
        (u) =>
          uniIdsWithOfferings.has(u.id) &&
          (!filters.countryId || u.countryId === filters.countryId)
      )
      .map((u) => u.universityTypeId)
  );

  // Degrees: derived from programs under filtered universities that have offerings
  const programIdsWithOfferings = new Set(allOfferings.map((o) => o.programId));
  const degreesFromEffective = new Set(
    allPrograms
      .filter(
        (p) =>
          programIdsWithOfferings.has(p.id) && filteredUniversityIds.has(p.universityId)
      )
      .map((p) => p.degreeId)
  );

  // --- Step 3: Map to output types ---

  const countries: CatalogCountryOption[] = allCountries
    .filter((c) => countriesFromEffective.has(c.id))
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr));

  const universityTypes: CatalogUniversityTypeOption[] = allUniversityTypes
    .filter((ut) => universityTypesFromEffective.has(ut.id))
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr));

  // Universities: options reachable after country + universityType only
  const universities: CatalogSelectionUniversityOption[] = outputUniversities
    .filter((u) => uniIdsWithOfferings.has(u.id))
    .map((u) => ({
      id: u.id,
      nameAr: u.nameAr,
      nameEn: u.nameEn,
    }))
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr));

  const degrees: CatalogDegreeOption[] = allDegrees
    .filter((d) => degreesFromEffective.has(d.id))
    .sort((a, b) => {
      if (a.levelRank !== b.levelRank) return a.levelRank - b.levelRank;
      return a.nameAr.localeCompare(b.nameAr);
    });

  // Programs: options reachable after country + universityType + university + degree only
  const programs: CatalogSelectionProgramOption[] = outputPrograms
    .filter((p) => programIdsWithOfferings.has(p.id))
    .map((p) => ({
      id: p.id,
      programCode: p.programCode,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
    }))
    .sort((a, b) => a.titleAr.localeCompare(b.titleAr));

  // Deduplicate programs by id
  const seenProgramIds = new Set<string>();
  const dedupedPrograms = programs.filter((p) => {
    if (seenProgramIds.has(p.id)) return false;
    seenProgramIds.add(p.id);
    return true;
  });

  // Sort on richer internal data (has programId) before mapping to public shape
  const sortedOfferings = [...filteredOfferings].sort((a, b) => {
    if (a.programId < b.programId) return -1;
    if (a.programId > b.programId) return 1;
    if ((a.intakeYear ?? 0) !== (b.intakeYear ?? 0))
      return (a.intakeYear ?? 0) - (b.intakeYear ?? 0);
    return a.intakeLabelAr.localeCompare(b.intakeLabelAr);
  });

  const offerings: CatalogSelectionOfferingOption[] = sortedOfferings.map((o) => ({
    id: o.id,
    intakeLabelAr: o.intakeLabelAr,
    intakeTermKey: o.intakeTermKey,
    intakeYear: o.intakeYear,
    campusNameAr: o.campusNameAr,
    studyModeKey: o.studyModeKey,
    durationMonths: o.durationMonths,
    teachingLanguageKey: o.teachingLanguageKey,
    annualTuitionAmount: o.annualTuitionAmount,
    currencyCode: o.currencyCode,
    applicationFeeAmount: o.applicationFeeAmount,
    extraFeeNoteAr: o.extraFeeNoteAr,
    scholarshipNoteAr: o.scholarshipNoteAr,
  }));

  return {
    workspace,
    countries,
    universityTypes,
    universities,
    degrees,
    programs: dedupedPrograms,
    offerings,
  };
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Get effective catalog selection options for Direct Evaluation.
 * Returns null if no workspace run access is available.
 * Throws on query failure, data integrity errors, or invalid hierarchy params.
 */
export async function getEffectiveCatalogSelectionOptions(
  params?: {
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
    countryId?: string | null;
    universityTypeId?: string | null;
    universityId?: string | null;
    degreeId?: string | null;
    programId?: string | null;
  }
): Promise<EffectiveCatalogSelectionOptions | null> {
  const filters: SelectionFilterParams = {
    countryId: params?.countryId,
    universityTypeId: params?.universityTypeId,
    universityId: params?.universityId,
    degreeId: params?.degreeId,
    programId: params?.programId,
  };

  validateHierarchyParams(filters);

  const accessParams = {
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  };

  const [browse, refLists] = await Promise.all([
    getEffectiveCatalogBrowse(accessParams),
    getActiveCatalogReferenceLists(accessParams),
  ]);

  if (!browse || !refLists) {
    return null;
  }

  return buildSelectionOptions(
    browse.workspace,
    browse.universities,
    browse.programs,
    browse.offerings,
    refLists.countries,
    refLists.universityTypes,
    refLists.degrees,
    filters,
  );
}

/**
 * Require effective catalog selection options for Direct Evaluation, or throw.
 */
export async function requireEffectiveCatalogSelectionOptions(
  params?: {
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
    countryId?: string | null;
    universityTypeId?: string | null;
    universityId?: string | null;
    degreeId?: string | null;
    programId?: string | null;
  }
): Promise<EffectiveCatalogSelectionOptions> {
  const filters: SelectionFilterParams = {
    countryId: params?.countryId,
    universityTypeId: params?.universityTypeId,
    universityId: params?.universityId,
    degreeId: params?.degreeId,
    programId: params?.programId,
  };

  validateHierarchyParams(filters);

  const accessParams = {
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  };

  const [browse, refLists] = await Promise.all([
    requireEffectiveCatalogBrowse(accessParams),
    requireActiveCatalogReferenceLists(accessParams),
  ]);

  return buildSelectionOptions(
    browse.workspace,
    browse.universities,
    browse.programs,
    browse.offerings,
    refLists.countries,
    refLists.universityTypes,
    refLists.degrees,
    filters,
  );
}
