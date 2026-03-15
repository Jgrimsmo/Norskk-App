"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
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

import { type Vendor, type VendorType } from "@/lib/types/time-tracking";
import { useRelockOnClickOutside } from "@/hooks/use-relock-on-click-outside";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const typeOptions: { id: string; label: string }[] = [
  { id: "vendor", label: "Vendor" },
  { id: "subcontractor", label: "Subcontractor" },
];

const typeColors: Record<VendorType, string> = {
  vendor: "bg-blue-100 text-blue-800 border-blue-200",
  subcontractor: "bg-purple-100 text-purple-800 border-purple-200",
};

function newBlankVendor(): Vendor {
  return {
    id: `vendor-${crypto.randomUUID().slice(0, 8)}`,
    name: "",
    contact: "",
    phone: "",
    email: "",
    type: "vendor",
  };
}

// ── Column definitions for settings ──
const VENDOR_COLUMN_DEFS: ColumnDef[] = [
  { id: "name", label: "Name", alwaysVisible: true },
  { id: "type", label: "Type" },
  { id: "contact", label: "Contact" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
];

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────

interface VendorsTableProps {
  vendors: Vendor[];
  onVendorsChange: (vendors: Vendor[] | ((prev: Vendor[]) => Vendor[])) => void;
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function VendorsTable({ vendors, onVendorsChange }: VendorsTableProps) {
  const [unlockedIds, setUnlockedIds] = React.useState<Set<string>>(new Set());

  // ── Column settings ──
  const { columns, toggleColumn, reorderColumns, reset: resetColumns } =
    useTableColumns("vendors-columns", VENDOR_COLUMN_DEFS);

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

  // ── Pagination ──
  const { paginatedData, pageSize, setPageSize, totalItems } =
    useTablePagination(vendors);

  // ── Table actions ──
  const handleBulkDelete = React.useCallback(() => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} vendor(s)?`)) return;
    onVendorsChange((prev) => prev.filter((v) => !selected.has(v.id)));
    deselectAll();
  }, [selected, onVendorsChange, deselectAll]);

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

  const updateVendor = React.useCallback(
    (id: string, field: keyof Vendor, value: string) => {
      onVendorsChange((prev) =>
        prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
      );
    },
    [onVendorsChange]
  );

  const deleteVendor = React.useCallback(
    (id: string) => {
      onVendorsChange((prev) => prev.filter((v) => v.id !== id));
    },
    [onVendorsChange]
  );

  const { unlockRow } = useRelockOnClickOutside(vendors, unlockedIds, setUnlockedIds);

  const addVendor = React.useCallback(() => {
    const blank = newBlankVendor();
    onVendorsChange((prev) => [...prev, blank]);
    setUnlockedIds((prev) => new Set(prev).add(blank.id));
  }, [onVendorsChange]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={addVendor}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Vendor
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
                      allSelected(paginatedData.map((v) => v.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) selectAll(paginatedData.map((v) => v.id));
                      else deselectAll();
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                {columns.filter((c) => c.visible).map((col) => {
                  switch (col.id) {
                    case "name":
                      return <TableHead key="name" className="w-[200px] text-xs font-semibold px-3">Name</TableHead>;
                    case "type":
                      return <TableHead key="type" className="w-[120px] text-xs font-semibold px-3">Type</TableHead>;
                    case "contact":
                      return <TableHead key="contact" className="w-[160px] text-xs font-semibold px-3">Contact</TableHead>;
                    case "phone":
                      return <TableHead key="phone" className="w-[150px] text-xs font-semibold px-3">Phone</TableHead>;
                    case "email":
                      return <TableHead key="email" className="text-xs font-semibold px-3">Email</TableHead>;
                    default:
                      return null;
                  }
                })}
                <TableHead className="w-[50px] text-xs font-semibold px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.filter(c => c.visible).length + 2} className="h-32 text-center text-muted-foreground">
                    No vendors yet. Click &quot;Add Vendor&quot; to get started.
                  </TableCell>
                </TableRow>
              )}
              {paginatedData.map((vendor) => {
                const isLocked = !unlockedIds.has(vendor.id);
                return (
                  <TableRow
                    key={vendor.id}
                    data-row-id={vendor.id}
                    className={`group h-[36px] ${
                      isLocked
                        ? "cursor-pointer hover:bg-muted/20"
                        : "bg-amber-50/40 dark:bg-amber-900/10"
                    }`}
                    onClick={isLocked ? (e) => unlockRow(vendor.id, e) : undefined}
                    title={isLocked ? "Click to edit" : undefined}
                  >
                    {/* Checkbox */}
                    <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected(vendor.id)}
                        onCheckedChange={() => toggleSelection(vendor.id)}
                        aria-label={`Select ${vendor.name}`}
                      />
                    </TableCell>

                    {columns.filter((c) => c.visible).map((col) => {
                      switch (col.id) {
                        case "name":
                          return (
                            <TableCell key="name" className="p-0 px-1">
                              {isLocked ? (
                                <span className="text-xs px-2 font-medium">{vendor.name || "—"}</span>
                              ) : (
                                <CellInput value={vendor.name} onChange={(v) => updateVendor(vendor.id, "name", v)} placeholder="Vendor name" />
                              )}
                            </TableCell>
                          );
                        case "type":
                          return (
                            <TableCell key="type" className="p-0 px-1">
                              {isLocked ? (
                                vendor.type ? (
                                  <Badge variant="outline" className={`text-[10px] font-medium capitalize ${typeColors[vendor.type]}`}>
                                    {vendor.type}
                                  </Badge>
                                ) : (
                                  <span className="text-xs px-2 text-muted-foreground">—</span>
                                )
                              ) : (
                                <CellSelect value={vendor.type ?? "vendor"} onChange={(v) => updateVendor(vendor.id, "type", v)} options={typeOptions} placeholder="Type" />
                              )}
                            </TableCell>
                          );
                        case "contact":
                          return (
                            <TableCell key="contact" className="p-0 px-1">
                              {isLocked ? (
                                <span className="text-xs px-2 text-muted-foreground">{vendor.contact || "—"}</span>
                              ) : (
                                <CellInput value={vendor.contact ?? ""} onChange={(v) => updateVendor(vendor.id, "contact", v)} placeholder="Contact name" />
                              )}
                            </TableCell>
                          );
                        case "phone":
                          return (
                            <TableCell key="phone" className="p-0 px-1">
                              {isLocked ? (
                                <span className="text-xs px-2 text-muted-foreground">{vendor.phone || "—"}</span>
                              ) : (
                                <CellInput value={vendor.phone ?? ""} onChange={(v) => updateVendor(vendor.id, "phone", v)} placeholder="Phone" />
                              )}
                            </TableCell>
                          );
                        case "email":
                          return (
                            <TableCell key="email" className="p-0 px-1">
                              {isLocked ? (
                                <span className="text-xs px-2 text-muted-foreground">{vendor.email || "—"}</span>
                              ) : (
                                <CellInput value={vendor.email ?? ""} onChange={(v) => updateVendor(vendor.id, "email", v)} placeholder="Email" />
                              )}
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}

                    {/* Actions */}
                    <TableCell className="p-0 px-1">
                      <div className="flex items-center gap-0.5">
                        {isLocked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => unlockRow(vendor.id, e)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Edit vendor</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        <DeleteConfirmButton
                          onConfirm={() => deleteVendor(vendor.id)}
                          itemLabel="this vendor"
                        />
                      </div>
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
    </div>
  );
}
