/**
 * Actor-aware server-side request access helper.
 *
 * Composes session, active actor profile, org-context resolution,
 * and role guards into a single safe entrypoint for future
 * organization-scoped server-side services.
 *
 * Server-side only — do not import from client components.
 */

import { getCurrentAppActor, requireCurrentAppActor } from "@/lib/auth/actor";
import { resolveOrgContext } from "@/lib/permissions/org-context";
import {
  requireResolvedOrgContext,
  requireOrgRole,
} from "@/lib/permissions/guards";
import type { OptionalActorAccess, RequiredActorAccess } from "@/types/auth";
import type { MembershipRole } from "@/types/enums";

/**
 * Get optional actor access — does not throw on missing session,
 * inactive profile, or unresolved org.
 *
 * Use in server code paths where authentication is optional or
 * partial resolution is acceptable.
 */
export async function getOptionalActorAccess(
  params?: { organizationId?: string | null }
): Promise<OptionalActorAccess> {
  const actor = await getCurrentAppActor();

  if (!actor) {
    return { session: null, actor: null, orgResolution: null, orgContext: null };
  }

  const orgResolution = await resolveOrgContext({
    userId: actor.session.user.id,
    organizationId: params?.organizationId,
  });

  const orgContext =
    orgResolution.status === "resolved" ? orgResolution.context : null;

  return { session: actor.session, actor, orgResolution, orgContext };
}

/**
 * Require full actor access — throws on missing session, inactive
 * profile, or unresolved org.
 *
 * Optionally enforces exact role inclusion if allowedRoles is provided.
 *
 * Use in server code paths that require authenticated actor identity
 * and a resolved organization context.
 */
export async function requireActorAccess(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<RequiredActorAccess> {
  const actor = await requireCurrentAppActor();

  const orgResolution = await resolveOrgContext({
    userId: actor.session.user.id,
    organizationId: params?.organizationId,
  });

  let orgContext = requireResolvedOrgContext(orgResolution);

  if (params?.allowedRoles && params.allowedRoles.length > 0) {
    orgContext = requireOrgRole(orgContext, params.allowedRoles);
  }

  return { session: actor.session, actor, orgContext };
}
