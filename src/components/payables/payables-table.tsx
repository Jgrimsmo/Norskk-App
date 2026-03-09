"use client";

import * as React from "react";
import { FileText, Pencil, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";

import { ColumnFilter } from "@/components/time-tracking/column-filter";
import { DateColumnFilter } from "@/components/time-tracking/date-column-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { InvoiceEditDialog } from "@/components/payables/invoice-edit-dialog";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { CellInput } from "@/components/shared/cell-input";
import { CellSelect } from "@/components/shared/cell-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

import {
  type Invoice,
  type InvoiceStatus,
  type Project,
  type Vendor,
  type CostCode,
} from "@/lib/types/time-tracking";

// ────────────────────────────────────────────
// Note Popover
// ────────────────────────────────────────────

function NotePopover({
  note,
  onSave,
}: {
  note?: string;
  onSave: (note: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(note ?? "");

  // Sync draft when note changes externally
  React.useEffect(() => {
    if (!open) setDraft(note ?? "");
  }, [note, open]);

  const hasNote = !!note?.trim();

  const handleSave = () => {
    onSave(draft.trim());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${
            hasNote
              ? "text-blue-500 hover:text-blue-700 hover:bg-blue-50"
              : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="text-xs font-medium mb-2">Note</p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note about this invoice…"
          className="text-xs resize-none"
          rows={4}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" className="text-xs h-7" onClick={handleSave}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const statusOptions = [
  { id: "needs-review", label: "Needs Review" },
  { id: "approved",     label: "Approved" },
  { id: "rejected",     label: "Rejected" },
];

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────

interface PayablesTableProps {
  invoices: Invoice[];
  projects: Project[];
  vendors: Vendor[];
  costCodes: CostCode[];
  onUpdateStatus: (id: string, status: InvoiceStatus) => void;
  onUpdate: (id: string, updates: Partial<Invoice>) => void;
  onDelete: (id: string) => void;
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

const billingTypeOptions = [
  { id: "tm", label: "T&M" },
  { id: "lump-sum", label: "Lump Sum" },
];

export function PayablesTable({
  invoices,
  projects,
  vendors,
  costCodes,
  onUpdateStatus,
  onUpdate,
  onDelete,
}: PayablesTableProps) {
  const [editingInvoice, setEditingInvoice] = React.useState<Invoice | null>(null);

  // Filters
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [projectFilter, setProjectFilter] = React.useState<Set<string>>(new Set());
  const [vendorFilter, setVendorFilter] = React.useState<Set<string>>(new Set());
  const [costCodeFilter, setCostCodeFilter] = React.useState<Set<string>>(new Set());
  const [billingTypeFilter, setBillingTypeFilter] = React.useState<Set<string>>(new Set());

  const projectMap = React.useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects]
  );

  const vendorMap = React.useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.name])),
    [vendors]
  );

  const costCodeMap = React.useMemo(
    () => Object.fromEntries(costCodes.map((c) => [c.id, `${c.code}`])),
    [costCodes]
  );

  // Filter options derived from data
  const projectOptions = React.useMemo(
    () => projects.map((p) => ({ id: p.id, label: p.name })),
    [projects]
  );
  const vendorOptions = React.useMemo(
    () => vendors.map((v) => ({ id: v.id, label: v.name })),
    [vendors]
  );
  const costCodeOptions = React.useMemo(
    () => costCodes.map((c) => ({ id: c.id, label: c.code })),
    [costCodes]
  );

  // Filtered invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      // Date range
      if (dateRange?.from || dateRange?.to) {
        const d = parseISO(inv.date);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
      }
      // Project
      if (projectFilter.size > 0 && !projectFilter.has(inv.projectId)) return false;
      // Vendor
      if (vendorFilter.size > 0 && !vendorFilter.has(inv.vendorId)) return false;
      // Cost Code
      if (costCodeFilter.size > 0 && (!inv.costCodeId || !costCodeFilter.has(inv.costCodeId))) return false;
      // Billing Type
      if (billingTypeFilter.size > 0 && (!inv.billingType || !billingTypeFilter.has(inv.billingType))) return false;
      return true;
    });
  }, [invoices, dateRange, projectFilter, vendorFilter, costCodeFilter, billingTypeFilter]);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
              <TableHead className="w-[120px] px-3">
                <DateColumnFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
              </TableHead>
              <TableHead className="w-[200px] px-3">
                <ColumnFilter title="Project" options={projectOptions} selected={projectFilter} onChange={setProjectFilter} />
              </TableHead>
              <TableHead className="w-[180px] px-3">
                <ColumnFilter title="Vendor" options={vendorOptions} selected={vendorFilter} onChange={setVendorFilter} />
              </TableHead>
              <TableHead className="w-[110px] text-xs font-semibold px-3">Amount</TableHead>
              <TableHead className="w-[130px] px-3">
                <ColumnFilter title="Cost Code" options={costCodeOptions} selected={costCodeFilter} onChange={setCostCodeFilter} />
              </TableHead>
              <TableHead className="w-[120px] px-3">
                <ColumnFilter title="Billing Type" options={billingTypeOptions} selected={billingTypeFilter} onChange={setBillingTypeFilter} />
              </TableHead>
              <TableHead className="w-[140px] text-xs font-semibold px-3">Status</TableHead>
              <TableHead className="w-[60px] text-xs font-semibold px-3">File</TableHead>
              <TableHead className="w-[50px] text-xs font-semibold px-3">Note</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold px-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => {
                const isReview = inv.status === "needs-review";
                return (
                <TableRow
                  key={inv.id}
                  className="h-[36px] group"
                >
                  {/* Date */}
                  <TableCell className="p-0 px-1">
                    {isReview ? (
                      <CellInput
                        type="date"
                        value={inv.date}
                        onChange={(v) => onUpdate(inv.id, { date: v })}
                      />
                    ) : (
                      <span className="text-xs px-2">{format(parseISO(inv.date), "MM/dd/yyyy")}</span>
                    )}
                  </TableCell>
                  {/* Project */}
                  <TableCell className="p-0 px-1">
                    {isReview ? (
                      <CellSelect
                        value={inv.projectId}
                        onChange={(v) => onUpdate(inv.id, { projectId: v })}
                        options={projectOptions}
                        placeholder="Project"
                      />
                    ) : (
                      <span className="text-xs px-2 font-medium">{projectMap[inv.projectId] ?? "—"}</span>
                    )}
                  </TableCell>
                  {/* Vendor */}
                  <TableCell className="p-0 px-1">
                    {isReview ? (
                      <CellSelect
                        value={inv.vendorId}
                        onChange={(v) => onUpdate(inv.id, { vendorId: v })}
                        options={vendorOptions}
                        placeholder="Vendor"
                      />
                    ) : (
                      <span className="text-xs px-2">{vendorMap[inv.vendorId] ?? "—"}</span>
                    )}
                  </TableCell>
                  {/* Amount */}
                  <TableCell className="p-0 px-1">
                    {isReview ? (
                      <CellInput
                        type="number"
                        value={inv.amount}
                        onChange={(v) => {
                          const n = parseFloat(v);
                          if (!isNaN(n)) onUpdate(inv.id, { amount: n });
                        }}
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="text-xs px-2 font-medium">
                        ${inv.amount.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </TableCell>
                  {/* Cost Code */}
                  <TableCell className="p-0 px-1">
                    {isReview ? (
                      <CellSelect
                        value={inv.costCodeId ?? ""}
                        onChange={(v) => onUpdate(inv.id, { costCodeId: v || undefined })}
                        options={costCodeOptions}
                        placeholder="Cost Code"
                      />
                    ) : (
                      <span className="text-xs px-2 text-muted-foreground">
                        {inv.costCodeId ? costCodeMap[inv.costCodeId] ?? "—" : "—"}
                      </span>
                    )}
                  </TableCell>
                  {/* Billing Type */}
                  <TableCell className="p-0 px-1">
                    {isReview ? (
                      <CellSelect
                        value={inv.billingType ?? ""}
                        onChange={(v) => onUpdate(inv.id, { billingType: v || undefined } as Partial<Invoice>)}
                        options={billingTypeOptions}
                        placeholder="Billing Type"
                      />
                    ) : (
                      <span className="text-xs px-2 text-muted-foreground">
                        {inv.billingType === "tm" ? "T&M" : inv.billingType === "lump-sum" ? "Lump Sum" : "—"}
                      </span>
                    )}
                  </TableCell>
                  {/* Status */}
                  <TableCell className="p-0 px-1">
                    {isReview ? (
                      <CellSelect
                        value={inv.status}
                        onChange={(v) => onUpdateStatus(inv.id, v as InvoiceStatus)}
                        options={statusOptions}
                        placeholder="Status"
                      />
                    ) : (
                      <span className="text-xs px-2">
                        <span className={inv.status === "approved" ? "text-green-700" : "text-red-600"}>
                          {inv.status === "approved" ? "Approved" : "Rejected"}
                        </span>
                        {inv.status === "approved" && inv.approvedBy && (
                          <span className="text-[10px] text-muted-foreground"> by {inv.approvedBy}{inv.approvedAt && <> · {new Date(inv.approvedAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>}</span>
                        )}
                        {inv.status === "rejected" && inv.rejectedBy && (
                          <span className="text-[10px] text-muted-foreground"> by {inv.rejectedBy}{inv.rejectedAt && <> · {new Date(inv.rejectedAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>}</span>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          asChild
                        >
                          <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Open PDF: {inv.fileName}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="px-1">
                    <NotePopover
                      note={inv.notes}
                      onSave={(note) => onUpdate(inv.id, { notes: note || undefined } as Partial<Invoice>)}
                    />
                  </TableCell>
                  <TableCell className="px-3">
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingInvoice(inv)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Edit invoice</p>
                        </TooltipContent>
                      </Tooltip>
                      <DeleteConfirmButton
                        onConfirm={() => onDelete(inv.id)}
                        itemLabel="this invoice"
                      />
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground flex justify-between">
        <span>{filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}{filteredInvoices.length !== invoices.length ? ` (of ${invoices.length})` : ""}</span>
        <span className="font-medium text-foreground">
          Total: ${filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <InvoiceEditDialog
        invoice={editingInvoice}
        open={!!editingInvoice}
        onOpenChange={(open) => { if (!open) setEditingInvoice(null); }}
        projects={projects}
        vendors={vendors}
        costCodes={costCodes}
        onSave={onUpdate}
        onUpdateStatus={onUpdateStatus}
      />
    </div>
  );
}
