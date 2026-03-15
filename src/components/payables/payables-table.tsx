"use client";

import * as React from "react";
import { FileText, Pencil, MessageSquare, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";

import { ColumnFilter } from "@/components/time-tracking/column-filter";
import { DateColumnFilter } from "@/components/time-tracking/date-column-filter";
import { useTableColumns, type ColumnDef } from "@/hooks/use-table-columns";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { ColumnSettings } from "@/components/shared/column-settings";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";
import { TableActions, type TableAction } from "@/components/shared/table-actions";
import { Checkbox } from "@/components/ui/checkbox";
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

// ── Column definitions for settings ──
const PAYABLE_COLUMN_DEFS: ColumnDef[] = [
  { id: "date", label: "Date", alwaysVisible: true },
  { id: "project", label: "Project" },
  { id: "vendor", label: "Vendor" },
  { id: "amount", label: "Amount" },
  { id: "costCode", label: "Cost Code" },
  { id: "billingType", label: "Billing Type" },
  { id: "status", label: "Status" },
  { id: "file", label: "File" },
  { id: "note", label: "Note" },
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

  // ── Column settings ──
  const { columns, toggleColumn, reorderColumns, reset: resetColumns } =
    useTableColumns("payables-columns", PAYABLE_COLUMN_DEFS);

  // ── Row selection ──
  const {
    selected,
    count: selectedCount,
    isSelected,
    toggle: toggleSelection,
    selectAll,
    deselectAll,
    allSelected,
  } = useRowSelection();

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

  // ── Pagination ──
  const { paginatedData, pageSize, setPageSize, totalItems } =
    useTablePagination(filteredInvoices);

  // ── Table actions ──
  const handleBulkDelete = React.useCallback(() => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} payable(s)?`)) return;
    for (const id of selected) onDelete(id);
    deselectAll();
  }, [selected, onDelete, deselectAll]);

  const tableActions: TableAction[] = React.useMemo(
    () => [
      {
        label: "Delete",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        onClick: handleBulkDelete,
        destructive: true,
      },
    ],
    [handleBulkDelete]
  );

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <ColumnSettings columns={columns} onToggle={toggleColumn} onReorder={reorderColumns} onReset={resetColumns} />
        <TableActions actions={tableActions} selectedCount={selectedCount} />
      </div>

    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
              <TableHead className="w-[40px] px-3">
                <Checkbox
                  checked={paginatedData.length > 0 && allSelected(paginatedData.map((i) => i.id))}
                  onCheckedChange={(checked) => { if (checked) selectAll(paginatedData.map((i) => i.id)); else deselectAll(); }}
                  aria-label="Select all"
                />
              </TableHead>
              {columns.filter((c) => c.visible).map((col) => {
                switch (col.id) {
                  case "date":
                    return <TableHead key="date" className="w-[120px] px-3"><DateColumnFilter dateRange={dateRange} onDateRangeChange={setDateRange} /></TableHead>;
                  case "project":
                    return <TableHead key="project" className="w-[200px] px-3"><ColumnFilter title="Project" options={projectOptions} selected={projectFilter} onChange={setProjectFilter} /></TableHead>;
                  case "vendor":
                    return <TableHead key="vendor" className="w-[180px] px-3"><ColumnFilter title="Vendor" options={vendorOptions} selected={vendorFilter} onChange={setVendorFilter} /></TableHead>;
                  case "amount":
                    return <TableHead key="amount" className="w-[110px] text-xs font-semibold px-3">Amount</TableHead>;
                  case "costCode":
                    return <TableHead key="costCode" className="w-[130px] px-3"><ColumnFilter title="Cost Code" options={costCodeOptions} selected={costCodeFilter} onChange={setCostCodeFilter} /></TableHead>;
                  case "billingType":
                    return <TableHead key="billingType" className="w-[120px] px-3"><ColumnFilter title="Billing Type" options={billingTypeOptions} selected={billingTypeFilter} onChange={setBillingTypeFilter} /></TableHead>;
                  case "status":
                    return <TableHead key="status" className="w-[140px] text-xs font-semibold px-3">Status</TableHead>;
                  case "file":
                    return <TableHead key="file" className="w-[60px] text-xs font-semibold px-3">File</TableHead>;
                  case "note":
                    return <TableHead key="note" className="w-[50px] text-xs font-semibold px-3">Note</TableHead>;
                  default:
                    return null;
                }
              })}
              <TableHead className="w-[100px] text-xs font-semibold px-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.filter(c => c.visible).length + 2} className="h-32 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((inv) => {
                const isReview = inv.status === "needs-review";
                return (
                <TableRow
                  key={inv.id}
                  className="h-[36px] group"
                >
                  {/* Checkbox */}
                  <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected(inv.id)}
                      onCheckedChange={() => toggleSelection(inv.id)}
                      aria-label="Select invoice"
                    />
                  </TableCell>

                  {columns.filter((c) => c.visible).map((col) => {
                    switch (col.id) {
                      case "date":
                        return (
                          <TableCell key="date" className="p-0 px-1">
                    {isReview ? (
                      <CellInput type="date" value={inv.date} onChange={(v) => onUpdate(inv.id, { date: v })} />
                    ) : (
                      <span className="text-xs px-2">{format(parseISO(inv.date), "MM/dd/yyyy")}</span>
                    )}
                          </TableCell>
                        );
                      case "project":
                        return (
                          <TableCell key="project" className="p-0 px-1">
                    {isReview ? (
                      <CellSelect value={inv.projectId} onChange={(v) => onUpdate(inv.id, { projectId: v })} options={projectOptions} placeholder="Project" />
                    ) : (
                      <span className="text-xs px-2 font-medium">{projectMap[inv.projectId] ?? "—"}</span>
                    )}
                          </TableCell>
                        );
                      case "vendor":
                        return (
                          <TableCell key="vendor" className="p-0 px-1">
                    {isReview ? (
                      <CellSelect value={inv.vendorId} onChange={(v) => onUpdate(inv.id, { vendorId: v })} options={vendorOptions} placeholder="Vendor" />
                    ) : (
                      <span className="text-xs px-2">{vendorMap[inv.vendorId] ?? "—"}</span>
                    )}
                          </TableCell>
                        );
                      case "amount":
                        return (
                          <TableCell key="amount" className="p-0 px-1">
                    {isReview ? (
                      <CellInput type="number" value={inv.amount} onChange={(v) => { const n = parseFloat(v); if (!isNaN(n)) onUpdate(inv.id, { amount: n }); }} placeholder="0.00" />
                    ) : (
                      <span className="text-xs px-2 font-medium">${inv.amount.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                          </TableCell>
                        );
                      case "costCode":
                        return (
                          <TableCell key="costCode" className="p-0 px-1">
                    {isReview ? (
                      <CellSelect value={inv.costCodeId ?? ""} onChange={(v) => onUpdate(inv.id, { costCodeId: v || undefined })} options={costCodeOptions} placeholder="Cost Code" />
                    ) : (
                      <span className="text-xs px-2 text-muted-foreground">{inv.costCodeId ? costCodeMap[inv.costCodeId] ?? "—" : "—"}</span>
                    )}
                          </TableCell>
                        );
                      case "billingType":
                        return (
                          <TableCell key="billingType" className="p-0 px-1">
                    {isReview ? (
                      <CellSelect value={inv.billingType ?? ""} onChange={(v) => onUpdate(inv.id, { billingType: v || undefined } as Partial<Invoice>)} options={billingTypeOptions} placeholder="Billing Type" />
                    ) : (
                      <span className="text-xs px-2 text-muted-foreground">{inv.billingType === "tm" ? "T&M" : inv.billingType === "lump-sum" ? "Lump Sum" : "—"}</span>
                    )}
                          </TableCell>
                        );
                      case "status":
                        return (
                          <TableCell key="status" className="p-0 px-1">
                    {isReview ? (
                      <CellSelect value={inv.status} onChange={(v) => onUpdateStatus(inv.id, v as InvoiceStatus)} options={statusOptions} placeholder="Status" />
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
                        );
                      case "file":
                        return (
                          <TableCell key="file" className="px-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
                          <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer"><FileText className="h-3.5 w-3.5" /></a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">Open PDF: {inv.fileName}</p></TooltipContent>
                    </Tooltip>
                          </TableCell>
                        );
                      case "note":
                        return (
                          <TableCell key="note" className="px-1">
                    <NotePopover note={inv.notes} onSave={(note) => onUpdate(inv.id, { notes: note || undefined } as Partial<Invoice>)} />
                          </TableCell>
                        );
                      default:
                        return null;
                    }
                  })}

                  {/* Actions */}
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
      </div>

      {/* Pagination footer */}
      <TablePaginationBar
        selectedCount={selectedCount}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

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
