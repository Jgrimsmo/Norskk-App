"use client";

import * as React from "react";
import { FileText, Pencil, MessageSquare } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { InvoiceEditDialog } from "@/components/payables/invoice-edit-dialog";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
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

const statusColors: Record<InvoiceStatus, string> = {
  "needs-review": "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

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

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
              <TableHead className="w-[120px] text-xs font-semibold px-3">Date</TableHead>
              <TableHead className="w-[200px] text-xs font-semibold px-3">Project</TableHead>
              <TableHead className="w-[180px] text-xs font-semibold px-3">Vendor</TableHead>
              <TableHead className="w-[110px] text-xs font-semibold px-3">Amount</TableHead>
              <TableHead className="w-[130px] text-xs font-semibold px-3">Cost Code</TableHead>
              <TableHead className="w-[120px] text-xs font-semibold px-3">Billing Type</TableHead>
              <TableHead className="w-[140px] text-xs font-semibold px-3">Status</TableHead>
              <TableHead className="w-[60px] text-xs font-semibold px-3">File</TableHead>
              <TableHead className="w-[50px] text-xs font-semibold px-3">Note</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold px-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id} className="group">
                  <TableCell className="text-xs px-3">{inv.date}</TableCell>
                  <TableCell className="text-xs px-3 font-medium">
                    {projectMap[inv.projectId] ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs px-3">
                    {vendorMap[inv.vendorId] ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs px-3 font-medium">
                    ${inv.amount.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs px-3 text-muted-foreground">
                    {inv.costCodeId ? costCodeMap[inv.costCodeId] ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-xs px-3 text-muted-foreground">
                    {inv.billingType === "tm" ? "T&M" : inv.billingType === "lump-sum" ? "Lump Sum" : "—"}
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <div>
                      <CellSelect
                        value={inv.status}
                        onChange={(v) => onUpdateStatus(inv.id, v as InvoiceStatus)}
                        options={statusOptions}
                        placeholder="Status"
                      />
                      {inv.status === "approved" && inv.approvedBy && (
                        <p className="px-2 pb-1 text-[10px] leading-tight text-muted-foreground">
                          {inv.approvedBy}
                          {inv.approvedAt && <> · {new Date(inv.approvedAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>}
                        </p>
                      )}
                      {inv.status === "rejected" && inv.rejectedBy && (
                        <p className="px-2 pb-1 text-[10px] leading-tight text-muted-foreground">
                          {inv.rejectedBy}
                          {inv.rejectedAt && <> · {new Date(inv.rejectedAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>}
                        </p>
                      )}
                    </div>
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
                            className="h-7 w-7 text-amber-500 hover:text-amber-700 hover:bg-amber-50"
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground flex justify-between">
        <span>{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
        <span className="font-medium text-foreground">
          Total: ${invoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      />
    </div>
  );
}
