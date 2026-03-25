/**
 * Composed server-side request access helper.
 *
 * Composes session, org-context resolution, and role guards into
 * single-call entrypoints for future server-side routes/services.
 *
 * Server-side only — do not import from client components.
 */

import { getAppSession, requireAppSession } from "@/lib/auth/session";
import { resolveOrgContext } from "@/lib/permissions/org-context";
import {
  requireResolvedOrgContext,
  requireOrgRole,
} from "@/lib/permissions/guards";
import type {
  AppSession,
  ResolvedOrgContext,
  OrgContextResolutionResult,
} from "@/types/auth";
import type { MembershipRole } from "@/types/enums";

/**
 * Get optional request access — does not throw on missing session or unresolved org.
 * Use in server code paths where authentication is optional or partial
 * resolution is acceptable.
 */
export async function getOptionalRequestAccess(
  params?: { organizationId?: string | null }
): Promise<{
  session: AppSession | null;
  orgResolution: OrgContextResolutionResult | null;
  orgContext: ResolvedOrgContext | null;
}> {
  const session = await getAppSession();

  if (!session) {
    return { session: null, orgResolution: null, orgContext: null };
  }

  const orgResolution = await resolveOrgContext({
    userId: session.user.id,
    organizationId: params?.organizationId,
  });

  const orgContext =
    orgResolution.status === "resolved" ? orgResolution.context : null;

  return { session, orgResolution, orgContext };
}

/**
 * Require full request access — throws on missing session or unresolved org.
 * Optionally enforces exact role inclusion if allowedRoles is provided.
 *
 * Use in server code paths that require both authentication and a
 * resolved organization context.
 */
export async function requireRequestAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<{
  session: AppSession;
  orgContext: ResolvedOrgContext;
}> {
  const session = await requireAppSession();

  const orgResolution = await resolveOrgContext({
    userId: session.user.id,
    organizationId: params?.organizationId,
  });

  let orgContext = requireResolvedOrgContext(orgResolution);

  if (params?.allowedRoles && params.allowedRoles.length > 0) {
    orgContext = requireOrgRole(orgContext, params.allowedRoles);
  }

  return { session, orgContext };
}
