import type {
  OrgContextResolutionResult,
  ResolvedOrgContext,
} from "@/types/auth";
import type { MembershipRole } from "@/types/enums";

/**
 * Extract the resolved org context or throw.
 * Use after resolveOrgContext() when the caller requires a resolved context.
 */
export function requireResolvedOrgContext(
  result: OrgContextResolutionResult
): ResolvedOrgContext {
  if (result.status !== "resolved") {
    throw new Error(
      `Org context not resolved: ${result.status}`
    );
  }
  return result.context;
}

/**
 * Check whether the resolved context's role is in the allowed list.
 * No role hierarchy — exact inclusion only.
 */
export function hasRequiredOrgRole(
  context: ResolvedOrgContext,
  allowedRoles: readonly MembershipRole[]
): boolean {
  return allowedRoles.includes(context.roleKey);
}

/**
 * Require that the resolved context's role is in the allowed list, or throw.
 * No role hierarchy — exact inclusion only.
 */
export function requireOrgRole(
  context: ResolvedOrgContext,
  allowedRoles: readonly MembershipRole[]
): ResolvedOrgContext {
  if (!hasRequiredOrgRole(context, allowedRoles)) {
    throw new Error(
      `Insufficient role: '${context.roleKey}' not in [${allowedRoles.join(", ")}]`
    );
  }
  return context;
}
