/**
 * Server-side British subject-based grade normalization baseline.
 *
 * Converts a validated RawBritishCurriculumProfile into a normalized
 * profile with numeric grade values per subject. Preserves subject
 * levels and raw grade labels.
 *
 * Does not classify subjects, count them, or evaluate eligibility.
 *
 * Server-side only — do not import from client components.
 */

import type { RawBritishCurriculumProfile } from "@/types/qualification-raw-profile";
import type {
  NormalizedBritishCurriculumProfile,
  NormalizedBritishSubjectRecord,
} from "@/types/normalized-british-profile";

// ---------------------------------------------------------------------------
// Grade normalization scale
// ---------------------------------------------------------------------------

const BRITISH_GRADE_SCALE: ReadonlyMap<string, number> = new Map([
  ["A*", 8],
  ["A", 7],
  ["B", 6],
  ["C", 5],
  ["D", 4],
  ["E", 3],
  ["F", 2],
  ["G", 1],
  ["U", 0],
]);

/**
 * Normalize a British grade label to its numeric value.
 * Trims whitespace and normalizes case before lookup.
 * Throws on unsupported grade labels.
 */
function normalizeGrade(grade: string, subjectIndex: number): number {
  const normalized = grade.trim().toUpperCase();

  const value = BRITISH_GRADE_SCALE.get(normalized);
  if (value === undefined) {
    throw new Error(
      `Unsupported British grade label "${grade}" for subjects[${subjectIndex}]. ` +
      `Supported grades: ${[...BRITISH_GRADE_SCALE.keys()].join(", ")}`
    );
  }

  return value;
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

/**
 * Normalize a validated raw British curriculum profile.
 * Adds numeric grade values per subject. Preserves all raw data.
 * Pure sync function — no DB access.
 */
export function normalizeBritishSubjectBasedRawProfile(
  rawProfile: RawBritishCurriculumProfile
): NormalizedBritishCurriculumProfile {
  const subjects: NormalizedBritishSubjectRecord[] = rawProfile.subjects.map(
    (s, i) => ({
      subjectName: s.subjectName,
      subjectLevel: s.subjectLevel,
      grade: s.grade,
      normalizedGradeValue: normalizeGrade(s.grade, i),
      notesAr: s.notesAr,
    })
  );

  return {
    qualificationFamily: "british_curriculum",
    countryId: rawProfile.countryId,
    notesAr: rawProfile.notesAr,
    header: {
      curriculumLabel: rawProfile.header.curriculumLabel,
      graduationYear: rawProfile.header.graduationYear,
      notesAr: rawProfile.header.notesAr,
    },
    subjects,
  };
}
