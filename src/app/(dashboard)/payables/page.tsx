"use client";

import * as React from "react";
import { Receipt, Plus, DollarSign, Clock, CheckCircle2, XCircle } from "lucide-react";

import { PayablesTable } from "@/components/payables/payables-table";
import { InvoiceUploadDialog } from "@/components/payables/invoice-upload-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirePermission } from "@/components/require-permission";

import { useInvoices, useProjects, useVendors, useCostCodes } from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";
import { type Invoice, type InvoiceStatus } from "@/lib/types/time-tracking";

// ────────────────────────────────────────────
// Status filter config
// ────────────────────────────────────────────

type FilterTab = InvoiceStatus | "all";

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs-review", label: "Needs Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// ────────────────────────────────────────────
// Page
// ────────────────────────────────────────────

export default function PayablesPage() {
  const { user } = useAuth();
  const { data: invoices, loading: loadingInv, update: updateInvoice, remove: removeInvoice } = useInvoices();
  const { data: projects, loading: loadingProj } = useProjects();
  const { data: vendors, loading: loadingVend } = useVendors();
  const { data: costCodes, loading: loadingCC } = useCostCodes();

  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all");
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const loading = loadingInv || loadingProj || loadingVend || loadingCC;

  // Filter invoices by active tab
  const visibleInvoices = React.useMemo(() => {
    const sorted = [...invoices].sort((a, b) => b.date.localeCompare(a.date));
    if (activeFilter === "all") return sorted;
    return sorted.filter((inv) => inv.status === activeFilter);
  }, [invoices, activeFilter]);

  // Counts per status
  const counts = React.useMemo(() => ({
    all: invoices.length,
    "needs-review": invoices.filter((i) => i.status === "needs-review").length,
    approved: invoices.filter((i) => i.status === "approved").length,
    rejected: invoices.filter((i) => i.status === "rejected").length,
  }), [invoices]);

  // Total amounts
  const totalPending = React.useMemo(
    () => invoices.filter((i) => i.status === "needs-review").reduce((s, i) => s + i.amount, 0),
    [invoices]
  );
  const totalApproved = React.useMemo(
    () => invoices.filter((i) => i.status === "approved").reduce((s, i) => s + i.amount, 0),
    [invoices]
  );

  const handleUpdateStatus = (id: string, status: InvoiceStatus) => {
    const actor = user?.displayName || user?.email || "Unknown";
    const now = new Date().toISOString();
    updateInvoice(id, {
      status,
      ...(status === "approved"
        ? { approvedAt: now, approvedBy: actor, rejectedAt: undefined, rejectedBy: undefined }
        : status === "rejected"
        ? { rejectedAt: now, rejectedBy: actor, approvedAt: undefined, approvedBy: undefined }
        : { approvedAt: undefined, approvedBy: undefined, rejectedAt: undefined, rejectedBy: undefined }),
    } as Partial<Invoice>);
  };

  const handleDelete = (id: string) => {
    removeInvoice(id);
  };

  return (
    <RequirePermission permission="payables.view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Payables</h1>
            <p className="text-muted-foreground">Upload and approve vendor invoices.</p>
          </div>
          <Button className="gap-1.5" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" />
            Upload Invoice
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-yellow-500" />
              Needs Review
            </div>
            <div className="mt-1 text-2xl font-bold">{counts["needs-review"]}</div>
            <div className="text-sm text-muted-foreground">
              ${totalPending.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Approved
            </div>
            <div className="mt-1 text-2xl font-bold">{counts.approved}</div>
            <div className="text-sm text-muted-foreground">
              ${totalApproved.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total Invoices
            </div>
            <div className="mt-1 text-2xl font-bold">{counts.all}</div>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border ${
                activeFilter === tab.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeFilter === tab.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {counts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <PayablesTable
            invoices={visibleInvoices}
            projects={projects}
            vendors={vendors}
            costCodes={costCodes}
            onUpdateStatus={handleUpdateStatus}
            onUpdate={(id, updates) => updateInvoice(id, updates as Partial<Invoice>)}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Upload Dialog */}
      <InvoiceUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projects={projects}
        vendors={vendors}
        costCodes={costCodes}
      />
    </RequirePermission>
  );
}
