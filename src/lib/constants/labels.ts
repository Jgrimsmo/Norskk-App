import type {
  WorkType,
  InvoiceStatus,
} from "@/lib/types/time-tracking";

// ── Work Type ──
export const workTypeLabels: Record<WorkType, string> = {
  "lump-sum": "Lump Sum",
  tm: "T&M",
};

// ── Invoice Status ──
export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  "needs-review": "Needs Review",
  approved: "Approved",
  rejected: "Rejected",
};
