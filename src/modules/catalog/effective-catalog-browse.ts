/**
 * Server-side effective activated catalog browse service.
 *
 * Returns the current organization's effective activated catalog by:
 * 1. Starting from active overlay rows (organization_offering_settings)
 * 2. Loading matching active readable program_offerings
 * 3. Deriving programs and universities from the effective offering chain
 * 4. Applying organization overlay overrides for financial/note fields
 *
 * Readable base rows = platform-owned + organization-owned for the current org.
 * Universities and programs are derived from effective offerings only —
 * standalone rows outside the activated chain are excluded.
 *
 * Server-side only — do not import from client components.
 */

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentWorkspaceRunAccess,
  requireCurrentWorkspaceRunAccess,
} from "@/lib/organizations/current-workspace-run-access";
import type { MembershipRole } from "@/types/enums";
import type {
  EffectiveCatalogBrowse,
  EffectiveCatalogOffering,
  CatalogBrowseProgram,
  CatalogBrowseUniversity,
} from "@/types/catalog-effective-browse";
import type { CurrentWorkspaceCapabilities } from "@/types/workspace-capabilities";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Internal: build the effective browse from overlay-first logic
// ---------------------------------------------------------------------------

async function buildEffectiveBrowse(
  supabase: SupabaseClient,
  organizationId: string,
  workspace: CurrentWorkspaceCapabilities,
): Promise<EffectiveCatalogBrowse> {
  // Step 1: Load active overlay rows for this organization
  const overlayResult = await supabase
    .from("organization_offering_settings")
    .select(
      "program_offering_id, tuition_override_amount, application_fee_override_amount, extra_fee_note_override_ar, scholarship_note_override_ar"
    )
    .eq("organization_id", organizationId)
    .eq("visibility_status", "active");

  if (overlayResult.error) {
    throw new Error(
      `Failed to load organization offering settings: ${overlayResult.error.message}`
    );
  }

  const overlayRows = overlayResult.data;

  // No active overlays → empty catalog
  if (overlayRows.length === 0) {
    return { workspace, universities: [], programs: [], offerings: [] };
  }

  // Build overlay lookup by offering id
  const overlayByOfferingId = new Map(
    overlayRows.map((r) => [r.program_offering_id as string, r])
  );
  const activatedOfferingIds = [...overlayByOfferingId.keys()];

  // Step 2: Load active readable program_offerings for the activated ids
  // Readable = platform-owned OR organization-owned by current org
  const offeringsResult = await supabase
    .from("program_offerings")
    .select(
      "id, program_id, intake_label_ar, intake_term_key, intake_year, campus_name_ar, study_mode_key, duration_months, teaching_language_key, annual_tuition_amount, currency_code, application_fee_amount, extra_fee_note_ar, scholarship_note_ar, owner_scope, owner_organization_id"
    )
    .in("id", activatedOfferingIds)
    .eq("is_active", true);

  if (offeringsResult.error) {
    throw new Error(
      `Failed to load program offerings: ${offeringsResult.error.message}`
    );
  }

  // Filter to readable rows only (platform-owned or org-owned by current org)
  const readableOfferings = offeringsResult.data.filter(
    (r) =>
      (r.owner_scope === "platform" && r.owner_organization_id === null) ||
      (r.owner_scope === "organization" &&
        r.owner_organization_id === organizationId)
  );

  // Check for orphaned overlays pointing to non-readable/inactive offerings
  const loadedOfferingIds = new Set(readableOfferings.map((r) => r.id));
  for (const overlayOfferingId of activatedOfferingIds) {
    if (!loadedOfferingIds.has(overlayOfferingId)) {
      throw new Error(
        `Active overlay references offering ${overlayOfferingId} which is not an active readable offering`
      );
    }
  }

  if (readableOfferings.length === 0) {
    return { workspace, universities: [], programs: [], offerings: [] };
  }

  // Collect unique program ids from offerings
  const programIds = [...new Set(readableOfferings.map((r) => r.program_id as string))];

  // Step 3: Load active readable programs
  const programsResult = await supabase
    .from("programs")
    .select(
      "id, university_id, faculty_id, degree_id, program_code, title_ar, title_en, canonical_search_title_ar, owner_scope, owner_organization_id"
    )
    .in("id", programIds)
    .eq("is_active", true);

  if (programsResult.error) {
    throw new Error(`Failed to load programs: ${programsResult.error.message}`);
  }

  const readablePrograms = programsResult.data.filter(
    (r) =>
      (r.owner_scope === "platform" && r.owner_organization_id === null) ||
      (r.owner_scope === "organization" &&
        r.owner_organization_id === organizationId)
  );

  // Verify all programs from offerings are resolved
  const loadedProgramIds = new Set(readablePrograms.map((r) => r.id));
  for (const pid of programIds) {
    if (!loadedProgramIds.has(pid)) {
      throw new Error(
        `Active offering references program ${pid} which is not an active readable program`
      );
    }
  }

  // Collect unique university ids from programs
  const universityIds = [...new Set(readablePrograms.map((r) => r.university_id as string))];

  // Step 4: Load active readable universities
  const universitiesResult = await supabase
    .from("universities")
    .select(
      "id, country_id, university_type_id, name_ar, name_en, owner_scope, owner_organization_id"
    )
    .in("id", universityIds)
    .eq("is_active", true);

  if (universitiesResult.error) {
    throw new Error(
      `Failed to load universities: ${universitiesResult.error.message}`
    );
  }

  const readableUniversities = universitiesResult.data.filter(
    (r) =>
      (r.owner_scope === "platform" && r.owner_organization_id === null) ||
      (r.owner_scope === "organization" &&
        r.owner_organization_id === organizationId)
  );

  // Verify all universities from programs are resolved
  const loadedUniversityIds = new Set(readableUniversities.map((r) => r.id));
  for (const uid of universityIds) {
    if (!loadedUniversityIds.has(uid)) {
      throw new Error(
        `Active program references university ${uid} which is not an active readable university`
      );
    }
  }

  // Step 5: Map to output types with overlay overrides applied

  const universities: CatalogBrowseUniversity[] = readableUniversities
    .map((r) => ({
      id: r.id as string,
      countryId: r.country_id as string,
      universityTypeId: r.university_type_id as string,
      nameAr: r.name_ar as string,
      nameEn: (r.name_en as string | null) ?? null,
    }))
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr));

  const programs: CatalogBrowseProgram[] = readablePrograms
    .map((r) => ({
      id: r.id as string,
      universityId: r.university_id as string,
      facultyId: (r.faculty_id as string | null) ?? null,
      degreeId: r.degree_id as string,
      programCode: (r.program_code as string | null) ?? null,
      titleAr: r.title_ar as string,
      titleEn: (r.title_en as string | null) ?? null,
      canonicalSearchTitleAr: r.canonical_search_title_ar as string,
    }))
    .sort((a, b) => a.titleAr.localeCompare(b.titleAr));

  const offerings: EffectiveCatalogOffering[] = readableOfferings
    .map((r) => {
      const overlay = overlayByOfferingId.get(r.id as string)!;
      return {
        id: r.id as string,
        programId: r.program_id as string,
        intakeLabelAr: r.intake_label_ar as string,
        intakeTermKey: (r.intake_term_key as string | null) ?? null,
        intakeYear: (r.intake_year as number | null) ?? null,
        campusNameAr: (r.campus_name_ar as string | null) ?? null,
        studyModeKey: (r.study_mode_key as string | null) ?? null,
        durationMonths: (r.duration_months as number | null) ?? null,
        teachingLanguageKey: (r.teaching_language_key as string | null) ?? null,
        annualTuitionAmount:
          (overlay.tuition_override_amount as number | null) ??
          (r.annual_tuition_amount as number | null) ??
          null,
        currencyCode: r.currency_code as string,
        applicationFeeAmount:
          (overlay.application_fee_override_amount as number | null) ??
          (r.application_fee_amount as number | null) ??
          null,
        extraFeeNoteAr:
          (overlay.extra_fee_note_override_ar as string | null) ??
          (r.extra_fee_note_ar as string | null) ??
          null,
        scholarshipNoteAr:
          (overlay.scholarship_note_override_ar as string | null) ??
          (r.scholarship_note_ar as string | null) ??
          null,
      };
    })
    .sort((a, b) => {
      if (a.programId !== b.programId) return a.programId.localeCompare(b.programId);
      if ((a.intakeYear ?? 0) !== (b.intakeYear ?? 0))
        return (a.intakeYear ?? 0) - (b.intakeYear ?? 0);
      return a.intakeLabelAr.localeCompare(b.intakeLabelAr);
    });

  return { workspace, universities, programs, offerings };
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Get the effective activated catalog browse for the current workspace.
 * Returns null if no workspace run access is available.
 * Throws on query failure or data integrity errors.
 */
export async function getEffectiveCatalogBrowse(
  params?: {
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<EffectiveCatalogBrowse | null> {
  const runAccess = await getCurrentWorkspaceRunAccess(params);

  if (!runAccess) {
    return null;
  }

  const organizationId =
    runAccess.workspace.workspace.orgContext.organizationId;
  const supabase = await createClient();

  return buildEffectiveBrowse(supabase, organizationId, runAccess.workspace);
}

/**
 * Require the effective activated catalog browse for the current workspace, or throw.
 */
export async function requireEffectiveCatalogBrowse(
  params?: {
    organizationId?: string | null;
    allowedRoles?: readonly MembershipRole[];
  }
): Promise<EffectiveCatalogBrowse> {
  const runAccess = await requireCurrentWorkspaceRunAccess(params);

  const organizationId =
    runAccess.workspace.workspace.orgContext.organizationId;
  const supabase = await createClient();

  return buildEffectiveBrowse(supabase, organizationId, runAccess.workspace);
}
