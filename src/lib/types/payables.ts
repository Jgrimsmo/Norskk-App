export type InvoiceStatus = "needs-review" | "approved" | "rejected";
export type BillingType = "tm" | "lump-sum";

export interface Invoice {
  id: string;
  projectId: string;
  vendorId: string;
  amount: number;
  date: string;        // ISO YYYY-MM-DD
  costCodeId?: string;
  billingType?: BillingType;
  fileUrl: string;     // Firebase Storage download URL
  fileName: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}
