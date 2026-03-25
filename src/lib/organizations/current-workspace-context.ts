/**
 * Server-side current workspace context helper.
 *
 * Composes actor access, organization summary, and membership summary
 * into a single resolved workspace context for the current authenticated actor.
 *
 * Read-only, current-session scoped. Composes existing helpers only.
 *
 * Server-side only — do not import from client components.
 */

import {
  getOptionalActorAccess,
  requireActorAccess,
} from "@/lib/auth/actor-access";
import { getCurrentOrganizationSummary, requireCurrentOrganizationSummary } from "@/lib/organizations/current-organization";
import { getCurrentMembershipSummary, requireCurrentMembershipSummary } from "@/lib/organizations/current-membership";
import type { CurrentWorkspaceContext } from "@/types/workspace-context";
import type { MembershipRole } from "@/types/enums";

/**
 * Get the current workspace context.
 * Returns null if any required piece is missing:
 * - no authenticated actor
 * - no resolved org context
 * - no accessible organization summary
 * - no accessible membership summary
 */
export async function getCurrentWorkspaceContext(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceContext | null> {
  const access = await getOptionalActorAccess({
    organizationId: params?.organizationId,
  });

  if (!access.actor || !access.orgContext) {
    return null;
  }

  // Enforce role if provided
  if (params?.allowedRoles && params.allowedRoles.length > 0) {
    if (!params.allowedRoles.includes(access.orgContext.roleKey)) {
      return null;
    }
  }

  const organization = await getCurrentOrganizationSummary({
    organizationId: params?.organizationId,
  });

  if (!organization) {
    return null;
  }

  const membership = await getCurrentMembershipSummary({
    organizationId: params?.organizationId,
  });

  if (!membership) {
    return null;
  }

  return {
    actor: access.actor,
    orgContext: access.orgContext,
    organization,
    membership,
  };
}

/**
 * Require the current workspace context, or throw.
 */
export async function requireCurrentWorkspaceContext(
  params?: { organizationId?: string | null; allowedRoles?: readonly MembershipRole[] }
): Promise<CurrentWorkspaceContext> {
  const { actor, orgContext } = await requireActorAccess({
    organizationId: params?.organizationId,
    allowedRoles: params?.allowedRoles,
  });

  const organization = await requireCurrentOrganizationSummary({
    organizationId: params?.organizationId,
  });

  const membership = await requireCurrentMembershipSummary({
    organizationId: params?.organizationId,
  });

  return { actor, orgContext, organization, membership };
}
