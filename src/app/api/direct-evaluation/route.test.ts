/**
 * Direct-evaluation route integration test baseline.
 *
 * Tests the transport contract and error/status behavior of the
 * POST /api/direct-evaluation route handler.
 *
 * Mocks only the invocation boundary module to isolate route behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the invocation boundary before importing the route
vi.mock("@/modules/evaluation/invoke-direct-evaluation-workflow", () => ({
  invokeDirectEvaluationWorkflow: vi.fn(),
}));

import { POST } from "./route";
import { invokeDirectEvaluationWorkflow } from "@/modules/evaluation/invoke-direct-evaluation-workflow";

const mockInvoke = vi.mocked(invokeDirectEvaluationWorkflow);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/direct-evaluation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost/api/direct-evaluation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json{{{",
  });
}

const VALID_BRITISH_BODY = {
  evaluation: {
    family: "british_curriculum",
    offeringId: "offering-1",
    qualificationTypeKey: "british_a_level",
    payload: { header: {}, subjects: [] },
  },
  sourceProfileId: null,
};

const VALID_SIMPLE_FORM_BODY = {
  evaluation: {
    family: "arabic_secondary",
    offeringId: "offering-1",
    qualificationTypeKey: "arabic_sec",
    answers: [{ fieldKey: "gpa", value: "90" }],
  },
  sourceProfileId: null,
};

const MOCK_WORKFLOW_RESULT = {
  runtime: {
    family: "british_curriculum" as const,
    prepared: {} as never,
    resolvedContext: {} as never,
    execution: { groupExecutions: [] },
    assembled: {
      finalStatus: "eligible" as const,
      primaryReasonKey: "all_required_groups_satisfied",
      matchedRulesCount: 0,
      failedGroupsCount: 0,
      conditionalGroupsCount: 0,
      groupExecutions: [],
    },
    primaryReasonAr: "test",
    nextStepAr: "test",
    advisoryNotesAr: [],
  },
  persistence: {
    evaluationRunId: "run-1",
    evaluationResultId: "result-1",
    persistedRuleTraceCount: 0,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/direct-evaluation", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------

  it("returns 200 with explicit success response shape on workflow success", async () => {
    mockInvoke.mockResolvedValue(MOCK_WORKFLOW_RESULT);

    const res = await POST(makeRequest(VALID_BRITISH_BODY));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("runtime");
    expect(body).toHaveProperty("persistence");
    expect(body.persistence).toHaveProperty("evaluationRunId");
    expect(body.persistence).toHaveProperty("evaluationResultId");
    expect(body.persistence).toHaveProperty("persistedRuleTraceCount");
  });

  it("accepts simple-form family bodies", async () => {
    mockInvoke.mockResolvedValue(MOCK_WORKFLOW_RESULT);

    const res = await POST(makeRequest(VALID_SIMPLE_FORM_BODY));

    expect(res.status).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 400 — invalid JSON
  // -------------------------------------------------------------------------

  it("returns 400 invalid_json for unparseable JSON", async () => {
    const res = await POST(makeInvalidJsonRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("invalid_json");
    expect(typeof body.error.message).toBe("string");
  });

  // -------------------------------------------------------------------------
  // 400 — invalid transport shape
  // -------------------------------------------------------------------------

  it("returns 400 invalid_request_shape for missing evaluation", async () => {
    const res = await POST(makeRequest({ sourceProfileId: null }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("invalid_request_shape");
  });

  it("returns 400 invalid_request_shape for missing sourceProfileId", async () => {
    const res = await POST(
      makeRequest({
        evaluation: {
          family: "british_curriculum",
          offeringId: "x",
          qualificationTypeKey: "y",
          payload: {},
        },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("invalid_request_shape");
  });

  it("returns 400 invalid_request_shape for unsupported family", async () => {
    const res = await POST(
      makeRequest({
        evaluation: {
          family: "unknown_family",
          offeringId: "x",
          qualificationTypeKey: "y",
        },
        sourceProfileId: null,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("invalid_request_shape");
  });

  it("returns 400 invalid_request_shape for british without payload", async () => {
    const res = await POST(
      makeRequest({
        evaluation: {
          family: "british_curriculum",
          offeringId: "x",
          qualificationTypeKey: "y",
        },
        sourceProfileId: null,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("invalid_request_shape");
  });

  it("returns 400 invalid_request_shape for simple-form without answers", async () => {
    const res = await POST(
      makeRequest({
        evaluation: {
          family: "arabic_secondary",
          offeringId: "x",
          qualificationTypeKey: "y",
        },
        sourceProfileId: null,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("invalid_request_shape");
  });

  // -------------------------------------------------------------------------
  // Milestone 2D.1a — British transport-shape: optional languageCertificate
  //
  // The route parser must accept a valid certificate and reject malformed
  // certificate shapes with 400 invalid_request_shape (NOT 500). Absence
  // of the field is allowed and must not change behavior. The shared
  // validateOptionalLanguageCertificate helper backs both this transport
  // check and the raw-profile validator.
  // -------------------------------------------------------------------------

  it("accepts an authenticated British POST that carries a valid IELTS languageCertificate", async () => {
    mockInvoke.mockResolvedValue(MOCK_WORKFLOW_RESULT);

    const res = await POST(
      makeRequest({
        evaluation: {
          family: "british_curriculum",
          offeringId: "offering-1",
          qualificationTypeKey: "british_a_level",
          payload: {
            header: {},
            subjects: [],
            languageCertificate: { testTypeKey: "ielts", score: 6.5 },
          },
        },
        sourceProfileId: null,
      })
    );

    expect(res.status).toBe(200);
    expect(mockInvoke).toHaveBeenCalledOnce();
  });

  it("returns 400 invalid_request_shape for british payload with unknown languageCertificate.testTypeKey", async () => {
    const res = await POST(
      makeRequest({
        evaluation: {
          family: "british_curriculum",
          offeringId: "offering-1",
          qualificationTypeKey: "british_a_level",
          payload: {
            header: {},
            subjects: [],
            languageCertificate: { testTypeKey: "fce_legacy", score: 7 },
          },
        },
        sourceProfileId: null,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("invalid_request_shape");
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_request_shape for british payload with languageCertificate.testTypeKey="other" missing testTypeOtherLabel', async () => {
    const res = await POST(
      makeRequest({
        evaluation: {
          family: "british_curriculum",
          offeringId: "offering-1",
          qualificationTypeKey: "british_a_level",
          payload: {
            header: {},
            subjects: [],
            languageCertificate: { testTypeKey: "other", score: 7 },
          },
        },
        sourceProfileId: null,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("invalid_request_shape");
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("accepts an authenticated British POST without languageCertificate (existing behavior preserved)", async () => {
    mockInvoke.mockResolvedValue(MOCK_WORKFLOW_RESULT);

    const res = await POST(makeRequest(VALID_BRITISH_BODY));

    expect(res.status).toBe(200);
    expect(mockInvoke).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // 401 — unauthenticated
  // -------------------------------------------------------------------------

  it("returns 401 authentication_required for 'Authentication required' error", async () => {
    mockInvoke.mockRejectedValue(new Error("Authentication required"));

    const res = await POST(makeRequest(VALID_BRITISH_BODY));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("authentication_required");
  });

  it("returns 401 authentication_required for 'Active user profile not found' error", async () => {
    mockInvoke.mockRejectedValue(new Error("Active user profile not found"));

    const res = await POST(makeRequest(VALID_BRITISH_BODY));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("authentication_required");
  });

  // -------------------------------------------------------------------------
  // 409 — org selection required
  // -------------------------------------------------------------------------

  it("returns 409 org_selection_required for multiple memberships error", async () => {
    mockInvoke.mockRejectedValue(
      new Error("Org context not resolved: multiple_active_memberships_requires_selection")
    );

    const res = await POST(makeRequest(VALID_BRITISH_BODY));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("org_selection_required");
  });

  // -------------------------------------------------------------------------
  // 403 — access denied
  // -------------------------------------------------------------------------

  it("returns 403 access_denied for org context not resolved", async () => {
    mockInvoke.mockRejectedValue(
      new Error("Org context not resolved: organization_not_accessible")
    );

    const res = await POST(makeRequest(VALID_BRITISH_BODY));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("access_denied");
  });

  it("returns 403 access_denied for insufficient role", async () => {
    mockInvoke.mockRejectedValue(
      new Error("Insufficient role: 'advisor' not in [owner]")
    );

    const res = await POST(makeRequest(VALID_BRITISH_BODY));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("access_denied");
  });

  // -------------------------------------------------------------------------
  // 403 — source profile access denied (unified)
  // -------------------------------------------------------------------------

  it("returns 403 access_denied for source profile boundary failure", async () => {
    mockInvoke.mockRejectedValue(
      new Error("Source profile access denied: the referenced student profile is not accessible")
    );

    const res = await POST(makeRequest(VALID_BRITISH_BODY));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("access_denied");
  });

  it("source profile not-found and foreign-org produce indistinguishable outward message", async () => {
    // Both cases now throw the same unified error from the invocation boundary
    const unifiedMessage = "Source profile access denied: the referenced student profile is not accessible";

    mockInvoke.mockRejectedValue(new Error(unifiedMessage));
    const res1 = await POST(makeRequest(VALID_BRITISH_BODY));
    const body1 = await res1.json();

    mockInvoke.mockRejectedValue(new Error(unifiedMessage));
    const res2 = await POST(makeRequest(VALID_BRITISH_BODY));
    const body2 = await res2.json();

    expect(body1.error.code).toBe(body2.error.code);
    expect(body1.error.message).toBe(body2.error.message);
    expect(res1.status).toBe(res2.status);
  });

  // -------------------------------------------------------------------------
  // 500 — internal error (redacted)
  // -------------------------------------------------------------------------

  it("returns 500 internal_error for unknown errors", async () => {
    mockInvoke.mockRejectedValue(new Error("Something unexpected"));

    const res = await POST(makeRequest(VALID_BRITISH_BODY));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).toBe("Internal server error");
  });

  it("does not expose raw internal error messages in 500 responses", async () => {
    mockInvoke.mockRejectedValue(new Error("database connection pool exhausted at row 42"));

    const res = await POST(makeRequest(VALID_BRITISH_BODY));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe("Internal server error");
    expect(body.error.message).not.toContain("database");
    expect(body.error.message).not.toContain("pool");
  });
});
