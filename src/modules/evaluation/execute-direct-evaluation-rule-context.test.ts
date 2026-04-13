/**
 * Direct-evaluation execution engine integration test baseline.
 *
 * Tests the executor's rule dispatch, group outcome derivation,
 * British/non-British narrowing, and unsupported rule-type handling.
 *
 * Mocks only: evaluateMinimumSubjectCountRule, evaluateRequiredSubjectExistsRule, evaluateMinimumSubjectGradeRule.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./evaluate-minimum-subject-count-rule", () => ({
  evaluateMinimumSubjectCountRule: vi.fn(),
}));

vi.mock("./evaluate-required-subject-exists-rule", () => ({
  evaluateRequiredSubjectExistsRule: vi.fn(),
}));

vi.mock("./evaluate-minimum-subject-grade-rule", () => ({
  evaluateMinimumSubjectGradeRule: vi.fn(),
}));

import { executeDirectEvaluationRuleContext } from "./execute-direct-evaluation-rule-context";
import { evaluateMinimumSubjectCountRule } from "./evaluate-minimum-subject-count-rule";
import { evaluateRequiredSubjectExistsRule } from "./evaluate-required-subject-exists-rule";
import { evaluateMinimumSubjectGradeRule } from "./evaluate-minimum-subject-grade-rule";

const mockEvalRule = vi.mocked(evaluateMinimumSubjectCountRule);
const mockEvalRequiredSubject = vi.mocked(evaluateRequiredSubjectExistsRule);
const mockEvalMinGrade = vi.mocked(evaluateMinimumSubjectGradeRule);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBritishPrepared() {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: {
      qualificationFamily: "british_curriculum" as const,
      countryId: "c-1",
      notesAr: null,
      header: { curriculumLabel: "A Level", graduationYear: 2024, notesAr: null },
      subjects: [],
    },
  };
}

function makeSimpleFormPrepared() {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: {
      qualificationFamily: "arabic_secondary" as const,
      countryId: "c-1",
      certificateName: "ثانوية",
      finalAverage: 90,
      gradingScale: "100",
      graduationYear: 2024,
      notesAr: null,
    },
  };
}

function makeResolvedContext(groups: Array<{
  ruleGroupId: string;
  groupKey?: string;
  groupSeverity: string;
  groupEvaluationMode: string;
  orderIndex: number;
  rules: Array<{
    ruleId: string;
    ruleTypeKey: string;
    ruleConfig: unknown;
    orderIndex: number;
  }>;
}>) {
  return {
    workspace: {} as never,
    target: {} as never,
    qualificationDefinition: {} as never,
    rawProfile: {} as never,
    normalizedProfile: {} as never,
    status: "supported" as const,
    resolvedRuleSet: { ruleSetId: "rs-1", ruleSetVersionId: "rsv-1", targetScope: "offering", qualificationTypeId: "qt-1" },
    ruleGroups: groups.map((g) => ({ groupKey: "test-group", ...g })),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeDirectEvaluationRuleContext", () => {
  beforeEach(() => {
    mockEvalRule.mockReset();
    mockEvalRequiredSubject.mockReset();
    mockEvalMinGrade.mockReset();
  });

  // -----------------------------------------------------------------------
  // Supported: minimum_subject_count with British input
  // -----------------------------------------------------------------------

  it("evaluates minimum_subject_count as passed for British input", () => {
    mockEvalRule.mockReturnValue({
      outcome: "passed",
      matchedCount: 5,
      requiredCount: 3,
      matchedSubjects: [],
    });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(mockEvalRule).toHaveBeenCalledOnce();
    expect(result.groupExecutions).toHaveLength(1);
    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("passed");
    expect(result.groupExecutions[0].ruleExecutions[0].matchedCount).toBe(5);
    expect(result.groupExecutions[0].ruleExecutions[0].requiredCount).toBe(3);
    expect(result.groupExecutions[0].groupOutcome).toBe("passed");
  });

  it("evaluates minimum_subject_count as failed for British input", () => {
    mockEvalRule.mockReturnValue({
      outcome: "failed",
      matchedCount: 1,
      requiredCount: 3,
      matchedSubjects: [],
    });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("failed");
    expect(result.groupExecutions[0].ruleExecutions[0].matchedCount).toBe(1);
    expect(result.groupExecutions[0].ruleExecutions[0].requiredCount).toBe(3);
    expect(result.groupExecutions[0].groupOutcome).toBe("failed");
  });

  // -----------------------------------------------------------------------
  // minimum_subject_count skipped for non-British input
  // -----------------------------------------------------------------------

  it("skips minimum_subject_count for simple-form input", () => {
    const result = executeDirectEvaluationRuleContext({
      prepared: makeSimpleFormPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(mockEvalRule).not.toHaveBeenCalled();
    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("skipped");
    expect(result.groupExecutions[0].groupOutcome).toBe("skipped");
  });

  // -----------------------------------------------------------------------
  // Unsupported rule type
  // -----------------------------------------------------------------------

  it("skips unsupported rule types", () => {
    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "unknown_rule_type", ruleConfig: {}, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(mockEvalRule).not.toHaveBeenCalled();
    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("skipped");
    expect(result.groupExecutions[0].ruleExecutions[0].ruleTypeKey).toBe("unknown_rule_type");
    expect(result.groupExecutions[0].groupOutcome).toBe("skipped");
  });

  // -----------------------------------------------------------------------
  // Group outcome derivation
  // -----------------------------------------------------------------------

  it("derives group outcome as failed when any rule fails", () => {
    mockEvalRule
      .mockReturnValueOnce({ outcome: "passed", matchedCount: 5, requiredCount: 3, matchedSubjects: [] })
      .mockReturnValueOnce({ outcome: "failed", matchedCount: 1, requiredCount: 3, matchedSubjects: [] });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
            { ruleId: "r-2", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 1 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].groupOutcome).toBe("failed");
  });

  it("derives group outcome as passed when all rules pass", () => {
    mockEvalRule.mockReturnValue({ outcome: "passed", matchedCount: 5, requiredCount: 3, matchedSubjects: [] });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].groupOutcome).toBe("passed");
  });

  it("derives group outcome as skipped when all rules are skipped", () => {
    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "unknown_type", ruleConfig: {}, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].groupOutcome).toBe("skipped");
  });

  // -----------------------------------------------------------------------
  // any_of group outcome derivation
  // -----------------------------------------------------------------------

  it("any_of group passes when one rule passes and another fails", () => {
    mockEvalRule
      .mockReturnValueOnce({ outcome: "passed", matchedCount: 5, requiredCount: 3, matchedSubjects: [] })
      .mockReturnValueOnce({ outcome: "failed", matchedCount: 1, requiredCount: 3, matchedSubjects: [] });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "any_of",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
            { ruleId: "r-2", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 1 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].groupOutcome).toBe("passed");
  });

  it("any_of group fails when all effective rule executions fail", () => {
    mockEvalRule
      .mockReturnValueOnce({ outcome: "failed", matchedCount: 1, requiredCount: 3, matchedSubjects: [] })
      .mockReturnValueOnce({ outcome: "failed", matchedCount: 0, requiredCount: 3, matchedSubjects: [] });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "any_of",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
            { ruleId: "r-2", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 1 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].groupOutcome).toBe("failed");
  });

  it("any_of group stays skipped when all rule executions are skipped", () => {
    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "any_of",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "unknown_type", ruleConfig: {}, orderIndex: 0 },
            { ruleId: "r-2", ruleTypeKey: "unknown_type", ruleConfig: {}, orderIndex: 1 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].groupOutcome).toBe("skipped");
  });

  it("any_of group passes when one rule passes and the rest are skipped", () => {
    mockEvalRule.mockReturnValue({ outcome: "passed", matchedCount: 5, requiredCount: 3, matchedSubjects: [] });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "any_of",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
            { ruleId: "r-2", ruleTypeKey: "unknown_type", ruleConfig: {}, orderIndex: 1 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].groupOutcome).toBe("passed");
  });

  // -----------------------------------------------------------------------
  // Empty / no-rules
  // -----------------------------------------------------------------------

  it("returns empty groupExecutions for zero rule groups", () => {
    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([]),
    });

    expect(result.groupExecutions).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Multiple groups
  // -----------------------------------------------------------------------

  it("processes multiple groups in order", () => {
    mockEvalRule.mockReturnValue({ outcome: "passed", matchedCount: 5, requiredCount: 3, matchedSubjects: [] });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
          ],
        },
        {
          ruleGroupId: "rg-2",
          groupSeverity: "advisory",
          groupEvaluationMode: "advisory_only",
          orderIndex: 1,
          rules: [
            { ruleId: "r-2", ruleTypeKey: "unsupported_type", ruleConfig: {}, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions).toHaveLength(2);
    expect(result.groupExecutions[0].ruleGroupId).toBe("rg-1");
    expect(result.groupExecutions[0].groupOutcome).toBe("passed");
    expect(result.groupExecutions[1].ruleGroupId).toBe("rg-2");
    expect(result.groupExecutions[1].groupOutcome).toBe("skipped");
  });

  // -----------------------------------------------------------------------
  // Output structure
  // -----------------------------------------------------------------------

  it("preserves group metadata in execution output", () => {
    mockEvalRule.mockReturnValue({ outcome: "passed", matchedCount: 5, requiredCount: 3, matchedSubjects: [] });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "conditional",
          groupEvaluationMode: "any_of",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_count", ruleConfig: { minimumCount: 3 }, orderIndex: 0 },
          ],
        },
      ]),
    });

    const group = result.groupExecutions[0];
    expect(group.ruleGroupId).toBe("rg-1");
    expect(group.groupSeverity).toBe("conditional");
    expect(group.groupEvaluationMode).toBe("any_of");
  });

  // -----------------------------------------------------------------------
  // Supported: required_subject_exists with British input
  // -----------------------------------------------------------------------

  it("evaluates required_subject_exists as passed for British input", () => {
    mockEvalRequiredSubject.mockReturnValue({
      outcome: "passed",
      matchedSubjectName: "mathematics",
      requiredSubjectNames: ["mathematics"],
    });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "required_subject_exists", ruleConfig: { subjectNamesNormalized: ["mathematics"] }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(mockEvalRequiredSubject).toHaveBeenCalledOnce();
    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("passed");
    expect(result.groupExecutions[0].ruleExecutions[0].matchedSubjectName).toBe("mathematics");
    expect(result.groupExecutions[0].ruleExecutions[0].requiredSubjectNames).toEqual(["mathematics"]);
    expect(result.groupExecutions[0].groupOutcome).toBe("passed");
  });

  it("evaluates required_subject_exists as failed for British input", () => {
    mockEvalRequiredSubject.mockReturnValue({
      outcome: "failed",
      matchedSubjectName: null,
      requiredSubjectNames: ["mathematics"],
    });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "required_subject_exists", ruleConfig: { subjectNamesNormalized: ["mathematics"] }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("failed");
    expect(result.groupExecutions[0].ruleExecutions[0].matchedSubjectName).toBeNull();
    expect(result.groupExecutions[0].groupOutcome).toBe("failed");
  });

  // -----------------------------------------------------------------------
  // required_subject_exists skipped for non-British input
  // -----------------------------------------------------------------------

  it("skips required_subject_exists for simple-form input", () => {
    const result = executeDirectEvaluationRuleContext({
      prepared: makeSimpleFormPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "required_subject_exists", ruleConfig: { subjectNamesNormalized: ["mathematics"] }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(mockEvalRequiredSubject).not.toHaveBeenCalled();
    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("skipped");
    expect(result.groupExecutions[0].groupOutcome).toBe("skipped");
  });

  // -----------------------------------------------------------------------
  // Supported: minimum_subject_grade with British input
  // -----------------------------------------------------------------------

  it("evaluates minimum_subject_grade as passed for British input", () => {
    mockEvalMinGrade.mockReturnValue({
      outcome: "passed",
      matchedSubjectName: "mathematics",
      matchedGradeValue: 80,
      requiredMinimumGradeValue: 70,
    });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_grade", ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 70 }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(mockEvalMinGrade).toHaveBeenCalledOnce();
    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("passed");
    expect(result.groupExecutions[0].ruleExecutions[0].matchedSubjectName).toBe("mathematics");
    expect(result.groupExecutions[0].ruleExecutions[0].matchedGradeValue).toBe(80);
    expect(result.groupExecutions[0].ruleExecutions[0].requiredMinimumGradeValue).toBe(70);
    expect(result.groupExecutions[0].groupOutcome).toBe("passed");
  });

  it("evaluates minimum_subject_grade as failed for British input", () => {
    mockEvalMinGrade.mockReturnValue({
      outcome: "failed",
      matchedSubjectName: "mathematics",
      matchedGradeValue: 60,
      requiredMinimumGradeValue: 70,
    });

    const result = executeDirectEvaluationRuleContext({
      prepared: makeBritishPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_grade", ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 70 }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("failed");
    expect(result.groupExecutions[0].ruleExecutions[0].matchedGradeValue).toBe(60);
    expect(result.groupExecutions[0].ruleExecutions[0].requiredMinimumGradeValue).toBe(70);
    expect(result.groupExecutions[0].groupOutcome).toBe("failed");
  });

  // -----------------------------------------------------------------------
  // minimum_subject_grade skipped for non-British input
  // -----------------------------------------------------------------------

  it("skips minimum_subject_grade for simple-form input", () => {
    const result = executeDirectEvaluationRuleContext({
      prepared: makeSimpleFormPrepared(),
      resolvedContext: makeResolvedContext([
        {
          ruleGroupId: "rg-1",
          groupSeverity: "blocking",
          groupEvaluationMode: "all_required",
          orderIndex: 0,
          rules: [
            { ruleId: "r-1", ruleTypeKey: "minimum_subject_grade", ruleConfig: { subjectNameNormalized: "mathematics", minimumGradeValue: 70 }, orderIndex: 0 },
          ],
        },
      ]),
    });

    expect(mockEvalMinGrade).not.toHaveBeenCalled();
    expect(result.groupExecutions[0].ruleExecutions[0].outcome).toBe("skipped");
    expect(result.groupExecutions[0].groupOutcome).toBe("skipped");
  });
});
