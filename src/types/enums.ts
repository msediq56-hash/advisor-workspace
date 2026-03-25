/**
 * Manually maintained temporary TypeScript enum unions.
 * These must stay aligned with the PostgreSQL enums in
 * `supabase/migrations/00001_core_schema.sql`.
 * They should be replaced later when generated database types are introduced.
 */

export type OwnerScope = "platform" | "organization";

export type OrganizationStatus = "active" | "inactive";

export type MembershipRole = "owner" | "manager" | "advisor";

export type MembershipStatus = "active" | "inactive";

export type VisibilityStatus = "active" | "hidden" | "inactive";

export type QualificationComplexityModel = "simple_form" | "subject_based";

export type ProfileKind = "runtime" | "sample";

export type ProfileStatus = "draft" | "finalized";

export type RuleTargetScope = "university" | "program" | "offering";

export type RuleSetLifecycleStatus = "draft" | "published" | "archived";

export type RuleGroupEvaluationMode =
  | "all_required"
  | "any_of"
  | "advisory_only";

export type RuleGroupSeverity =
  | "blocking"
  | "conditional"
  | "advisory"
  | "review";

export type EvaluationFlowType =
  | "direct_evaluation"
  | "general_comparison"
  | "program_search";

export type EvaluationFinalStatus =
  | "eligible"
  | "conditional"
  | "not_eligible"
  | "needs_review"
  | "incomplete_info";

export type TraceOutcome = "passed" | "failed" | "triggered" | "skipped";

export type ValidationIssueSeverity = "error" | "warning" | "info";

export type AuditActionType =
  | "create"
  | "update"
  | "publish"
  | "deactivate"
  | "hide"
  | "delete"
  | "restore";
