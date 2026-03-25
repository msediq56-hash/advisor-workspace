/**
 * Shared workspace context type for the foundation layer.
 * Reuses existing types — do not duplicate shapes here.
 */

import type { AppActor, ResolvedOrgContext } from "./auth";
import type { OrganizationSummary } from "./organization";
import type { MembershipSummary } from "./membership";

/** Fully resolved current workspace context for the authenticated actor. */
export interface CurrentWorkspaceContext {
  actor: AppActor;
  orgContext: ResolvedOrgContext;
  organization: OrganizationSummary;
  membership: MembershipSummary;
}
