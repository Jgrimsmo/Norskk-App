import type {
  WorkType,
  InvoiceStatus,
} from "@/lib/types/time-tracking";
import type { ApprovalStatus } from "@/lib/types/common";

// ── Work Type ──
export const workTypeLabels: Record<WorkType, string> = {
  "lump-sum": "Lump Sum",
  tm: "T&M",
};

export const workTypeOptions: { id: WorkType; label: string }[] = [
  { id: "lump-sum", label: "Lump Sum" },
  { id: "tm", label: "T&M" },
];

// ── Approval Status ──
export const approvalOptions: { id: ApprovalStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

// ── Invoice Status ──
export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  "needs-review": "Needs Review",
  approved: "Approved",
  rejected: "Rejected",
};
