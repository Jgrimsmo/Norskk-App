"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ExportDialog } from "@/components/shared/export-dialog";
import type { ExportColumnDef, ExportConfig } from "@/components/shared/export-dialog";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl } from "@/lib/export/pdf";
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
}

export function ToolsTable({
  tools: toolList,
  onToolsChange,
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

  const addTool = React.useCallback(() => {
    onToolsChange((prev) => [...prev, newBlankTool()]);
  }, [onToolsChange]);

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
          onClick={addTool}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Tool
        </Button>
        <ToolsExport tools={filteredTools} />
      </div>

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
                        <CellInput
                          value={tool.category}
                          onChange={(v) => updateTool(tool.id, "category", v)}
                          placeholder="e.g. Power Tool"
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
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
  const { profile } = useCompanyProfile();

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(tools, toolCSVColumns, filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(tools, toolCSVColumns, filename, config.selectedColumns);
    } else {
      generatePDF({
        title: config.title,
        filename,
        company: profile,
        columns: toolPDFColumns,
        rows: toolPDFRows(tools),
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
      columns: toolPDFColumns,
      rows: toolPDFRows(tools),
      orientation: config.orientation,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
    });

  return (
    <ExportDialog
      columns={TOOL_EXPORT_COLUMNS}
      groupOptions={TOOL_GROUP_OPTIONS}
      defaultTitle="Tools"
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={tools.length === 0}
      recordCount={tools.length}
    />
  );
}
