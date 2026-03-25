/**
 * Shared organization branding types for the foundation layer.
 */

/** Minimal read-only summary of accessible organization branding. */
export interface OrganizationBrandingSummary {
  organizationId: string;
  displayNameAr: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}
