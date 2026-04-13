/**
 * Server-side invocation boundary integration test baseline.
 *
 * Tests the access/context derivation and delegation behavior of
 * invokeDirectEvaluationWorkflow without hitting real auth or DB.
 *
 * Mocks: requireActorAccess, createAdminClient, runAndPersistDirectEvaluation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@/lib/auth/actor-access", () => ({
  requireActorAccess: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/modules/evaluation/run-and-persist-direct-evaluation", () => ({
  runAndPersistDirectEvaluation: vi.fn(),
}));

import { invokeDirectEvaluationWorkflow } from "./invoke-direct-evaluation-workflow";
import { requireActorAccess } from "@/lib/auth/actor-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAndPersistDirectEvaluation } from "@/modules/evaluation/run-and-persist-direct-evaluation";

const mockRequireActorAccess = vi.mocked(requireActorAccess);
const mockCreateAdminClient = vi.mocked(createAdminClient);
const mockRunAndPersist = vi.mocked(runAndPersistDirectEvaluation);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_ACCESS = {
  session: { user: { id: "user-123", email: "test@example.com" } },
  actor: {
    session: { user: { id: "user-123", email: "test@example.com" } },
    profile: {
      id: "user-123",
      fullName: "Test User",
      emailNormalized: "test@example.com",
      isActive: true,
    },
  },
  orgContext: {
    userId: "user-123",
    membershipId: "mem-1",
    organizationId: "org-456",
    organizationSlug: "test-org",
    organizationNameAr: "منظمة اختبار",
    roleKey: "owner" as const,
  },
};

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
const MOCK_ADMIN_CLIENT = { __mock: "admin-client", from: mockFrom };

const MOCK_WORKFLOW_RESULT = {
  runtime: { family: "british_curriculum" as const } as never,
  persistence: {
    evaluationRunId: "run-1",
    evaluationResultId: "result-1",
    persistedRuleTraceCount: 2,
  },
};

const BASE_INPUT = {
  evaluation: {
    family: "british_curriculum" as const,
    offeringId: "offering-1",
    qualificationTypeKey: "british_a_level",
    payload: {
      header: {
        countryId: "c-1",
        notesAr: null,
        curriculumLabel: null,
        graduationYear: null,
        headerNotesAr: null,
      },
      subjects: [],
    },
  },
  sourceProfileId: null as string | null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("invokeDirectEvaluationWorkflow", () => {
  beforeEach(() => {
    mockRequireActorAccess.mockReset();
    mockCreateAdminClient.mockReset();
    mockRunAndPersist.mockReset();
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEq.mockClear();
    mockMaybeSingle.mockClear();

    // Reset chain return values
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockRequireActorAccess.mockResolvedValue(MOCK_ACCESS);
    mockCreateAdminClient.mockReturnValue(MOCK_ADMIN_CLIENT as never);
    mockRunAndPersist.mockResolvedValue(MOCK_WORKFLOW_RESULT);
    mockMaybeSingle.mockResolvedValue({ data: { organization_id: "org-456" }, error: null });
  });

  // -------------------------------------------------------------------------
  // Access passthrough
  // -------------------------------------------------------------------------

  it("passes organizationId from evaluation input to requireActorAccess", async () => {
    const input = {
      ...BASE_INPUT,
      evaluation: { ...BASE_INPUT.evaluation, organizationId: "org-explicit" },
    };

    await invokeDirectEvaluationWorkflow(input);

    expect(mockRequireActorAccess).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-explicit" })
    );
  });

  it("passes allowedRoles from evaluation input to requireActorAccess", async () => {
    const input = {
      ...BASE_INPUT,
      evaluation: {
        ...BASE_INPUT.evaluation,
        allowedRoles: ["owner" as const, "manager" as const],
      },
    };

    await invokeDirectEvaluationWorkflow(input);

    expect(mockRequireActorAccess).toHaveBeenCalledWith(
      expect.objectContaining({ allowedRoles: ["owner", "manager"] })
    );
  });

  it("passes undefined organizationId when not provided", async () => {
    await invokeDirectEvaluationWorkflow(BASE_INPUT);

    expect(mockRequireActorAccess).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: undefined })
    );
  });

  // -------------------------------------------------------------------------
  // Metadata derivation
  // -------------------------------------------------------------------------

  it("derives organizationId from resolved org context", async () => {
    await invokeDirectEvaluationWorkflow(BASE_INPUT);

    expect(mockRunAndPersist).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          persistenceMetadata: expect.objectContaining({
            organizationId: "org-456",
          }),
        }),
      })
    );
  });

  it("derives actorUserId from resolved session user", async () => {
    await invokeDirectEvaluationWorkflow(BASE_INPUT);

    expect(mockRunAndPersist).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          persistenceMetadata: expect.objectContaining({
            actorUserId: "user-123",
          }),
        }),
      })
    );
  });

  it("keeps sourceProfileId explicit from input", async () => {
    const input = { ...BASE_INPUT, sourceProfileId: "profile-789" };

    await invokeDirectEvaluationWorkflow(input);

    expect(mockRunAndPersist).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          persistenceMetadata: expect.objectContaining({
            sourceProfileId: "profile-789",
          }),
        }),
      })
    );
  });

  it("uses the fixed request context baseline object", async () => {
    await invokeDirectEvaluationWorkflow(BASE_INPUT);

    expect(mockRunAndPersist).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          persistenceMetadata: expect.objectContaining({
            requestContextJsonb: { source: "server_invocation_baseline" },
          }),
        }),
      })
    );
  });

  // -------------------------------------------------------------------------
  // Delegation
  // -------------------------------------------------------------------------

  it("passes the admin client to runAndPersistDirectEvaluation", async () => {
    await invokeDirectEvaluationWorkflow(BASE_INPUT);

    expect(mockRunAndPersist).toHaveBeenCalledWith(
      expect.objectContaining({ supabase: MOCK_ADMIN_CLIENT })
    );
  });

  it("passes the evaluation input through to the workflow", async () => {
    await invokeDirectEvaluationWorkflow(BASE_INPUT);

    expect(mockRunAndPersist).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          evaluation: BASE_INPUT.evaluation,
        }),
      })
    );
  });

  it("returns the workflow result unchanged", async () => {
    const result = await invokeDirectEvaluationWorkflow(BASE_INPUT);

    expect(result).toBe(MOCK_WORKFLOW_RESULT);
  });

  // -------------------------------------------------------------------------
  // Source profile ownership guard
  // -------------------------------------------------------------------------

  it("does not look up profile when sourceProfileId is null", async () => {
    await invokeDirectEvaluationWorkflow(BASE_INPUT);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRunAndPersist).toHaveBeenCalled();
  });

  it("delegates successfully when sourceProfileId matches organization", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { organization_id: "org-456" }, error: null });

    const input = { ...BASE_INPUT, sourceProfileId: "profile-789" };
    const result = await invokeDirectEvaluationWorkflow(input);

    expect(mockFrom).toHaveBeenCalledWith("student_profiles");
    expect(mockSelect).toHaveBeenCalledWith("organization_id");
    expect(mockEq).toHaveBeenCalledWith("id", "profile-789");
    expect(mockRunAndPersist).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          persistenceMetadata: expect.objectContaining({
            sourceProfileId: "profile-789",
          }),
        }),
      })
    );
    expect(result).toBe(MOCK_WORKFLOW_RESULT);
  });

  it("fails before workflow when sourceProfileId belongs to different organization", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { organization_id: "org-other" }, error: null });

    const input = { ...BASE_INPUT, sourceProfileId: "profile-wrong-org" };

    await expect(invokeDirectEvaluationWorkflow(input)).rejects.toThrow(
      "Source profile access denied:"
    );
    expect(mockRunAndPersist).not.toHaveBeenCalled();
  });

  it("fails before workflow when sourceProfileId does not exist", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const input = { ...BASE_INPUT, sourceProfileId: "profile-nonexistent" };

    await expect(invokeDirectEvaluationWorkflow(input)).rejects.toThrow(
      "Source profile access denied:"
    );
    expect(mockRunAndPersist).not.toHaveBeenCalled();
  });

  it("produces indistinguishable errors for not-found and foreign-org profiles", async () => {
    // Not found
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const input1 = { ...BASE_INPUT, sourceProfileId: "profile-missing" };
    const err1 = await invokeDirectEvaluationWorkflow(input1).catch((e: Error) => e.message);

    // Foreign org
    mockMaybeSingle.mockResolvedValue({ data: { organization_id: "org-other" }, error: null });
    const input2 = { ...BASE_INPUT, sourceProfileId: "profile-foreign" };
    const err2 = await invokeDirectEvaluationWorkflow(input2).catch((e: Error) => e.message);

    expect(err1).toBe(err2);
  });

  it("fails before workflow when profile lookup returns a database error", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "db connection lost" } });

    const input = { ...BASE_INPUT, sourceProfileId: "profile-err" };

    await expect(invokeDirectEvaluationWorkflow(input)).rejects.toThrow(
      "Source profile lookup failed:"
    );
    expect(mockRunAndPersist).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Failure passthrough
  // -------------------------------------------------------------------------

  it("rethrows when access helper throws", async () => {
    const accessError = new Error("Authentication required");
    mockRequireActorAccess.mockRejectedValue(accessError);

    await expect(invokeDirectEvaluationWorkflow(BASE_INPUT)).rejects.toThrow(
      accessError
    );
    expect(mockRunAndPersist).not.toHaveBeenCalled();
  });

  it("rethrows when workflow throws", async () => {
    const workflowError = new Error("Workflow failure");
    mockRunAndPersist.mockRejectedValue(workflowError);

    await expect(invokeDirectEvaluationWorkflow(BASE_INPUT)).rejects.toThrow(
      workflowError
    );
  });
});
