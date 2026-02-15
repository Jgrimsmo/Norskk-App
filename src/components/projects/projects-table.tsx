"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ExportDialog } from "@/components/shared/export-dialog";
import type { ExportColumnDef, ExportConfig } from "@/components/shared/export-dialog";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl } from "@/lib/export/pdf";
import { projectCSVColumns, projectPDFColumns, projectPDFRows } from "@/lib/export/columns";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

import { ColumnFilter } from "@/components/time-tracking/column-filter";

import { type Project, type ProjectStatus, type CostCode } from "@/lib/types/time-tracking";
import { useCostCodes } from "@/hooks/use-firestore";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

import { projectStatusColors as statusColors } from "@/lib/constants/status-colors";

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  "on-hold": "On Hold",
  completed: "Completed",
  bidding: "Bidding",
};

function newBlankProject(): Project {
  return {
    id: `proj-${crypto.randomUUID().slice(0, 8)}`,
    number: "",
    name: "",
    developer: "",
    address: "",
    status: "bidding",
    costCodeIds: [],
  };
}

// Cost code multi-select cell
function CostCodeMultiSelect({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: costCodes } = useCostCodes();
  const [open, setOpen] = React.useState(false);
  const selected = new Set(selectedIds);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(Array.from(next));
  };

  const selectedLabels = costCodes
    .filter((cc) => selected.has(cc.id))
    .map((cc) => cc.code);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-[32px] w-full justify-start text-xs rounded-none border border-transparent bg-transparent px-2 py-0 shadow-none font-normal hover:bg-transparent hover:border-muted-foreground/30 focus:border-primary"
        >
          {selectedLabels.length > 0 ? (
            <span className="truncate">
              {selectedLabels.length <= 2
                ? selectedLabels.join(", ")
                : `${selectedLabels.length} codes`}
            </span>
          ) : (
            <span className="text-muted-foreground">Select codes...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0" sideOffset={4}>
        <div className="max-h-[240px] overflow-y-auto p-2 space-y-0.5">
          {costCodes.map((cc) => (
            <label
              key={cc.id}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50"
            >
              <Checkbox
                checked={selected.has(cc.id)}
                onCheckedChange={() => toggle(cc.id)}
              />
              <span>
                {cc.code} — {cc.description}
              </span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────

interface ProjectsTableProps {
  projects: Project[];
  onProjectsChange: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
}

export function ProjectsTable({
  projects: projectList,
  onProjectsChange,
}: ProjectsTableProps) {
  const { data: costCodes } = useCostCodes();

  const [unlockedIds, setUnlockedIds] = React.useState<Set<string>>(
    new Set()
  );

  // ── Filter state ──
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [developerFilter, setDeveloperFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [costCodeFilter, setCostCodeFilter] = React.useState<Set<string>>(
    new Set()
  );

  // Filter option arrays
  const statusOptions = (
    ["active", "on-hold", "completed", "bidding"] as ProjectStatus[]
  ).map((s) => ({ id: s, label: statusLabels[s] }));

  const developerOptions = React.useMemo(() => {
    const devs = Array.from(
      new Set(projectList.map((p) => p.developer).filter(Boolean))
    );
    return devs.map((d) => ({ id: d, label: d }));
  }, [projectList]);

  const costCodeOptions = costCodes.map((cc) => ({
    id: cc.id,
    label: `${cc.code} — ${cc.description}`,
  }));

  // ── Filtered projects ──
  const filteredProjects = React.useMemo(() => {
    return projectList.filter((project) => {
      if (statusFilter.size > 0 && !statusFilter.has(project.status))
        return false;
      if (developerFilter.size > 0 && !developerFilter.has(project.developer))
        return false;
      if (costCodeFilter.size > 0) {
        const hasMatch = project.costCodeIds.some((id) =>
          costCodeFilter.has(id)
        );
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [projectList, statusFilter, developerFilter, costCodeFilter]);

  // ── Mutations ──
  const updateProject = React.useCallback(
    (id: string, field: keyof Project, value: string | string[]) => {
      onProjectsChange((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    },
    [onProjectsChange]
  );

  const deleteProject = React.useCallback(
    (id: string) => {
      onProjectsChange((prev) => prev.filter((p) => p.id !== id));
    },
    [onProjectsChange]
  );

  const addProject = React.useCallback(() => {
    onProjectsChange((prev) => [...prev, newBlankProject()]);
  }, [onProjectsChange]);

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
          onClick={addProject}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Project
        </Button>
        <ProjectsExport projects={filteredProjects} costCodes={costCodes} />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[120px] text-xs font-semibold px-3">
                  Project #
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold px-3">
                  Name
                </TableHead>
                <TableHead className="w-[180px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Developer"
                    options={developerOptions}
                    selected={developerFilter}
                    onChange={setDeveloperFilter}
                  />
                </TableHead>
                <TableHead className="w-[250px] text-xs font-semibold px-3">
                  Address
                </TableHead>
                <TableHead className="w-[120px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Status"
                    options={statusOptions}
                    selected={statusFilter}
                    onChange={setStatusFilter}
                  />
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Cost Codes"
                    options={costCodeOptions}
                    selected={costCodeFilter}
                    onChange={setCostCodeFilter}
                  />
                </TableHead>
                <TableHead className="w-[50px] text-xs font-semibold px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No projects match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredProjects.map((project) => {
                const isCompleted =
                  project.status === "completed" &&
                  !unlockedIds.has(project.id);

                return (
                  <TableRow
                    key={project.id}
                    className={`group h-[36px] ${
                      isCompleted
                        ? "bg-blue-50/30"
                        : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Project Number */}
                    <TableCell className="text-xs p-0 px-1">
                      {isCompleted ? (
                        <span className="px-2 text-muted-foreground font-medium">
                          {project.number}
                        </span>
                      ) : (
                        <CellInput
                          value={project.number}
                          onChange={(v) =>
                            updateProject(project.id, "number", v)
                          }
                          placeholder="e.g. 2026-006"
                        />
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell className="p-0 px-1">
                      {isCompleted ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {project.name}
                        </span>
                      ) : (
                        <CellInput
                          value={project.name}
                          onChange={(v) =>
                            updateProject(project.id, "name", v)
                          }
                          placeholder="Project name"
                        />
                      )}
                    </TableCell>

                    {/* Developer */}
                    <TableCell className="p-0 px-1">
                      {isCompleted ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {project.developer}
                        </span>
                      ) : (
                        <CellInput
                          value={project.developer}
                          onChange={(v) =>
                            updateProject(project.id, "developer", v)
                          }
                          placeholder="Developer name"
                        />
                      )}
                    </TableCell>

                    {/* Address */}
                    <TableCell className="p-0 px-1">
                      {isCompleted ? (
                        <span className="text-xs px-2 text-muted-foreground truncate block max-w-[230px]">
                          {project.address}
                        </span>
                      ) : (
                        <CellInput
                          value={project.address}
                          onChange={(v) =>
                            updateProject(project.id, "address", v)
                          }
                          placeholder="Street address"
                        />
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-0 px-1">
                      {isCompleted ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium capitalize ${statusColors[project.status]}`}
                        >
                          {statusLabels[project.status]}
                        </Badge>
                      ) : (
                        <CellSelect
                          value={project.status}
                          onChange={(v) =>
                            updateProject(project.id, "status", v)
                          }
                          options={statusOptions}
                          placeholder="Status"
                        />
                      )}
                    </TableCell>

                    {/* Cost Codes */}
                    <TableCell className="p-0 px-1">
                      {isCompleted ? (
                        <span className="text-xs px-2 text-muted-foreground truncate block max-w-[180px]">
                          {project.costCodeIds
                            .map(
                              (id) =>
                                costCodes.find((cc) => cc.id === id)?.code
                            )
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </span>
                      ) : (
                        <CostCodeMultiSelect
                          selectedIds={project.costCodeIds}
                          onChange={(ids) =>
                            updateProject(project.id, "costCodeIds", ids)
                          }
                        />
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-0 px-1">
                      {isCompleted ? (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => unlockRow(project.id, e)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">
                                Edit completed project
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <DeleteConfirmButton
                            onConfirm={() => deleteProject(project.id)}
                            itemLabel="this project"
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
          {filteredProjects.length} of {projectList.length} projects
        </span>
        <span className="font-medium text-foreground">
          {projectList.filter((p) => p.status === "active").length} active
        </span>
      </div>
    </div>
  );
}

// ── Export sub-component ──
// ── Export sub-component ──
const PROJECT_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "number", header: "Number" },
  { id: "name", header: "Name" },
  { id: "developer", header: "Developer" },
  { id: "address", header: "Address" },
  { id: "status", header: "Status" },
  { id: "costCodes", header: "Cost Codes" },
];

const PROJECT_GROUP_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "developer", label: "Developer" },
];

function ProjectsExport({ projects, costCodes }: { projects: Project[]; costCodes: CostCode[] }) {
  const { profile } = useCompanyProfile();

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(projects, projectCSVColumns(costCodes), filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(projects, projectCSVColumns(costCodes), filename, config.selectedColumns);
    } else {
      generatePDF({
        title: config.title,
        filename,
        company: profile,
        columns: projectPDFColumns,
        rows: projectPDFRows(projects, costCodes),
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
      columns: projectPDFColumns,
      rows: projectPDFRows(projects, costCodes),
      orientation: config.orientation,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
    });

  return (
    <ExportDialog
      columns={PROJECT_EXPORT_COLUMNS}
      groupOptions={PROJECT_GROUP_OPTIONS}
      defaultTitle="Projects"
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={projects.length === 0}
      recordCount={projects.length}
    />
  );
}
