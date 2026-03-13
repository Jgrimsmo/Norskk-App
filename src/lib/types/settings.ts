export type PayPeriodType = "weekly" | "bi-weekly" | "semi-monthly" | "monthly";

export interface CompanyProfile {
  id: string; // always "default"
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  /** Optional separate logo optimised for PDF/print (dark bg friendly) */
  pdfLogoUrl?: string;
  /** Pay period cadence — defaults to "bi-weekly" */
  payPeriodType: PayPeriodType;
  /** Anchor date for weekly / bi-weekly periods (ISO string, e.g. "2026-01-05") */
  payPeriodStartDate: string;
}

export interface RolePermissions {
  id: string; // matches the role name, e.g. "Admin", "Foreman"
  role: string;
  permissions: string[]; // e.g. ["time-tracking.view", "dispatch.edit"]
  description: string;
}
