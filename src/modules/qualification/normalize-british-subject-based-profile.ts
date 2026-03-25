/**
 * Server-side British subject-based normalization with level handling.
 *
 * Converts a validated RawBritishCurriculumProfile into a normalized
 * profile with numeric grade values, normalized grade keys, subject
 * level keys, and segment keys per subject.
 *
 * Does not classify subjects by name, count them, or evaluate eligibility.
 *
 * Server-side only — do not import from client components.
 */

import type { RawBritishCurriculumProfile } from "@/types/qualification-raw-profile";
import type {
  BritishSubjectSegmentKey,
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
 * Normalize a British grade label to its numeric value and normalized key.
 * Trims whitespace and normalizes case before lookup.
 * Throws on unsupported grade labels.
 */
function normalizeGrade(grade: string, subjectIndex: number): {
  normalizedGradeValue: number;
  gradeNormalizedKey: string;
} {
  const normalized = grade.trim().toUpperCase();

  const value = BRITISH_GRADE_SCALE.get(normalized);
  if (value === undefined) {
    throw new Error(
      `Unsupported British grade label "${grade}" for subjects[${subjectIndex}]. ` +
      `Supported grades: ${[...BRITISH_GRADE_SCALE.keys()].join(", ")}`
    );
  }

  return {
    normalizedGradeValue: value,
    gradeNormalizedKey: normalized,
  };
}

// ---------------------------------------------------------------------------
// Level handling
// ---------------------------------------------------------------------------

interface LevelResult {
  subjectLevelKey: string;
  segmentKey: BritishSubjectSegmentKey;
}

const KNOWN_LEVEL_MAP: ReadonlyMap<string, LevelResult> = new Map([
  ["a level", { subjectLevelKey: "a_level", segmentKey: "a_level" }],
  ["as level", { subjectLevelKey: "as_level", segmentKey: "as_level" }],
  ["o level", { subjectLevelKey: "o_level", segmentKey: "o_level" }],
  ["igcse", { subjectLevelKey: "igcse", segmentKey: "o_level" }],
  ["gcse", { subjectLevelKey: "gcse", segmentKey: "o_level" }],
]);

/**
 * Normalize a submitted subject level into subjectLevelKey and segmentKey.
 * Recognized labels are mapped explicitly. Unknown labels get segmentKey "other"
 * and a sanitized subjectLevelKey (trimmed, lowercased, spaces to underscores).
 */
function normalizeLevel(subjectLevel: string): LevelResult {
  const trimmed = subjectLevel.trim();
  const lookup = trimmed.toLowerCase();

  const known = KNOWN_LEVEL_MAP.get(lookup);
  if (known) {
    return known;
  }

  return {
    subjectLevelKey: lookup.replace(/\s+/g, "_"),
    segmentKey: "other",
  };
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

/**
 * Normalize a validated raw British curriculum profile.
 * Adds numeric grade values, normalized grade keys, subject level keys,
 * and segment keys per subject. Preserves all raw data.
 * Pure sync function — no DB access.
 */
export function normalizeBritishSubjectBasedRawProfile(
  rawProfile: RawBritishCurriculumProfile
): NormalizedBritishCurriculumProfile {
  const subjects: NormalizedBritishSubjectRecord[] = rawProfile.subjects.map(
    (s, i) => {
      const gradeResult = normalizeGrade(s.grade, i);
      const levelResult = normalizeLevel(s.subjectLevel);

      return {
        subjectName: s.subjectName,
        subjectLevel: s.subjectLevel,
        segmentKey: levelResult.segmentKey,
        subjectLevelKey: levelResult.subjectLevelKey,
        grade: s.grade,
        gradeNormalizedKey: gradeResult.gradeNormalizedKey,
        normalizedGradeValue: gradeResult.normalizedGradeValue,
        notesAr: s.notesAr,
      };
    }
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
