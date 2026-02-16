"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ExportDialog } from "@/components/shared/export-dialog";
import type { ExportColumnDef, ExportConfig } from "@/components/shared/export-dialog";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl } from "@/lib/export/pdf";
import { attachmentCSVColumns, attachmentPDFColumns, attachmentPDFRows } from "@/lib/export/columns";

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

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────

interface AttachmentsTableProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[] | ((prev: Attachment[]) => Attachment[])) => void;
}

export function AttachmentsTable({
  attachments: attachmentList,
  onAttachmentsChange,
}: AttachmentsTableProps) {
  const [unlockedIds, setUnlockedIds] = React.useState<Set<string>>(
    new Set()
  );

  // ── Filter state ──
  const [categoryFilter, setCategoryFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(
    new Set()
  );

  // Filter option arrays
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

  const addAttachment = React.useCallback(() => {
    onAttachmentsChange((prev) => [...prev, newBlankAttachment()]);
  }, [onAttachmentsChange]);

  const unlockRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlockedIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={addAttachment}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Attachment
        </Button>
        <AttachmentsExport attachments={filteredAttachments} />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[120px] text-xs font-semibold px-3">
                  Attachment #
                </TableHead>
                <TableHead className="w-[220px] text-xs font-semibold px-3">
                  Name
                </TableHead>
                <TableHead className="w-[160px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Category"
                    options={categoryOptions}
                    selected={categoryFilter}
                    onChange={setCategoryFilter}
                  />
                </TableHead>
                <TableHead className="w-[130px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Status"
                    options={statusOptions}
                    selected={statusFilter}
                    onChange={setStatusFilter}
                  />
                </TableHead>
                <TableHead className="w-[50px] text-xs font-semibold px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttachments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No attachments match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredAttachments.map((att) => {
                const isRetired =
                  att.status === "retired" && !unlockedIds.has(att.id);

                return (
                  <TableRow
                    key={att.id}
                    className={`group h-[36px] ${
                      isRetired ? "bg-gray-50/30" : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Attachment # */}
                    <TableCell className="text-xs p-0 px-1">
                      {isRetired ? (
                        <span className="px-2 text-muted-foreground font-medium">
                          {att.number}
                        </span>
                      ) : (
                        <CellInput
                          value={att.number}
                          onChange={(v) =>
                            updateAttachment(att.id, "number", v)
                          }
                          placeholder="e.g. AT-008"
                        />
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {att.name}
                        </span>
                      ) : (
                        <CellInput
                          value={att.name}
                          onChange={(v) =>
                            updateAttachment(att.id, "name", v)
                          }
                          placeholder="Attachment name"
                        />
                      )}
                    </TableCell>

                    {/* Category */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {att.category}
                        </span>
                      ) : (
                        <CellInput
                          value={att.category}
                          onChange={(v) =>
                            updateAttachment(att.id, "category", v)
                          }
                          placeholder="e.g. Bucket"
                        />
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium capitalize ${statusColors[att.status]}`}
                        >
                          {statusLabels[att.status]}
                        </Badge>
                      ) : (
                        <CellSelect
                          value={att.status}
                          onChange={(v) =>
                            updateAttachment(att.id, "status", v)
                          }
                          options={statusOptions}
                          placeholder="Status"
                        />
                      )}
                    </TableCell>

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

      {/* Summary footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          {filteredAttachments.length} of {attachmentList.length} attachments
        </span>
        <span className="font-medium text-foreground">
          {attachmentList.filter((a) => a.status === "available").length}{" "}
          available
        </span>
      </div>
    </div>
  );
}

// ── Export sub-component ──
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

function AttachmentsExport({ attachments }: { attachments: Attachment[] }) {
  const { profile } = useCompanyProfile();

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(attachments, attachmentCSVColumns, filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(attachments, attachmentCSVColumns, filename, config.selectedColumns);
    } else {
      generatePDF({
        title: config.title,
        filename,
        company: profile,
        columns: attachmentPDFColumns,
        rows: attachmentPDFRows(attachments),
        orientation: config.orientation,
        selectedColumns: config.selectedColumns,
        groupBy: config.groupBy,
      });
    }
  };

  const handlePreview = (config: ExportConfig) =>
    generatePDFBlobUrl({
      title: config.title,
      filename: "preview",
      company: profile,
      columns: attachmentPDFColumns,
      rows: attachmentPDFRows(attachments),
      orientation: config.orientation,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
    });

  return (
    <ExportDialog
      columns={ATTACHMENT_EXPORT_COLUMNS}
      groupOptions={ATTACHMENT_GROUP_OPTIONS}
      defaultTitle="Attachments"
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={attachments.length === 0}
      recordCount={attachments.length}
    />
  );
}
