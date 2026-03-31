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

const MOCK_ADMIN_CLIENT = { __mock: "admin-client" };

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

    mockRequireActorAccess.mockResolvedValue(MOCK_ACCESS);
    mockCreateAdminClient.mockReturnValue(MOCK_ADMIN_CLIENT as never);
    mockRunAndPersist.mockResolvedValue(MOCK_WORKFLOW_RESULT);
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
