/**
 * Pure role-capability helpers for the foundation layer.
 *
 * Fixed explicit mapping only — no role hierarchy engine, no database,
 * no wildcard permissions, no resource/action matrix.
 *
 * This is not a full permission framework. It only provides small
 * explicit capability checks for Phase 1 foundation use.
 */

import type { MembershipRole } from "@/types/enums";
import type { RoleCapabilityKey } from "@/types/role-capabilities";

/** Fixed capability map per role. */
const ROLE_CAPABILITY_MAP: Readonly<
  Record<MembershipRole, Readonly<Record<RoleCapabilityKey, boolean>>>
> = {
  owner: {
    manageOrganizationUsers: true,
    manageOrganizationSettings: true,
    editOrganizationOwnedData: true,
    viewOrganizationOwnedData: true,
    runAdvisorWorkspace: true,
  },
  manager: {
    manageOrganizationUsers: false,
    manageOrganizationSettings: false,
    editOrganizationOwnedData: true,
    viewOrganizationOwnedData: true,
    runAdvisorWorkspace: true,
  },
  advisor: {
    manageOrganizationUsers: false,
    manageOrganizationSettings: false,
    editOrganizationOwnedData: false,
    viewOrganizationOwnedData: true,
    runAdvisorWorkspace: true,
  },
};

/** Return only the enabled capability keys for the given role. */
export function getRoleCapabilities(
  role: MembershipRole
): readonly RoleCapabilityKey[] {
  const map = ROLE_CAPABILITY_MAP[role];
  return (Object.keys(map) as RoleCapabilityKey[]).filter((key) => map[key]);
}

/** Check exact boolean from the fixed mapping. */
export function hasRoleCapability(
  role: MembershipRole,
  capability: RoleCapabilityKey
): boolean {
  return ROLE_CAPABILITY_MAP[role][capability];
}

export function roleCanRunAdvisorWorkspace(role: MembershipRole): boolean {
  return hasRoleCapability(role, "runAdvisorWorkspace");
}

export function roleCanViewOrganizationOwnedData(role: MembershipRole): boolean {
  return hasRoleCapability(role, "viewOrganizationOwnedData");
}

export function roleCanEditOrganizationOwnedData(role: MembershipRole): boolean {
  return hasRoleCapability(role, "editOrganizationOwnedData");
}

export function roleCanManageOrganizationUsers(role: MembershipRole): boolean {
  return hasRoleCapability(role, "manageOrganizationUsers");
}

export function roleCanManageOrganizationSettings(role: MembershipRole): boolean {
  return hasRoleCapability(role, "manageOrganizationSettings");
}
