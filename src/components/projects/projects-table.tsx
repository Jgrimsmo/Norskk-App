"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X, Clock, FileText, ShieldCheck, ImageIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ColumnFilter } from "@/components/time-tracking/column-filter";

import { type Project, type ProjectStatus, type CostCode } from "@/lib/types/time-tracking";
import {
  useCostCodes,
  useDevelopers,
  useTimeEntries,
  useDailyReports,
  useSafetyForms,
} from "@/hooks/use-firestore";

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
    city: "",
    province: "",
    status: "bidding",
    costCodeIds: [],
  };
}

/** Compose a full address string for display / geocoding */
export function composeAddress(p: { address?: string; city?: string; province?: string }) {
  return [p.address, p.city, p.province].filter(Boolean).join(", ");
}

// ── Address popover cell ─────────────────────────────────
function AddressCell({
  project,
  onChange,
}: {
  project: Project;
  onChange: (field: "address" | "city" | "province", v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const display = composeAddress(project);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-[32px] w-full justify-start text-xs rounded-none border border-transparent bg-transparent px-2 py-0 shadow-none font-normal hover:bg-transparent hover:border-muted-foreground/30 focus:border-primary truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {display || <span className="text-muted-foreground">Street, City, Province</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-3 space-y-3" sideOffset={4}>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Street Address</Label>
          <Input
            value={project.address}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="123 Main St"
            className="h-8 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">City</Label>
            <Input
              value={project.city ?? ""}
              onChange={(e) => onChange("city", e.target.value)}
              placeholder="Edmonton"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Province</Label>
            <Input
              value={project.province ?? ""}
              onChange={(e) => onChange("province", e.target.value)}
              placeholder="AB"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Stat cell ─────────────────────────────────────────────
function StatCell({
  icon: Icon,
  count,
  sub,
  tooltip,
}: {
  icon: React.ElementType;
  count: number;
  sub?: string;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center leading-tight select-none cursor-default">
          <span className="text-xs font-semibold text-foreground">{count}</span>
          {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs flex items-center gap-1.5">
          <Icon className="h-3 w-3" />
          {tooltip}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────

interface ProjectsTableProps {
  projects: Project[];
  onProjectsChange: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
  onAddDeveloper?: () => void;
}

export function ProjectsTable({
  projects: projectList,
  onProjectsChange,
  onAddDeveloper,
}: ProjectsTableProps) {
  const router = useRouter();

  const { data: costCodes } = useCostCodes();
  const { data: developers } = useDevelopers();
  const { data: timeEntries } = useTimeEntries();
  const { data: dailyReports } = useDailyReports();
  const { data: safetyForms } = useSafetyForms();

  // ── Edit state (all rows locked by default) ──
  const [editingIds, setEditingIds] = React.useState<Set<string>>(new Set());
  const snapshots = React.useRef<Map<string, Project>>(new Map());

  const startEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    snapshots.current.set(project.id, { ...project });
    setEditingIds((prev) => new Set(prev).add(project.id));
  };

  const saveEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    snapshots.current.delete(id);
    setEditingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const cancelEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const snap = snapshots.current.get(id);
    if (snap) {
      onProjectsChange((prev) => prev.map((p) => (p.id === id ? snap : p)));
      snapshots.current.delete(id);
    }
    setEditingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  // ── Developer select options ──
  const DEVELOPER_NONE = "__none__";
  const developerSelectOptions = React.useMemo(
    () => [
      { id: DEVELOPER_NONE, label: "— None —" },
      ...developers.map((d) => ({ id: d.name, label: d.name })),
    ],
    [developers]
  );

  // ── Filter state ──
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(new Set());
  const [developerFilter, setDeveloperFilter] = React.useState<Set<string>>(new Set());

  const statusOptions = (["active", "on-hold", "completed", "bidding"] as ProjectStatus[]).map(
    (s) => ({ id: s, label: statusLabels[s] })
  );

  const developerOptions = React.useMemo(() => {
    const devs = Array.from(new Set(projectList.map((p) => p.developer).filter(Boolean)));
    return devs.map((d) => ({ id: d, label: d }));
  }, [projectList]);

  // ── Per-project stats ──
  const statsByProject = React.useMemo(() => {
    const stats = new Map<string, { timeCount: number; totalHours: number; photoCount: number; reportCount: number; safetyCount: number }>();
    const get = (id: string) => stats.get(id) ?? { timeCount: 0, totalHours: 0, photoCount: 0, reportCount: 0, safetyCount: 0 };

    for (const te of timeEntries) {
      const s = get(te.projectId);
      stats.set(te.projectId, { ...s, timeCount: s.timeCount + 1, totalHours: s.totalHours + (te.hours ?? 0) });
    }
    for (const dr of dailyReports) {
      const s = get(dr.projectId);
      const photos = (dr.morningPhotoUrls?.length ?? 0) + (dr.workPhotoUrls?.length ?? 0) + (dr.endOfDayPhotoUrls?.length ?? 0);
      stats.set(dr.projectId, { ...s, reportCount: s.reportCount + 1, photoCount: s.photoCount + photos });
    }
    for (const sf of safetyForms) {
      const s = get(sf.projectId);
      stats.set(sf.projectId, { ...s, safetyCount: s.safetyCount + 1 });
    }
    return stats;
  }, [timeEntries, dailyReports, safetyForms]);

  // ── Filtered projects ──
  const filteredProjects = React.useMemo(() => {
    return projectList.filter((project) => {
      if (statusFilter.size > 0 && !statusFilter.has(project.status)) return false;
      if (developerFilter.size > 0 && !developerFilter.has(project.developer)) return false;
      return true;
    });
  }, [projectList, statusFilter, developerFilter]);

  // ── Mutations ──
  const updateProject = React.useCallback(
    (id: string, field: keyof Project, value: string | string[]) => {
      onProjectsChange((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    },
    [onProjectsChange]
  );

  const updateAddress = React.useCallback(
    (id: string, field: "address" | "city" | "province", value: string) => {
      onProjectsChange((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    },
    [onProjectsChange]
  );

  const deleteProject = React.useCallback(
    (id: string) => { onProjectsChange((prev) => prev.filter((p) => p.id !== id)); },
    [onProjectsChange]
  );

  const addProject = React.useCallback(() => {
    const blank = newBlankProject();
    onProjectsChange((prev) => [...prev, blank]);
    snapshots.current.set(blank.id, { ...blank });
    setEditingIds((prev) => new Set(prev).add(blank.id));
  }, [onProjectsChange]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs cursor-pointer" onClick={addProject}>
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
                <TableHead className="w-[110px] text-xs font-semibold px-3">Project #</TableHead>
                <TableHead className="w-[200px] text-xs font-semibold px-3">Name</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold px-3">
                  <ColumnFilter title="Developer" options={developerOptions} selected={developerFilter} onChange={setDeveloperFilter} />
                </TableHead>
                <TableHead className="w-[220px] text-xs font-semibold px-3">Address</TableHead>
                <TableHead className="w-[90px] text-xs font-semibold px-3 text-center">
                  <div className="flex items-center justify-center gap-1"><Clock className="h-3 w-3" />Entries</div>
                </TableHead>
                <TableHead className="w-[75px] text-xs font-semibold px-3 text-center">
                  <div className="flex items-center justify-center gap-1"><ImageIcon className="h-3 w-3" />Photos</div>
                </TableHead>
                <TableHead className="w-[80px] text-xs font-semibold px-3 text-center">
                  <div className="flex items-center justify-center gap-1"><FileText className="h-3 w-3" />Reports</div>
                </TableHead>
                <TableHead className="w-[75px] text-xs font-semibold px-3 text-center">
                  <div className="flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3" />Safety</div>
                </TableHead>
                <TableHead className="w-[110px] text-xs font-semibold px-3">
                  <ColumnFilter title="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
                </TableHead>
                <TableHead className="w-[80px] text-xs font-semibold px-3 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    No projects match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredProjects.map((project) => {
                const isEditing = editingIds.has(project.id);
                const stats = statsByProject.get(project.id) ?? { timeCount: 0, totalHours: 0, photoCount: 0, reportCount: 0, safetyCount: 0 };
                const hoursLabel = stats.totalHours > 0 ? `${stats.totalHours.toFixed(1)}h` : undefined;

                return (
                  <TableRow
                    key={project.id}
                    className={`group h-[40px] transition-colors ${
                      isEditing ? "bg-amber-50/40 dark:bg-amber-900/10" : "hover:bg-muted/30 cursor-pointer"
                    }`}
                    onClick={() => { if (!isEditing) router.push(`/projects/${project.id}`); }}
                  >
                    {/* Project Number */}
                    <TableCell className="text-xs p-0 px-1">
                      {isEditing ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <CellInput value={project.number} onChange={(v) => updateProject(project.id, "number", v)} placeholder="e.g. 2026-006" />
                        </div>
                      ) : (
                        <span className="px-2 text-xs font-medium text-muted-foreground">{project.number || "—"}</span>
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell className="p-0 px-1">
                      {isEditing ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <CellInput value={project.name} onChange={(v) => updateProject(project.id, "name", v)} placeholder="Project name" />
                        </div>
                      ) : (
                        <span className="px-2 text-xs font-semibold">{project.name || "—"}</span>
                      )}
                    </TableCell>

                    {/* Developer */}
                    <TableCell className="p-0 px-1">
                      {isEditing ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <CellSelect
                            value={project.developer || DEVELOPER_NONE}
                            onChange={(v) => updateProject(project.id, "developer", v === DEVELOPER_NONE ? "" : v)}
                            options={developerSelectOptions}
                            placeholder="Select developer"
                            footer={
                              onAddDeveloper ? (
                                <button
                                  onMouseDown={(e) => { e.preventDefault(); onAddDeveloper(); }}
                                  className="w-full text-left text-xs px-1.5 py-1 rounded-sm text-primary hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center gap-1.5"
                                >
                                  <span className="text-base leading-none">+</span> Add Developer
                                </button>
                              ) : undefined
                            }
                          />
                        </div>
                      ) : (
                        <span className="px-2 text-xs text-muted-foreground">{project.developer || "—"}</span>
                      )}
                    </TableCell>

                    {/* Address */}
                    <TableCell className="p-0 px-1">
                      {isEditing ? (
                        <AddressCell project={project} onChange={(field, v) => updateAddress(project.id, field, v)} />
                      ) : (
                        <span className="px-2 text-xs text-muted-foreground truncate block max-w-[210px]">
                          {composeAddress(project) || "—"}
                        </span>
                      )}
                    </TableCell>

                    {/* Time Entries + Hours */}
                    <TableCell className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <StatCell icon={Clock} count={stats.timeCount} sub={hoursLabel}
                        tooltip={`${stats.timeCount} time entr${stats.timeCount !== 1 ? "ies" : "y"} · ${stats.totalHours.toFixed(1)} hrs`} />
                    </TableCell>

                    {/* Photos */}
                    <TableCell className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <StatCell icon={ImageIcon} count={stats.photoCount}
                        tooltip={`${stats.photoCount} photo${stats.photoCount !== 1 ? "s" : ""}`} />
                    </TableCell>

                    {/* Daily Reports */}
                    <TableCell className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <StatCell icon={FileText} count={stats.reportCount}
                        tooltip={`${stats.reportCount} daily report${stats.reportCount !== 1 ? "s" : ""}`} />
                    </TableCell>

                    {/* Safety Forms */}
                    <TableCell className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <StatCell icon={ShieldCheck} count={stats.safetyCount}
                        tooltip={`${stats.safetyCount} safety form${stats.safetyCount !== 1 ? "s" : ""}`} />
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-0 px-1">
                      {isEditing ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <CellSelect value={project.status} onChange={(v) => updateProject(project.id, "status", v)} options={statusOptions} placeholder="Status" />
                        </div>
                      ) : (
                        <Badge variant="outline" className={`text-[10px] font-medium capitalize ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-0 px-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5 justify-center">
                        {isEditing ? (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={(e) => saveEdit(project.id, e)}>
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left"><p className="text-xs">Save changes</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => cancelEdit(project.id, e)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left"><p className="text-xs">Discard changes</p></TooltipContent>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => startEdit(project, e)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left"><p className="text-xs">Edit project</p></TooltipContent>
                            </Tooltip>
                            <DeleteConfirmButton onConfirm={() => deleteProject(project.id)} itemLabel="this project" />
                          </>
                        )}
                      </div>
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
        <span>{filteredProjects.length} of {projectList.length} project{projectList.length !== 1 ? "s" : ""}</span>
        <span className="font-medium text-foreground">{projectList.filter((p) => p.status === "active").length} active</span>
      </div>
    </div>
  );
}

// ── Export sub-component ──────────────────────────────────
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
