"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X, Clock, FileText, ShieldCheck, ImageIcon, FolderKanban, Receipt, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import type { ExportColumnDef } from "@/components/shared/export-dialog";
import { ExportDialog, type ExportConfig } from "@/components/shared/export-dialog";
import { projectCSVColumns, projectPDFColumns, projectPDFRows } from "@/lib/export/columns";
import { useTableColumns, type ColumnDef } from "@/hooks/use-table-columns";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { ColumnSettings } from "@/components/shared/column-settings";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";
import { TableActions, type TableAction } from "@/components/shared/table-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToCSV, exportToExcel } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl } from "@/lib/export/pdf";

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
import { useCompanyProfile } from "@/hooks/use-company-profile";

import { type Project, type ProjectStatus, type CostCode } from "@/lib/types/time-tracking";
import {
  useCostCodes,
  useDevelopers,
  useTimeEntries,
  useDailyReports,
  useFormSubmissions,
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

// ── Column definitions for settings ──
const PROJECT_COLUMN_DEFS: ColumnDef[] = [
  { id: "number", label: "Project #", alwaysVisible: true },
  { id: "name", label: "Name", alwaysVisible: true },
  { id: "developer", label: "Developer" },
  { id: "address", label: "Address" },
  { id: "entries", label: "Time Entries" },
  { id: "photos", label: "Photos" },
  { id: "reports", label: "Reports" },
  { id: "safety", label: "Safety" },
  { id: "payables", label: "Payables" },
  { id: "status", label: "Status" },
];

// ── Export column definitions ──
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
  const { data: formSubmissions } = useFormSubmissions();
  const { data: invoices } = useInvoices();

  // ── Column settings ──
  const { columns, toggleColumn, reorderColumns, reset: resetColumns, isVisible } =
    useTableColumns("projects-columns", PROJECT_COLUMN_DEFS);

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
  const { profile } = useCompanyProfile();

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
    for (const fs of formSubmissions) {
      if (fs.category !== "safety") continue;
      const ids = fs.linkedProjectIds ?? [];
      if (fs.projectId) ids.push(fs.projectId);
      for (const pid of ids) {
        const s = get(pid);
        stats.set(pid, { ...s, safetyCount: s.safetyCount + 1 });
      }
    }
    return stats;
  }, [timeEntries, dailyReports, formSubmissions]);

  // ── Filtered projects ──
  const filteredProjects = React.useMemo(() => {
    return projectList.filter((project) => {
      if (statusFilter.size > 0 && !statusFilter.has(project.status)) return false;
      if (developerFilter.size > 0 && !developerFilter.has(project.developerId)) return false;
      return true;
    });
  }, [projectList, statusFilter, developerFilter]);

  // ── Pagination ──
  const { paginatedData, pageSize, setPageSize, totalItems } =
    useTablePagination(filteredProjects);

  // ── Export ──
  const [exportOpen, setExportOpen] = React.useState(false);
  const handleExport = React.useCallback(
    (config: ExportConfig) => {
      const datestamp = new Date().toISOString().slice(0, 10);
      const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;
      if (config.format === "excel") {
        exportToExcel(filteredProjects, projectCSVColumns(costCodes, developers), filename, config.selectedColumns);
      } else if (config.format === "csv") {
        exportToCSV(filteredProjects, projectCSVColumns(costCodes, developers), filename, config.selectedColumns);
      } else {
        generatePDF({
          title: config.title,
          filename,
          company: profile,
          columns: projectPDFColumns,
          rows: projectPDFRows(filteredProjects, costCodes, developers),
          orientation: config.orientation,
          selectedColumns: config.selectedColumns,
          groupBy: config.groupBy,
        });
      }
    },
    [filteredProjects, costCodes, developers, profile]
  );
  const handlePreview = React.useCallback(
    (config: ExportConfig) =>
      generatePDFBlobUrl({
        title: config.title,
        filename: "preview",
        company: profile,
        columns: projectPDFColumns,
        rows: projectPDFRows(filteredProjects, costCodes, developers),
        orientation: config.orientation,
        selectedColumns: config.selectedColumns,
        groupBy: config.groupBy,
      }),
    [filteredProjects, costCodes, developers, profile]
  );

  const handleBulkDelete = React.useCallback(() => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} project(s)?`)) return;
    onProjectsChange((prev) => prev.filter((p) => !selected.has(p.id)));
    deselectAll();
  }, [selected, onProjectsChange, deselectAll]);

  // ── Table actions ──
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
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs cursor-pointer" onClick={() => { setNewForm((f) => ({ ...f, number: nextProjectNumber })); setAdding(true); }} disabled={adding}>
          <Plus className="h-3.5 w-3.5" />
          Add Project
        </Button>
        <div className="flex items-center gap-2">
          <ColumnSettings columns={columns} onToggle={toggleColumn} onReorder={reorderColumns} onReset={resetColumns} />
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
                <TableHead className="w-[40px] px-3">
                  <Checkbox
                    checked={paginatedData.length > 0 && allSelected(paginatedData.map((p) => p.id))}
                    onCheckedChange={(checked) => { if (checked) selectAll(paginatedData.map((p) => p.id)); else deselectAll(); }}
                    aria-label="Select all"
                  />
                </TableHead>
                {columns.filter((c) => c.visible).map((col) => {
                  switch (col.id) {
                    case "number":
                      return <TableHead key="number" className="w-[110px] text-xs font-semibold px-3"><SortableHeader label="Project #" column="number" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></TableHead>;
                    case "name":
                      return <TableHead key="name" className="w-[200px] text-xs font-semibold px-3"><SortableHeader label="Name" column="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></TableHead>;
                    case "developer":
                      return <TableHead key="developer" className="w-[160px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Developer" options={developerOptions} selected={developerFilter} onChange={setDeveloperFilter} /><SortableHeader label="" column="developer" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "address":
                      return <TableHead key="address" className="w-[220px] text-xs font-semibold px-3"><SortableHeader label="Address" column="address" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></TableHead>;
                    case "entries":
                      return <TableHead key="entries" className="w-[90px] text-xs font-semibold px-3 text-center"><div className="flex items-center justify-center gap-1"><Clock className="h-3 w-3" /><SortableHeader label="Entries" column="entries" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "photos":
                      return <TableHead key="photos" className="w-[75px] text-xs font-semibold px-3 text-center"><div className="flex items-center justify-center gap-1"><ImageIcon className="h-3 w-3" /><SortableHeader label="Photos" column="photos" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "reports":
                      return <TableHead key="reports" className="w-[80px] text-xs font-semibold px-3 text-center"><div className="flex items-center justify-center gap-1"><FileText className="h-3 w-3" /><SortableHeader label="Reports" column="reports" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "safety":
                      return <TableHead key="safety" className="w-[75px] text-xs font-semibold px-3 text-center"><div className="flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3" /><SortableHeader label="Safety" column="safety" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "payables":
                      return <TableHead key="payables" className="w-[130px] text-xs font-semibold px-3 text-center"><div className="flex items-center justify-center gap-1"><Receipt className="h-3 w-3" /><SortableHeader label="Payables" column="payables" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "status":
                      return <TableHead key="status" className="w-[110px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} /><SortableHeader label="" column="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    default:
                      return null;
                  }
                })}
                <TableHead className="w-[80px] text-xs font-semibold px-3 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.filter(c => c.visible).length + 2} className="h-40 text-center">
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
              {sortData(paginatedData, (project, key) => {
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
                      isEditing ? "bg-amber-50/40 dark:bg-amber-900/10" : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Checkbox */}
                    <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected(project.id)}
                        onCheckedChange={() => toggleSelection(project.id)}
                        aria-label={`Select ${project.name}`}
                      />
                    </TableCell>

                    {columns.filter((c) => c.visible).map((col) => {
                      switch (col.id) {
                        case "number":
                          return (
                            <TableCell key="number" className="text-xs p-0 px-1">
                      {isEditing ? (
                        <div>
                          <CellInput value={project.number} onChange={(v) => updateProject(project.id, "number", v)} placeholder="e.g. 2026-006" />
                        </div>
                      ) : (
                        <span className="px-2 text-xs font-medium text-muted-foreground">{project.number || "—"}</span>
                      )}
                            </TableCell>
                          );
                        case "name":
                          return (
                            <TableCell key="name" className="p-0 px-1">
                      {isEditing ? (
                        <div>
                          <CellInput value={project.name} onChange={(v) => updateProject(project.id, "name", v)} placeholder="Project name" />
                        </div>
                      ) : (
                        <button
                          className="text-xs px-2 font-medium text-foreground hover:text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-left transition-colors"
                          onClick={() => router.push(`/projects/${project.id}`)}
                        >
                          {project.name || "—"}
                        </button>
                      )}
                            </TableCell>
                          );
                        case "developer":
                          return (
                            <TableCell key="developer" className="p-0 px-1">
                      {isEditing ? (
                        <div>
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
                          );
                        case "address":
                          return (
                            <TableCell key="address" className="p-0 px-1">
                      {isEditing ? (
                        <AddressCell project={project} onChange={(field, v) => updateAddress(project.id, field, v)} />
                      ) : (
                        <span className="px-2 text-xs text-muted-foreground truncate block max-w-[210px]">
                          {composeAddress(project) || "—"}
                        </span>
                      )}
                            </TableCell>
                          );
                        case "entries":
                          return (
                            <TableCell key="entries" className="px-3 text-center">
                      <StatCell icon={Clock} count={stats.timeCount} sub={hoursLabel}
                        tooltip={`${stats.timeCount} time entr${stats.timeCount !== 1 ? "ies" : "y"} · ${stats.totalHours.toFixed(1)} hrs`} />
                            </TableCell>
                          );
                        case "photos":
                          return (
                            <TableCell key="photos" className="px-3 text-center">
                      <StatCell icon={ImageIcon} count={stats.photoCount}
                        tooltip={`${stats.photoCount} photo${stats.photoCount !== 1 ? "s" : ""}`} />
                            </TableCell>
                          );
                        case "reports":
                          return (
                            <TableCell key="reports" className="px-3 text-center">
                      <StatCell icon={FileText} count={stats.reportCount}
                        tooltip={`${stats.reportCount} daily report${stats.reportCount !== 1 ? "s" : ""}`} />
                            </TableCell>
                          );
                        case "safety":
                          return (
                            <TableCell key="safety" className="px-3 text-center">
                      <StatCell icon={ShieldCheck} count={stats.safetyCount}
                        tooltip={`${stats.safetyCount} safety form${stats.safetyCount !== 1 ? "s" : ""}`} />
                            </TableCell>
                          );
                        case "payables":
                          return (
                            <TableCell key="payables" className="px-3 text-center">
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
                          );
                        case "status":
                          return (
                            <TableCell key="status" className="p-0 px-1">
                      {isEditing ? (
                        <div>
                          <CellSelect value={project.status} onChange={(v) => updateProject(project.id, "status", v)} options={statusOptions} placeholder="Status" />
                        </div>
                      ) : (
                        <Badge variant="outline" className={`text-[10px] font-medium capitalize ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </Badge>
                      )}
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}

                    {/* Actions */}
                    <TableCell className="p-0 px-1">
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

      {/* Pagination footer */}
      <TablePaginationBar
        selectedCount={selectedCount}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {/* Export dialog */}
      <ExportDialog
        controlledOpen={exportOpen}
        onControlledOpenChange={setExportOpen}
        trigger={null}
        columns={PROJECT_EXPORT_COLUMNS}
        groupOptions={PROJECT_GROUP_OPTIONS}
        defaultTitle="Projects"
        onExport={handleExport}
        onGeneratePDFPreview={handlePreview}
      />
    </div>
  );
}
