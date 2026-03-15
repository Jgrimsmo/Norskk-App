"use client";

import * as React from "react";
import { Plus, Pencil, X } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { TableExport } from "@/components/shared/table-export";
import type { ExportColumnDef } from "@/components/shared/export-dialog";
import { toolCSVColumns, toolPDFColumns, toolPDFRows } from "@/lib/export/columns";

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

import { type Tool, type ToolStatus } from "@/lib/types/time-tracking";
import { useRelockOnClickOutside } from "@/hooks/use-relock-on-click-outside";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

import { toolStatusColors as statusColors } from "@/lib/constants/status-colors";

const statusLabels: Record<ToolStatus, string> = {
  available: "Available",
  "in-use": "In Use",
  lost: "Lost",
  retired: "Retired",
};

function newBlankTool(): Tool {
  return {
    id: `tl-${crypto.randomUUID().slice(0, 8)}`,
    number: "",
    name: "",
    category: "",
    status: "available",
  };
}

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────

interface ToolsTableProps {
  tools: Tool[];
  onToolsChange: (tools: Tool[] | ((prev: Tool[]) => Tool[])) => void;
  categoryOptions?: { id: string; label: string }[];
}

export function ToolsTable({
  tools: toolList,
  onToolsChange,
  categoryOptions: categoryOptionsProp,
}: ToolsTableProps) {
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
  const categorySelectOptions = React.useMemo(() => {
    if (categoryOptionsProp && categoryOptionsProp.length > 0) return categoryOptionsProp;
    const cats = Array.from(
      new Set(toolList.map((t) => t.category).filter(Boolean))
    ).sort();
    return cats.map((c) => ({ id: c, label: c }));
  }, [toolList, categoryOptionsProp]);

  const categoryOptions = React.useMemo(() => {
    const cats = Array.from(
      new Set(toolList.map((t) => t.category).filter(Boolean))
    ).sort();
    return cats.map((c) => ({ id: c, label: c }));
  }, [toolList]);

  const statusOptions = (
    ["available", "in-use", "lost", "retired"] as ToolStatus[]
  ).map((s) => ({ id: s, label: statusLabels[s] }));

  // ── Filtered tools ──
  const filteredTools = React.useMemo(() => {
    return toolList.filter((tool) => {
      if (categoryFilter.size > 0 && !categoryFilter.has(tool.category))
        return false;
      if (statusFilter.size > 0 && !statusFilter.has(tool.status))
        return false;
      return true;
    });
  }, [toolList, categoryFilter, statusFilter]);

  // ── Mutations ──
  const updateTool = React.useCallback(
    (id: string, field: keyof Tool, value: string) => {
      onToolsChange((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    [onToolsChange]
  );

  const deleteTool = React.useCallback(
    (id: string) => {
      onToolsChange((prev) => prev.filter((t) => t.id !== id));
    },
    [onToolsChange]
  );

  // ── Add form state ──
  const [adding, setAdding] = React.useState(false);
  const [newForm, setNewForm] = React.useState({ number: "", name: "", category: "", status: "available" as ToolStatus });

  const handleAddSubmit = React.useCallback(() => {
    if (!newForm.name.trim()) return;
    const tool: Tool = {
      id: `tl-${crypto.randomUUID().slice(0, 8)}`,
      number: newForm.number.trim(),
      name: newForm.name.trim(),
      category: newForm.category.trim(),
      status: newForm.status,
    };
    onToolsChange((prev) => [...prev, tool]);
    setAdding(false);
    setNewForm({ number: "", name: "", category: "", status: "available" });
  }, [newForm, onToolsChange]);

  const { unlockRow } = useRelockOnClickOutside(toolList, unlockedIds, setUnlockedIds);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Tool
        </Button>
        <ToolsExport tools={filteredTools} />
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                  <TableHead className="w-[120px] text-xs font-semibold px-3">Tool #</TableHead>
                  <TableHead className="w-[220px] text-xs font-semibold px-3">Name</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold px-3">Category</TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold px-3">Status</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold px-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-[36px] hover:bg-muted/20">
                  <TableCell className="p-0 px-1">
                    <CellInput value={newForm.number} onChange={(v) => setNewForm((f) => ({ ...f, number: v }))} placeholder="e.g. TL-010" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellInput value={newForm.name} onChange={(v) => setNewForm((f) => ({ ...f, name: v }))} placeholder="Tool name" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellSelect value={newForm.category} onChange={(v) => setNewForm((f) => ({ ...f, category: v }))} options={categorySelectOptions} placeholder="Category" />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellSelect value={newForm.status} onChange={(v) => setNewForm((f) => ({ ...f, status: v as ToolStatus }))} options={statusOptions} placeholder="Status" />
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
                <TableHead className="w-[120px] text-xs font-semibold px-3">
                  Tool #
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
              {filteredTools.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No tools match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredTools.map((tool) => {
                const isRetired =
                  tool.status === "retired" && !unlockedIds.has(tool.id);

                return (
                  <TableRow
                    key={tool.id}
                    data-row-id={tool.id}
                    className={`group h-[36px] ${
                      isRetired ? "bg-gray-50/30" : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Tool # */}
                    <TableCell className="text-xs p-0 px-1">
                      {isRetired ? (
                        <span className="px-2 text-muted-foreground font-medium">
                          {tool.number}
                        </span>
                      ) : (
                        <CellInput
                          value={tool.number}
                          onChange={(v) => updateTool(tool.id, "number", v)}
                          placeholder="e.g. TL-010"
                        />
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {tool.name}
                        </span>
                      ) : (
                        <CellInput
                          value={tool.name}
                          onChange={(v) => updateTool(tool.id, "name", v)}
                          placeholder="Tool name"
                        />
                      )}
                    </TableCell>

                    {/* Category */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {tool.category}
                        </span>
                      ) : (
                        <CellSelect
                          value={tool.category}
                          onChange={(v) => updateTool(tool.id, "category", v)}
                          options={categorySelectOptions}
                          placeholder="Category"
                        />
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-0 px-1">
                      {isRetired ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium capitalize ${statusColors[tool.status]}`}
                        >
                          {statusLabels[tool.status]}
                        </Badge>
                      ) : (
                        <CellSelect
                          value={tool.status}
                          onChange={(v) => updateTool(tool.id, "status", v)}
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
                                onClick={(e) => unlockRow(tool.id, e)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Edit retired tool</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <DeleteConfirmButton
                            onConfirm={() => deleteTool(tool.id)}
                            itemLabel="this tool"
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
          {filteredTools.length} of {toolList.length} tools
        </span>
        <span className="font-medium text-foreground">
          {toolList.filter((t) => t.status === "available").length} available
        </span>
      </div>
    </div>
  );
}

// ── Export sub-component ──
const TOOL_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "number", header: "Number" },
  { id: "name", header: "Name" },
  { id: "category", header: "Category" },
  { id: "status", header: "Status" },
];

const TOOL_GROUP_OPTIONS = [
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
];

function ToolsExport({ tools }: { tools: Tool[] }) {
  return (
    <TableExport
      items={tools}
      csvColumns={toolCSVColumns}
      pdfColumns={toolPDFColumns}
      pdfRows={toolPDFRows(tools)}
      exportColumns={TOOL_EXPORT_COLUMNS}
      groupOptions={TOOL_GROUP_OPTIONS}
      defaultTitle="Tools"
    />
  );
}
