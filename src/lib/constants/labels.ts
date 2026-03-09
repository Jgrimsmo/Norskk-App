import type {
  WorkType,
  SafetyFormType,
  SafetyFormStatus,
  InvoiceStatus,
} from "@/lib/types/time-tracking";

// ── Work Type ──
export const workTypeLabels: Record<WorkType, string> = {
  "lump-sum": "Lump Sum",
  tm: "T&M",
};

// ── Safety Form Type ──
export const formTypeLabels: Record<SafetyFormType, string> = {
  flha: "FLHA",
  "toolbox-talk": "Toolbox Talk",
  "near-miss": "Near Miss",
  "incident-report": "Incident Report",
  "safety-inspection": "Safety Inspection",
};

// ── Safety Form Status ──
export const safetyStatusLabels: Record<SafetyFormStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewed: "Reviewed",
  closed: "Closed",
};

// ── Invoice Status ──
export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  "needs-review": "Needs Review",
  approved: "Approved",
  rejected: "Rejected",
};
