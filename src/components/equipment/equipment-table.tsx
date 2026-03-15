"use client";

import * as React from "react";
import { Plus, Pencil, X, Check, Download, Trash2 } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { EquipmentDetailSheet } from "@/components/equipment/equipment-detail-sheet";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { ExportDialog, type ExportColumnDef, type ExportConfig } from "@/components/shared/export-dialog";
import { equipmentCSVColumns, equipmentPDFColumns, equipmentPDFRows } from "@/lib/export/columns";
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
  type Equipment,
  type EquipmentStatus,
} from "@/lib/types/time-tracking";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

import { equipmentStatusColors as statusColors } from "@/lib/constants/status-colors";

const statusLabels: Record<EquipmentStatus, string> = {
  available: "Available",
  "in-use": "In Use",
  maintenance: "Maintenance",
  rental: "Rental",
  retired: "Retired",
};

function newBlankEquipment(): Equipment {
  return {
    id: `eq-${crypto.randomUUID().slice(0, 8)}`,
    number: "",
    name: "",
    category: "",
    lastServiceHours: "",
    status: "available",
  };
}

// ── Column definitions for settings ──
const EQUIPMENT_COLUMN_DEFS: ColumnDef[] = [
  { id: "number", label: "Equipment #" },
  { id: "name", label: "Name" },
  { id: "category", label: "Category" },
  { id: "lastService", label: "Last Service" },
  { id: "status", label: "Status" },
];

// ── Export column definitions ──
const EQUIPMENT_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "number", header: "Number" },
  { id: "name", header: "Name" },
  { id: "category", header: "Category" },
  { id: "lastServiceHours", header: "Last Service" },
  { id: "status", header: "Status" },
];

const EQUIPMENT_GROUP_OPTIONS = [
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
];

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────

interface EquipmentTableProps {
  equipment: Equipment[];
  onEquipmentChange: (equipment: Equipment[] | ((prev: Equipment[]) => Equipment[])) => void;
  categoryOptions?: { id: string; label: string }[];
}

export function EquipmentTable({
  equipment: equipmentList,
  onEquipmentChange,
  categoryOptions: categoryOptionsProp,
}: EquipmentTableProps) {
  const [unlockedIds, setUnlockedIds] = React.useState<Set<string>>(
    new Set()
  );

  // ── Detail sheet state ──
  const [selectedEqId, setSelectedEqId] = React.useState<string | null>(null);
  const selectedEquipment = React.useMemo(
    () => equipmentList.find((e) => e.id === selectedEqId) ?? null,
    [equipmentList, selectedEqId]
  );

  const handleDetailUpdate = React.useCallback(
    (id: string, patch: Partial<Equipment>) => {
      onEquipmentChange((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    [onEquipmentChange]
  );

  // ── Column settings ──
  const { columns, toggleColumn, reorderColumns, isVisible, reset: resetColumns } =
    useTableColumns("equipment-columns", EQUIPMENT_COLUMN_DEFS);

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
      new Set(
        equipmentList
          .map((e) => e.category)
          .filter((c) => c && c !== "—")
      )
    ).sort();
    return cats.map((c) => ({ id: c, label: c }));
  }, [equipmentList, categoryOptionsProp]);

  const categoryOptions = React.useMemo(() => {
    const cats = Array.from(
      new Set(
        equipmentList
          .map((e) => e.category)
          .filter((c) => c && c !== "—")
      )
    ).sort();
    return cats.map((c) => ({ id: c, label: c }));
  }, [equipmentList]);

  const statusOptions = (
    ["available", "in-use", "maintenance", "rental", "retired"] as EquipmentStatus[]
  ).map((s) => ({ id: s, label: statusLabels[s] }));

  // ── Filtered equipment ──
  const filteredEquipment = React.useMemo(() => {
    return equipmentList.filter((eq) => {
      if (eq.id === EQUIPMENT_NONE_ID) return false; // hide the "None" placeholder
      if (categoryFilter.size > 0 && !categoryFilter.has(eq.category))
        return false;
      if (statusFilter.size > 0 && !statusFilter.has(eq.status)) return false;
      return true;
    });
  }, [equipmentList, categoryFilter, statusFilter]);

  // ── Pagination ──
  const { paginatedData, pageSize, setPageSize, totalItems } =
    useTablePagination(filteredEquipment);

  // ── Export callbacks ──
  const handleExport = React.useCallback(
    (config: ExportConfig) => {
      const datestamp = new Date().toISOString().slice(0, 10);
      const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;
      if (config.format === "excel") {
        exportToExcel(filteredEquipment, equipmentCSVColumns, filename, config.selectedColumns);
      } else if (config.format === "csv") {
        exportToCSV(filteredEquipment, equipmentCSVColumns, filename, config.selectedColumns);
      } else {
        generatePDF({
          title: config.title,
          filename,
          company: profile,
          columns: equipmentPDFColumns,
          rows: equipmentPDFRows(filteredEquipment),
          orientation: config.orientation,
          selectedColumns: config.selectedColumns,
          groupBy: config.groupBy,
        });
      }
    },
    [filteredEquipment, profile]
  );

  const handlePreview = React.useCallback(
    (config: ExportConfig) =>
      generatePDFBlobUrl({
        title: config.title,
        filename: "preview",
        company: profile,
        columns: equipmentPDFColumns,
        rows: equipmentPDFRows(filteredEquipment),
        orientation: config.orientation,
        selectedColumns: config.selectedColumns,
        groupBy: config.groupBy,
      }),
    [filteredEquipment, profile]
  );

  const handleBulkDelete = React.useCallback(() => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} equipment item(s)?`)) return;
    onEquipmentChange((prev) => prev.filter((e) => !selected.has(e.id)));
    deselectAll();
  }, [selected, onEquipmentChange, deselectAll]);

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
  const updateEquipment = React.useCallback(
    (id: string, field: keyof Equipment, value: string) => {
      onEquipmentChange((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
    },
    [onEquipmentChange]
  );

  const deleteEquipment = React.useCallback(
    (id: string) => {
      onEquipmentChange((prev) => prev.filter((eq) => eq.id !== id));
    },
    [onEquipmentChange]
  );

  // ── Add form state ──
  const [adding, setAdding] = React.useState(false);
  const [newForm, setNewForm] = React.useState({ number: "", name: "", category: "", lastServiceHours: "", status: "available" as EquipmentStatus });

  const handleAddSubmit = React.useCallback(() => {
    if (!newForm.name.trim()) return;
    const eq: Equipment = {
      id: `eq-${crypto.randomUUID().slice(0, 8)}`,
      number: newForm.number.trim(),
      name: newForm.name.trim(),
      category: newForm.category.trim(),
      lastServiceHours: newForm.lastServiceHours.trim(),
      status: newForm.status,
    };
    onEquipmentChange((prev) => [...prev, eq]);
    setAdding(false);
    setNewForm({ number: "", name: "", category: "", lastServiceHours: "", status: "available" });
  }, [newForm, onEquipmentChange]);

  const unlockRow = (id: string) => {
    setUnlockedIds((prev) => new Set(prev).add(id));
  };

  const lockRow = (id: string) => {
    setUnlockedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

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
          Add Equipment
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
                  <TableHead className="w-[120px] text-xs font-semibold px-3">Equipment #</TableHead>
                  <TableHead className="w-[220px] text-xs font-semibold px-3">Name</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold px-3">Category</TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold px-3">Status</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold px-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-[36px] hover:bg-muted/20">
                  <TableCell className="p-0 px-1">
                    <CellInput value={newForm.number} onChange={(v) => setNewForm((f) => ({ ...f, number: v }))} placeholder="e.g. EQ-008" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellInput value={newForm.name} onChange={(v) => setNewForm((f) => ({ ...f, name: v }))} placeholder="Equipment name" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellSelect value={newForm.category} onChange={(v) => setNewForm((f) => ({ ...f, category: v }))} options={categorySelectOptions} placeholder="Category" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellSelect value={newForm.status} onChange={(v) => setNewForm((f) => ({ ...f, status: v as EquipmentStatus }))} options={statusOptions} placeholder="Status" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <div className="flex items-center gap-1">
                      <Button size="sm" className="h-7 text-xs cursor-pointer px-3" onClick={handleAddSubmit} disabled={!newForm.name.trim()}>Add</Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 cursor-pointer p-0" onClick={() => { setAdding(false); setNewForm({ number: "", name: "", category: "", lastServiceHours: "", status: "available" }); }}><X className="h-3.5 w-3.5" /></Button>
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
                      allSelected(paginatedData.map((e) => e.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) selectAll(paginatedData.map((e) => e.id));
                      else deselectAll();
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                {columns.filter((c) => c.visible).map((col) => {
                  switch (col.id) {
                    case "number":
                      return <TableHead key="number" className="w-[120px] text-xs font-semibold px-3">Equipment #</TableHead>;
                    case "name":
                      return <TableHead key="name" className="w-[220px] text-xs font-semibold px-3">Name</TableHead>;
                    case "category":
                      return (
                        <TableHead key="category" className="w-[160px] text-xs font-semibold px-3">
                          <ColumnFilter title="Category" options={categoryOptions} selected={categoryFilter} onChange={setCategoryFilter} />
                        </TableHead>
                      );
                    case "lastService":
                      return <TableHead key="lastService" className="w-[120px] text-xs font-semibold px-3">Last Service</TableHead>;
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
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.filter((c) => c.visible).length + 2}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No equipment matches the current filters.
                  </TableCell>
                </TableRow>
              )}
              {paginatedData.map((eq) => {
                const isLocked = !unlockedIds.has(eq.id);

                return (
                  <TableRow
                    key={eq.id}
                    data-row-id={eq.id}
                    className={`group h-[36px] ${
                      isLocked ? "" : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Checkbox */}
                    <TableCell className="p-0 px-3">
                      <Checkbox
                        checked={isSelected(eq.id)}
                        onCheckedChange={() => toggleSelection(eq.id)}
                        aria-label={`Select ${eq.name}`}
                      />
                    </TableCell>

                    {columns.filter((c) => c.visible).map((col) => {
                      switch (col.id) {
                        case "number":
                          return (
                            <TableCell key="number" className="text-xs p-0 px-1">
                              {isLocked ? (
                                <span className="px-2 text-muted-foreground font-medium">{eq.number}</span>
                              ) : (
                                <CellInput value={eq.number} onChange={(v) => updateEquipment(eq.id, "number", v)} placeholder="e.g. EQ-008" />
                              )}
                            </TableCell>
                          );
                        case "name":
                          return (
                            <TableCell key="name" className="p-0 px-1">
                              {isLocked ? (
                                <button
                                  className="text-xs px-2 font-medium text-foreground hover:text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-left transition-colors"
                                  onClick={() => setSelectedEqId(eq.id)}
                                >
                                  {eq.name}
                                </button>
                              ) : (
                                <CellInput value={eq.name} onChange={(v) => updateEquipment(eq.id, "name", v)} placeholder="Equipment name" />
                              )}
                            </TableCell>
                          );
                        case "category":
                          return (
                            <TableCell key="category" className="p-0 px-1">
                              {isLocked ? (
                                <span className="text-xs px-2 text-muted-foreground">{eq.category}</span>
                              ) : (
                                <CellSelect value={eq.category} onChange={(v) => updateEquipment(eq.id, "category", v)} options={categorySelectOptions} placeholder="Category" />
                              )}
                            </TableCell>
                          );
                        case "lastService":
                          return (
                            <TableCell key="lastService" className="p-0 px-1">
                              <span className="text-xs px-2 text-muted-foreground">
                                {(() => {
                                  const maxHours = (eq.serviceHistory || []).reduce(
                                    (max, e) => {
                                      const h = parseFloat(e.hours);
                                      return !isNaN(h) && h > max ? h : max;
                                    },
                                    -1
                                  );
                                  return maxHours >= 0 ? String(maxHours) : eq.lastServiceHours || "—";
                                })()}
                              </span>
                            </TableCell>
                          );
                        case "status":
                          return (
                            <TableCell key="status" className="p-0 px-1">
                              {isLocked ? (
                                <Badge variant="outline" className={`text-[10px] font-medium capitalize ${statusColors[eq.status]}`}>
                                  {statusLabels[eq.status]}
                                </Badge>
                              ) : (
                                <CellSelect value={eq.status} onChange={(v) => updateEquipment(eq.id, "status", v)} options={statusOptions} placeholder="Status" />
                              )}
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}

                    {/* Actions */}
                    <TableCell className="p-0 px-1">
                      {isLocked ? (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => unlockRow(eq.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Edit</p>
                            </TooltipContent>
                          </Tooltip>
                          <DeleteConfirmButton
                            onConfirm={() => deleteEquipment(eq.id)}
                            itemLabel="this equipment"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 cursor-pointer"
                                onClick={() => lockRow(eq.id)}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Done editing</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => lockRow(eq.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Cancel</p>
                            </TooltipContent>
                          </Tooltip>
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
      {/* Export dialog (controlled) */}
      <ExportDialog
        controlledOpen={exportOpen}
        onControlledOpenChange={setExportOpen}
        trigger={null}
        columns={EQUIPMENT_EXPORT_COLUMNS}
        groupOptions={EQUIPMENT_GROUP_OPTIONS}
        defaultTitle="Equipment"
        onExport={handleExport}
        onGeneratePDFPreview={handlePreview}
        recordCount={filteredEquipment.length}
      />
      {/* Equipment detail sheet */}
      <EquipmentDetailSheet
        equipment={selectedEquipment}
        open={!!selectedEqId}
        onOpenChange={(open) => { if (!open) setSelectedEqId(null); }}
        onUpdate={handleDetailUpdate}
      />
    </div>
  );
}
