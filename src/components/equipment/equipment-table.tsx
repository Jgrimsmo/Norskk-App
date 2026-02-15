"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ExportDialog } from "@/components/shared/export-dialog";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import type { ExportColumnDef, ExportConfig } from "@/components/shared/export-dialog";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl } from "@/lib/export/pdf";
import { equipmentCSVColumns, equipmentPDFColumns, equipmentPDFRows } from "@/lib/export/columns";

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
  retired: "Retired",
};

function newBlankEquipment(): Equipment {
  return {
    id: `eq-${crypto.randomUUID().slice(0, 8)}`,
    number: "",
    name: "",
    category: "",
    status: "available",
  };
}

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────

interface EquipmentTableProps {
  equipment: Equipment[];
  onEquipmentChange: (equipment: Equipment[] | ((prev: Equipment[]) => Equipment[])) => void;
}

export function EquipmentTable({
  equipment: equipmentList,
  onEquipmentChange,
}: EquipmentTableProps) {
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
      new Set(
        equipmentList
          .map((e) => e.category)
          .filter((c) => c && c !== "—")
      )
    ).sort();
    return cats.map((c) => ({ id: c, label: c }));
  }, [equipmentList]);

  const statusOptions = (
    ["available", "in-use", "maintenance", "retired"] as EquipmentStatus[]
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

  const addEquipment = React.useCallback(() => {
    onEquipmentChange((prev) => [...prev, newBlankEquipment()]);
  }, [onEquipmentChange]);

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
          onClick={addEquipment}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Equipment
        </Button>
        <EquipmentExport equipment={filteredEquipment} />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[120px] text-xs font-semibold px-3">
                  Equipment #
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
              {filteredEquipment.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No equipment matches the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredEquipment.map((eq) => {
                const isRetired =
                  eq.status === "retired" && !unlockedIds.has(eq.id);

                return (
                  <TableRow
                    key={eq.id}
                    className={`group h-[36px] ${
                      isRetired ? "bg-gray-50/30" : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Equipment # */}
                    <TableCell className="text-xs p-0 px-1">
                      {isRetired ? (
                        <span className="px-2 text-muted-foreground font-medium">
                          {eq.number}
                        </span>
                      ) : (
                        <CellInput
                          value={eq.number}
                          onChange={(v) =>
                            updateEquipment(eq.id, "number", v)
                          }
                          placeholder="e.g. EQ-008"
                        />
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {eq.name}
                        </span>
                      ) : (
                        <CellInput
                          value={eq.name}
                          onChange={(v) =>
                            updateEquipment(eq.id, "name", v)
                          }
                          placeholder="Equipment name"
                        />
                      )}
                    </TableCell>

                    {/* Category */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {eq.category}
                        </span>
                      ) : (
                        <CellInput
                          value={eq.category}
                          onChange={(v) =>
                            updateEquipment(eq.id, "category", v)
                          }
                          placeholder="e.g. Excavator"
                        />
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium capitalize ${statusColors[eq.status]}`}
                        >
                          {statusLabels[eq.status]}
                        </Badge>
                      ) : (
                        <CellSelect
                          value={eq.status}
                          onChange={(v) =>
                            updateEquipment(eq.id, "status", v)
                          }
                          options={statusOptions}
                          placeholder="Status"
                        />
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => unlockRow(eq.id, e)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">
                                Edit retired equipment
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <DeleteConfirmButton
                            onConfirm={() => deleteEquipment(eq.id)}
                            itemLabel="this equipment"
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
          {filteredEquipment.length} of{" "}
          {equipmentList.filter((e) => e.id !== EQUIPMENT_NONE_ID).length} equipment
        </span>
        <span className="font-medium text-foreground">
          {equipmentList.filter((e) => e.status === "available" && e.id !== EQUIPMENT_NONE_ID).length} available
        </span>
      </div>
    </div>
  );
}

// ── Export sub-component ──
const EQUIPMENT_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "number", header: "Number" },
  { id: "name", header: "Name" },
  { id: "category", header: "Category" },
  { id: "status", header: "Status" },
];

const EQUIPMENT_GROUP_OPTIONS = [
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
];

function EquipmentExport({ equipment }: { equipment: Equipment[] }) {
  const { profile } = useCompanyProfile();

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(equipment, equipmentCSVColumns, filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(equipment, equipmentCSVColumns, filename, config.selectedColumns);
    } else {
      generatePDF({
        title: config.title,
        filename,
        company: profile,
        columns: equipmentPDFColumns,
        rows: equipmentPDFRows(equipment),
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
      columns: equipmentPDFColumns,
      rows: equipmentPDFRows(equipment),
      orientation: config.orientation,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
    });

  return (
    <ExportDialog
      columns={EQUIPMENT_EXPORT_COLUMNS}
      groupOptions={EQUIPMENT_GROUP_OPTIONS}
      defaultTitle="Equipment"
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={equipment.length === 0}
      recordCount={equipment.length}
    />
  );
}
