"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X, Clock, FileText, ShieldCheck, ImageIcon, FolderKanban, Receipt } from "lucide-react";
import Link from "next/link";
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
import { SortableHeader } from "@/components/shared/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";

import { type Project, type ProjectStatus, type CostCode } from "@/lib/types/time-tracking";
import {
  useCostCodes,
  useDevelopers,
  useTimeEntries,
  useDailyReports,
  useSafetyForms,
  useInvoices,
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

const BLANK_NEW_PROJECT_FORM = {
  number: "",
  name: "",
  developerId: "",
  address: "",
  city: "",
  province: "",
  status: "active" as ProjectStatus,
};

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
  count,
  sub,
}: {
  icon: React.ElementType;
  count: number;
  sub?: string;
  tooltip: string;
}) {
  return (
    <div className="flex flex-col items-center leading-tight select-none">
      <span className="text-xs font-semibold text-foreground">{count}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
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
  const { data: invoices } = useInvoices();

  // ── Add form state ──
  const [adding, setAdding] = React.useState(false);
  const [newForm, setNewForm] = React.useState(BLANK_NEW_PROJECT_FORM);

  // Auto-generate next project number: YY-NN (01–99, wraps around)
  const nextProjectNumber = React.useMemo(() => {
    const yy = String(new Date().getFullYear()).slice(-2); // e.g. "26"
    const prefix = `${yy}-`;
    // Find the highest number used this year
    let maxNum = 0;
    for (const p of projectList) {
      if (p.number.startsWith(prefix)) {
        const num = parseInt(p.number.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const next = maxNum >= 99 ? 1 : maxNum + 1;
    return `${prefix}${String(next).padStart(2, "0")}`;
  }, [projectList]);

  const handleAddSubmit = React.useCallback(() => {
    if (!newForm.name.trim()) return;
    const project: Project = {
      id: `proj-${crypto.randomUUID().slice(0, 8)}`,
      number: newForm.number.trim(),
      name: newForm.name.trim(),
      developerId: newForm.developerId,
      address: newForm.address.trim(),
      city: newForm.city.trim(),
      province: newForm.province.trim(),
      status: newForm.status,
      costCodeIds: [],
    };
    onProjectsChange((prev) => [...prev, project]);
    setAdding(false);
    setNewForm(BLANK_NEW_PROJECT_FORM);
  }, [newForm, onProjectsChange]);

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

  // ── Click outside to cancel unchanged edits ──
  React.useEffect(() => {
    if (editingIds.size === 0) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest("[role='dialog']") ||
        target.closest("[data-radix-menu-content]")
      ) return;
      const clickedRowId = target.closest<HTMLElement>("[data-row-id]")?.dataset.rowId ?? null;
      setEditingIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const id of prev) {
          if (id === clickedRowId) continue;
          const snap = snapshots.current.get(id);
          const current = projectList.find((p) => p.id === id);
          if (snap && current && JSON.stringify(snap) === JSON.stringify(current)) {
            next.delete(id);
            snapshots.current.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [editingIds, projectList]);

  // ── Developer select options ──
  const DEVELOPER_NONE = "__none__";
  const developerSelectOptions = React.useMemo(
    () => [
      { id: DEVELOPER_NONE, label: "— None —" },
      ...developers.map((d) => ({ id: d.id, label: d.name })),
    ],
    [developers]
  );

  const developerMap = React.useMemo(
    () => Object.fromEntries(developers.map((d) => [d.id, d.name])),
    [developers]
  );

  // ── Sort state ──
  const { sortKey, sortDir, toggleSort, sortData } = useTableSort<string>();

  // ── Filter state ──
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(new Set());
  const [developerFilter, setDeveloperFilter] = React.useState<Set<string>>(new Set());

  const statusOptions = (["active", "on-hold", "completed", "bidding"] as ProjectStatus[]).map(
    (s) => ({ id: s, label: statusLabels[s] })
  );

  const developerOptions = React.useMemo(() => {
    const devIds = Array.from(new Set(projectList.map((p) => p.developerId).filter(Boolean)));
    return devIds.map((id) => ({ id, label: developerMap[id] || id }));
  }, [projectList, developerMap]);

  // ── Per-project invoice stats ──
  const invoiceStatsByProject = React.useMemo(() => {
    const stats = new Map<string, { count: number; total: number; hasNeedsReview: boolean }>();
    for (const inv of invoices) {
      const s = stats.get(inv.projectId) ?? { count: 0, total: 0, hasNeedsReview: false };
      stats.set(inv.projectId, {
        count: s.count + 1,
        total: s.total + (inv.amount ?? 0),
        hasNeedsReview: s.hasNeedsReview || inv.status === "needs-review",
      });
    }
    return stats;
  }, [invoices]);

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
      if (developerFilter.size > 0 && !developerFilter.has(project.developerId)) return false;
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

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs cursor-pointer" onClick={() => { setNewForm((f) => ({ ...f, number: nextProjectNumber })); setAdding(true); }} disabled={adding}>
          <Plus className="h-3.5 w-3.5" />
          Add Project
        </Button>
        <ProjectsExport projects={filteredProjects} costCodes={costCodes} developers={developers} />
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                  <TableHead className="w-[110px] text-xs font-semibold px-3">Project #</TableHead>
                  <TableHead className="w-[200px] text-xs font-semibold px-3">Name</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold px-3">Developer</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Street</TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold px-3">City</TableHead>
                  <TableHead className="w-[60px] text-xs font-semibold px-3">Prov.</TableHead>
                  <TableHead className="w-[110px] text-xs font-semibold px-3">Status</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold px-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-[36px] hover:bg-muted/20">
                  {/* Project # */}
                  <TableCell className="p-0 px-1">
                    <CellInput
                      value={newForm.number}
                      onChange={(v) => setNewForm((p) => ({ ...p, number: v }))}
                      placeholder="26-01"
                    />
                  </TableCell>
                  {/* Name */}
                  <TableCell className="p-0 px-1">
                    <CellInput
                      value={newForm.name}
                      onChange={(v) => setNewForm((p) => ({ ...p, name: v }))}
                      placeholder="Project name"
                    />
                  </TableCell>
                  {/* Developer */}
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.developerId || DEVELOPER_NONE}
                      onChange={(v) => setNewForm((p) => ({ ...p, developerId: v === DEVELOPER_NONE ? "" : v }))}
                      options={developerSelectOptions}
                      placeholder="— None —"
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
                  </TableCell>
                  {/* Street */}
                  <TableCell className="p-0 px-1">
                    <CellInput
                      value={newForm.address}
                      onChange={(v) => setNewForm((p) => ({ ...p, address: v }))}
                      placeholder="123 Main St"
                    />
                  </TableCell>
                  {/* City */}
                  <TableCell className="p-0 px-1">
                    <CellInput
                      value={newForm.city}
                      onChange={(v) => setNewForm((p) => ({ ...p, city: v }))}
                      placeholder="Edmonton"
                    />
                  </TableCell>
                  {/* Province */}
                  <TableCell className="p-0 px-1">
                    <CellInput
                      value={newForm.province}
                      onChange={(v) => setNewForm((p) => ({ ...p, province: v }))}
                      placeholder="AB"
                    />
                  </TableCell>
                  {/* Status */}
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.status}
                      onChange={(v) => setNewForm((p) => ({ ...p, status: v as ProjectStatus }))}
                      options={statusOptions}
                      placeholder="Status"
                    />
                  </TableCell>
                  {/* Actions */}
                  <TableCell className="p-0 px-1">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs cursor-pointer px-3"
                        onClick={handleAddSubmit}
                        disabled={!newForm.name.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 cursor-pointer p-0"
                        onClick={() => { setAdding(false); setNewForm(BLANK_NEW_PROJECT_FORM); }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
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
                <TableHead className="w-[110px] text-xs font-semibold px-3">
                  <SortableHeader label="Project #" column="number" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold px-3">
                  <SortableHeader label="Name" column="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                </TableHead>
                <TableHead className="w-[160px] text-xs font-semibold px-3">
                  <div className="flex items-center gap-1">
                    <ColumnFilter title="Developer" options={developerOptions} selected={developerFilter} onChange={setDeveloperFilter} />
                    <SortableHeader label="" column="developer" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  </div>
                </TableHead>
                <TableHead className="w-[220px] text-xs font-semibold px-3">
                  <SortableHeader label="Address" column="address" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                </TableHead>
                <TableHead className="w-[90px] text-xs font-semibold px-3 text-center">
                  <div className="flex items-center justify-center gap-1"><Clock className="h-3 w-3" /><SortableHeader label="Entries" column="entries" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div>
                </TableHead>
                <TableHead className="w-[75px] text-xs font-semibold px-3 text-center">
                  <div className="flex items-center justify-center gap-1"><ImageIcon className="h-3 w-3" /><SortableHeader label="Photos" column="photos" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div>
                </TableHead>
                <TableHead className="w-[80px] text-xs font-semibold px-3 text-center">
                  <div className="flex items-center justify-center gap-1"><FileText className="h-3 w-3" /><SortableHeader label="Reports" column="reports" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div>
                </TableHead>
                <TableHead className="w-[75px] text-xs font-semibold px-3 text-center">
                  <div className="flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3" /><SortableHeader label="Safety" column="safety" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div>
                </TableHead>
                <TableHead className="w-[130px] text-xs font-semibold px-3 text-center">
                  <div className="flex items-center justify-center gap-1"><Receipt className="h-3 w-3" /><SortableHeader label="Payables" column="payables" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div>
                </TableHead>
                <TableHead className="w-[110px] text-xs font-semibold px-3">
                  <div className="flex items-center gap-1">
                    <ColumnFilter title="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
                    <SortableHeader label="" column="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  </div>
                </TableHead>
                <TableHead className="w-[80px] text-xs font-semibold px-3 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="h-40 text-center">
                    {projectList.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FolderKanban className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">No projects yet</p>
                        <p className="text-xs">Create your first project to track time, reports and safety.</p>
                        <button
                          onClick={() => { setNewForm((f) => ({ ...f, number: nextProjectNumber })); setAdding(true); }}
                          className="mt-1 text-xs text-primary hover:underline cursor-pointer"
                        >
                          + Add Project
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No projects match the current filters.
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {sortData(filteredProjects, (project, key) => {
                const stats = statsByProject.get(project.id) ?? { timeCount: 0, totalHours: 0, photoCount: 0, reportCount: 0, safetyCount: 0 };
                const invStats = invoiceStatsByProject.get(project.id);
                switch (key) {
                  case "number": return project.number;
                  case "name": return project.name;
                  case "developer": return developerMap[project.developerId] || "";
                  case "address": return composeAddress(project);
                  case "entries": return stats.timeCount;
                  case "photos": return stats.photoCount;
                  case "reports": return stats.reportCount;
                  case "safety": return stats.safetyCount;
                  case "payables": return invStats?.total ?? 0;
                  case "status": return statusLabels[project.status] ?? project.status;
                  default: return "";
                }
              }).map((project) => {
                const isEditing = editingIds.has(project.id);
                const stats = statsByProject.get(project.id) ?? { timeCount: 0, totalHours: 0, photoCount: 0, reportCount: 0, safetyCount: 0 };
                const hoursLabel = stats.totalHours > 0 ? `${stats.totalHours.toFixed(1)}h` : undefined;
                const invStats = invoiceStatsByProject.get(project.id);

                return (
                  <TableRow
                    key={project.id}
                    data-row-id={project.id}
                    className={`group h-[36px] transition-colors ${
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
                            value={project.developerId || DEVELOPER_NONE}
                            onChange={(v) => updateProject(project.id, "developerId", v === DEVELOPER_NONE ? "" : v)}
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
                        <span className="px-2 text-xs text-muted-foreground">{developerMap[project.developerId] || "—"}</span>
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

                    {/* Payables */}
                    <TableCell className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {invStats ? (
                        <Link href={`/payables?project=${project.id}`}>
                          <div className="inline-flex flex-col items-center leading-tight group/pay cursor-pointer">
                            <span className={`text-xs font-semibold group-hover/pay:underline ${
                              invStats.hasNeedsReview ? "text-amber-600" : "text-foreground"
                            }`}>
                              ${invStats.total.toLocaleString("en-CA", { maximumFractionDigits: 0 })}
                            </span>
                            <span className={`text-[10px] ${
                              invStats.hasNeedsReview ? "text-amber-500" : "text-muted-foreground"
                            }`}>
                              {invStats.count} invoice{invStats.count !== 1 ? "s" : ""}{invStats.hasNeedsReview ? " ·  review" : ""}
                            </span>
                          </div>
                        </Link>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
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

function ProjectsExport({ projects, costCodes, developers }: { projects: Project[]; costCodes: CostCode[]; developers: import("@/lib/types/time-tracking").Developer[] }) {
  const { profile } = useCompanyProfile();

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(projects, projectCSVColumns(costCodes, developers), filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(projects, projectCSVColumns(costCodes, developers), filename, config.selectedColumns);
    } else {
      generatePDF({
        title: config.title,
        filename,
        company: profile,
        columns: projectPDFColumns,
        rows: projectPDFRows(projects, costCodes, developers),
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
      rows: projectPDFRows(projects, costCodes, developers),
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
