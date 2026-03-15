"use client";

import * as React from "react";
import { Plus, Pencil, X, Download, Trash2 } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ExportDialog, type ExportColumnDef, type ExportConfig } from "@/components/shared/export-dialog";
import { attachmentCSVColumns, attachmentPDFColumns, attachmentPDFRows } from "@/lib/export/columns";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl } from "@/lib/export/pdf";
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
import { CellInput } from "@/components/shared/cell-input";
import { CellSelect } from "@/components/shared/cell-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ColumnFilter } from "@/components/time-tracking/column-filter";

import {
  type Attachment,
  type AttachmentStatus,
} from "@/lib/types/time-tracking";
import { useRelockOnClickOutside } from "@/hooks/use-relock-on-click-outside";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

import { attachmentStatusColors as statusColors } from "@/lib/constants/status-colors";

const statusLabels: Record<AttachmentStatus, string> = {
  available: "Available",
  "in-use": "In Use",
  retired: "Retired",
};

function newBlankAttachment(): Attachment {
  return {
    id: `att-${crypto.randomUUID().slice(0, 8)}`,
    number: "",
    name: "",
    category: "",
    status: "available",
  };
}

// ── Column definitions for settings ──
const ATTACHMENT_COLUMN_DEFS: ColumnDef[] = [
  { id: "number", label: "Attachment #" },
  { id: "name", label: "Name" },
  { id: "category", label: "Category" },
  { id: "status", label: "Status" },
];

// ── Export column definitions ──
const ATTACHMENT_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "number", header: "Number" },
  { id: "name", header: "Name" },
  { id: "category", header: "Category" },
  { id: "status", header: "Status" },
];

const ATTACHMENT_GROUP_OPTIONS = [
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
];

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────

interface AttachmentsTableProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[] | ((prev: Attachment[]) => Attachment[])) => void;
  categoryOptions?: { id: string; label: string }[];
}

export function AttachmentsTable({
  attachments: attachmentList,
  onAttachmentsChange,
  categoryOptions: categoryOptionsProp,
}: AttachmentsTableProps) {
  const [unlockedIds, setUnlockedIds] = React.useState<Set<string>>(
    new Set()
  );

  // ── Column settings ──
  const { columns, toggleColumn, reorderColumns, isVisible, reset: resetColumns } =
    useTableColumns("attachments-columns", ATTACHMENT_COLUMN_DEFS);

  // ── Row selection ──
  const {
    selected,
    count: selectedCount,
    isSelected,
    toggle: toggleSelection,
    selectAll,
    deselectAll,
    allSelected,
    someSelected,
  } = useRowSelection();

  // ── Export ──
  const { profile } = useCompanyProfile();
  const [exportOpen, setExportOpen] = React.useState(false);

  // ── Filter state ──
  const [categoryFilter, setCategoryFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(
    new Set()
  );

  // Filter option arrays
  const categorySelectOptions = React.useMemo(() => {
    if (categoryOptionsProp && categoryOptionsProp.length > 0) return categoryOptionsProp;
    const cats = Array.from(
      new Set(attachmentList.map((a) => a.category).filter(Boolean))
    ).sort();
    return cats.map((c) => ({ id: c, label: c }));
  }, [attachmentList, categoryOptionsProp]);

  const categoryOptions = React.useMemo(() => {
    const cats = Array.from(
      new Set(attachmentList.map((a) => a.category).filter(Boolean))
    ).sort();
    return cats.map((c) => ({ id: c, label: c }));
  }, [attachmentList]);

  const statusOptions = (
    ["available", "in-use", "retired"] as AttachmentStatus[]
  ).map((s) => ({ id: s, label: statusLabels[s] }));

  // ── Filtered attachments ──
  const filteredAttachments = React.useMemo(() => {
    return attachmentList.filter((att) => {
      if (categoryFilter.size > 0 && !categoryFilter.has(att.category))
        return false;
      if (statusFilter.size > 0 && !statusFilter.has(att.status)) return false;
      return true;
    });
  }, [attachmentList, categoryFilter, statusFilter]);

  // ── Pagination ──
  const { paginatedData, pageSize, setPageSize, totalItems } =
    useTablePagination(filteredAttachments);

  // ── Export callbacks ──
  const handleExport = React.useCallback(
    (config: ExportConfig) => {
      const datestamp = new Date().toISOString().slice(0, 10);
      const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;
      if (config.format === "excel") {
        exportToExcel(filteredAttachments, attachmentCSVColumns, filename, config.selectedColumns);
      } else if (config.format === "csv") {
        exportToCSV(filteredAttachments, attachmentCSVColumns, filename, config.selectedColumns);
      } else {
        generatePDF({
          title: config.title,
          filename,
          company: profile,
          columns: attachmentPDFColumns,
          rows: attachmentPDFRows(filteredAttachments),
          orientation: config.orientation,
          selectedColumns: config.selectedColumns,
          groupBy: config.groupBy,
        });
      }
    },
    [filteredAttachments, profile]
  );

  const handlePreview = React.useCallback(
    (config: ExportConfig) =>
      generatePDFBlobUrl({
        title: config.title,
        filename: "preview",
        company: profile,
        columns: attachmentPDFColumns,
        rows: attachmentPDFRows(filteredAttachments),
        orientation: config.orientation,
        selectedColumns: config.selectedColumns,
        groupBy: config.groupBy,
      }),
    [filteredAttachments, profile]
  );

  const handleBulkDelete = React.useCallback(() => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} attachment(s)?`)) return;
    onAttachmentsChange((prev) => prev.filter((a) => !selected.has(a.id)));
    deselectAll();
  }, [selected, onAttachmentsChange, deselectAll]);

  const tableActions: TableAction[] = React.useMemo(
    () => [
      {
        label: "Export",
        icon: <Download className="h-3.5 w-3.5" />,
        onClick: () => setExportOpen(true),
        alwaysEnabled: true,
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        onClick: handleBulkDelete,
        destructive: true,
        separatorBefore: true,
      },
    ],
    [handleBulkDelete]
  );

  // ── Mutations ──
  const updateAttachment = React.useCallback(
    (id: string, field: keyof Attachment, value: string) => {
      onAttachmentsChange((prev) =>
        prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
      );
    },
    [onAttachmentsChange]
  );

  const deleteAttachment = React.useCallback(
    (id: string) => {
      onAttachmentsChange((prev) => prev.filter((a) => a.id !== id));
    },
    [onAttachmentsChange]
  );

  // ── Add form state ──
  const [adding, setAdding] = React.useState(false);
  const [newForm, setNewForm] = React.useState({ number: "", name: "", category: "", status: "available" as AttachmentStatus });

  const handleAddSubmit = React.useCallback(() => {
    if (!newForm.name.trim()) return;
    const att: Attachment = {
      id: `att-${crypto.randomUUID().slice(0, 8)}`,
      number: newForm.number.trim(),
      name: newForm.name.trim(),
      category: newForm.category.trim(),
      status: newForm.status,
    };
    onAttachmentsChange((prev) => [...prev, att]);
    setAdding(false);
    setNewForm({ number: "", name: "", category: "", status: "available" });
  }, [newForm, onAttachmentsChange]);

  const { unlockRow } = useRelockOnClickOutside(attachmentList, unlockedIds, setUnlockedIds);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Attachment
        </Button>
        <div className="flex items-center gap-2">
          <ColumnSettings
            columns={columns}
            onToggle={toggleColumn}
            onReorder={reorderColumns}
            onReset={resetColumns}
          />
          <TableActions actions={tableActions} selectedCount={selectedCount} />
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                  <TableHead className="w-[120px] text-xs font-semibold px-3">Attachment #</TableHead>
                  <TableHead className="w-[220px] text-xs font-semibold px-3">Name</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold px-3">Category</TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold px-3">Status</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold px-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-[36px] hover:bg-muted/20">
                  <TableCell className="p-0 px-1">
                    <CellInput value={newForm.number} onChange={(v) => setNewForm((f) => ({ ...f, number: v }))} placeholder="e.g. AT-008" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellInput value={newForm.name} onChange={(v) => setNewForm((f) => ({ ...f, name: v }))} placeholder="Attachment name" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellSelect value={newForm.category} onChange={(v) => setNewForm((f) => ({ ...f, category: v }))} options={categorySelectOptions} placeholder="Category" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellSelect value={newForm.status} onChange={(v) => setNewForm((f) => ({ ...f, status: v as AttachmentStatus }))} options={statusOptions} placeholder="Status" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <div className="flex items-center gap-1">
                      <Button size="sm" className="h-7 text-xs cursor-pointer px-3" onClick={handleAddSubmit} disabled={!newForm.name.trim()}>Add</Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 cursor-pointer p-0" onClick={() => { setAdding(false); setNewForm({ number: "", name: "", category: "", status: "available" }); }}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[40px] px-3">
                  <Checkbox
                    checked={
                      paginatedData.length > 0 &&
                      allSelected(paginatedData.map((a) => a.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) selectAll(paginatedData.map((a) => a.id));
                      else deselectAll();
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                {columns.filter((c) => c.visible).map((col) => {
                  switch (col.id) {
                    case "number":
                      return <TableHead key="number" className="w-[120px] text-xs font-semibold px-3">Attachment #</TableHead>;
                    case "name":
                      return <TableHead key="name" className="w-[220px] text-xs font-semibold px-3">Name</TableHead>;
                    case "category":
                      return (
                        <TableHead key="category" className="w-[160px] text-xs font-semibold px-3">
                          <ColumnFilter title="Category" options={categoryOptions} selected={categoryFilter} onChange={setCategoryFilter} />
                        </TableHead>
                      );
                    case "status":
                      return (
                        <TableHead key="status" className="w-[130px] text-xs font-semibold px-3">
                          <ColumnFilter title="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
                        </TableHead>
                      );
                    default:
                      return null;
                  }
                })}
                <TableHead className="w-[50px] text-xs font-semibold px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttachments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.filter(c => c.visible).length + 2}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No attachments match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {paginatedData.map((att) => {
                const isRetired =
                  att.status === "retired" && !unlockedIds.has(att.id);

                return (
                  <TableRow
                    key={att.id}
                    data-row-id={att.id}
                    className={`group h-[36px] ${
                      isRetired ? "bg-gray-50/30" : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Checkbox */}
                    <TableCell className="px-3">
                      <Checkbox
                        checked={isSelected(att.id)}
                        onCheckedChange={() => toggleSelection(att.id)}
                        aria-label={`Select ${att.name}`}
                      />
                    </TableCell>

                    {columns.filter((c) => c.visible).map((col) => {
                      switch (col.id) {
                        case "number":
                          return (
                            <TableCell key="number" className="text-xs p-0 px-1">
                              {isRetired ? (
                                <span className="px-2 text-muted-foreground font-medium">{att.number}</span>
                              ) : (
                                <CellInput value={att.number} onChange={(v) => updateAttachment(att.id, "number", v)} placeholder="e.g. AT-008" />
                              )}
                            </TableCell>
                          );
                        case "name":
                          return (
                            <TableCell key="name" className="p-0 px-1">
                              {isRetired ? (
                                <span className="text-xs px-2 text-muted-foreground">{att.name}</span>
                              ) : (
                                <CellInput value={att.name} onChange={(v) => updateAttachment(att.id, "name", v)} placeholder="Attachment name" />
                              )}
                            </TableCell>
                          );
                        case "category":
                          return (
                            <TableCell key="category" className="p-0 px-1">
                              {isRetired ? (
                                <span className="text-xs px-2 text-muted-foreground">{att.category}</span>
                              ) : (
                                <CellSelect value={att.category} onChange={(v) => updateAttachment(att.id, "category", v)} options={categorySelectOptions} placeholder="Category" />
                              )}
                            </TableCell>
                          );
                        case "status":
                          return (
                            <TableCell key="status" className="p-0 px-1">
                              {isRetired ? (
                                <Badge variant="outline" className={`text-[10px] font-medium capitalize ${statusColors[att.status]}`}>
                                  {statusLabels[att.status]}
                                </Badge>
                              ) : (
                                <CellSelect value={att.status} onChange={(v) => updateAttachment(att.id, "status", v)} options={statusOptions} placeholder="Status" />
                              )}
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}

                    {/* Actions */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => unlockRow(att.id, e)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Edit retired attachment</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <DeleteConfirmButton
                            onConfirm={() => deleteAttachment(att.id)}
                            itemLabel="this attachment"
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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

      {/* Export Dialog */}
      <ExportDialog
        columns={ATTACHMENT_EXPORT_COLUMNS}
        groupOptions={ATTACHMENT_GROUP_OPTIONS}
        defaultTitle="Attachments"
        onExport={handleExport}
        onGeneratePDFPreview={handlePreview}
        controlledOpen={exportOpen}
        onControlledOpenChange={setExportOpen}
        trigger={null}
      />
    </div>
  );
}
