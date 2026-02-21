"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";

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

  const addVendor = React.useCallback(() => {
    const blank = newBlankVendor();
    onVendorsChange((prev) => [...prev, blank]);
    setUnlockedIds((prev) => new Set(prev).add(blank.id));
  }, [onVendorsChange]);

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
          onClick={addVendor}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Vendor
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[200px] text-xs font-semibold px-3">Name</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold px-3">Type</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold px-3">Contact</TableHead>
                <TableHead className="w-[150px] text-xs font-semibold px-3">Phone</TableHead>
                <TableHead className="text-xs font-semibold px-3">Email</TableHead>
                <TableHead className="w-[60px] text-xs font-semibold px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No vendors yet. Click &quot;Add Vendor&quot; to get started.
                  </TableCell>
                </TableRow>
              )}
              {vendors.map((vendor) => {
                const isLocked = !unlockedIds.has(vendor.id);
                return (
                  <TableRow
                    key={vendor.id}
                    className={`group h-[36px] ${isLocked ? "" : "bg-amber-50/40 dark:bg-amber-900/10"}`}
                  >
                    {/* Name */}
                    <TableCell className="p-0 px-1">
                      {isLocked ? (
                        <span className="text-xs px-2 font-medium">{vendor.name || "—"}</span>
                      ) : (
                        <CellInput
                          value={vendor.name}
                          onChange={(v) => updateVendor(vendor.id, "name", v)}
                          placeholder="Vendor name"
                        />
                      )}
                    </TableCell>

                    {/* Type */}
                    <TableCell className="p-0 px-1">
                      {isLocked ? (
                        vendor.type ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${typeColors[vendor.type]}`}
                          >
                            {vendor.type}
                          </Badge>
                        ) : (
                          <span className="text-xs px-2 text-muted-foreground">—</span>
                        )
                      ) : (
                        <CellSelect
                          value={vendor.type ?? "vendor"}
                          onChange={(v) => updateVendor(vendor.id, "type", v)}
                          options={typeOptions}
                          placeholder="Type"
                        />
                      )}
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="p-0 px-1">
                      {isLocked ? (
                        <span className="text-xs px-2 text-muted-foreground">{vendor.contact || "—"}</span>
                      ) : (
                        <CellInput
                          value={vendor.contact ?? ""}
                          onChange={(v) => updateVendor(vendor.id, "contact", v)}
                          placeholder="Contact name"
                        />
                      )}
                    </TableCell>

                    {/* Phone */}
                    <TableCell className="p-0 px-1">
                      {isLocked ? (
                        <span className="text-xs px-2 text-muted-foreground">{vendor.phone || "—"}</span>
                      ) : (
                        <CellInput
                          value={vendor.phone ?? ""}
                          onChange={(v) => updateVendor(vendor.id, "phone", v)}
                          placeholder="Phone"
                        />
                      )}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="p-0 px-1">
                      {isLocked ? (
                        <span className="text-xs px-2 text-muted-foreground">{vendor.email || "—"}</span>
                      ) : (
                        <CellInput
                          value={vendor.email ?? ""}
                          onChange={(v) => updateVendor(vendor.id, "email", v)}
                          placeholder="Email"
                        />
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-0 px-1">
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isLocked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-500 hover:text-amber-700 hover:bg-amber-50"
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
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          {vendors.length} vendor{vendors.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
