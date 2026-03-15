"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Plus, Pencil, X, Download, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { TimeTrackingExport } from "@/components/time-tracking/time-tracking-export";
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
import { SortableHeader } from "@/components/shared/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";

import {
  type TimeEntry,
  type ApprovalStatus,
  type WorkType,
} from "@/lib/types/time-tracking";
import { useRelockOnClickOutside } from "@/hooks/use-relock-on-click-outside";
import {
  useEmployees,
  useProjects,
  useCostCodes,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { approvalStatusColors } from "@/lib/constants/status-colors";
import { workTypeLabels, workTypeOptions, approvalOptions } from "@/lib/constants/labels";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
import { lookupName } from "@/lib/utils/lookup";

// ── Column definitions for settings ──
const TIME_COLUMN_DEFS: ColumnDef[] = [
  { id: "date", label: "Date", alwaysVisible: true },
  { id: "employee", label: "Employee", alwaysVisible: true },
  { id: "project", label: "Project" },
  { id: "costCode", label: "Cost Code" },
  { id: "equipment", label: "Equipment" },
  { id: "attachment", label: "Attachment" },
  { id: "tool", label: "Tool" },
  { id: "workType", label: "Work Type" },
  { id: "hours", label: "Hours" },
  { id: "workTasks", label: "Work Tasks" },
  { id: "approval", label: "Approval" },
];

/* ── Work Tasks Popover ── */
function WorkTasksPopover({
  notes,
  onChange,
  readOnly = false,
}: {
  notes: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  // Parse numbered lines into plain task strings
  const parseTasks = (raw: string) =>
    raw
      ? raw.split("\n").map((l) => l.replace(/^\d+\.\s*/, ""))
      : [""];

  const [tasks, setTasks] = React.useState(() => parseTasks(notes));
  const [open, setOpen] = React.useState(false);

  // Sync when notes change externally
  React.useEffect(() => {
    if (!open) setTasks(parseTasks(notes));
  }, [notes, open]);

  const serialize = (t: string[]) => {
    const filled = t.filter((s) => s.trim());
    return filled.length > 0
      ? filled.map((s, i) => `${i + 1}. ${s.trim()}`).join("\n")
      : "";
  };

  const commit = (updated: string[]) => {
    setTasks(updated);
    onChange(serialize(updated));
  };

  const firstLine = notes?.split("\n")[0];
  const hasMore = notes?.includes("\n");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full text-left text-xs px-2 py-1.5 truncate max-w-[250px] block cursor-pointer hover:bg-muted/50 rounded-sm transition-colors text-muted-foreground"
        >
          {firstLine ? (
            <>
              {firstLine}
              {hasMore && <span className="text-muted-foreground/60"> …</span>}
            </>
          ) : (
            <span className="text-muted-foreground/40 italic">No tasks</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Work Tasks</p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground w-4 shrink-0 text-right">
                  {i + 1}.
                </span>
                {readOnly ? (
                  <span className="text-xs flex-1">{task || "—"}</span>
                ) : (
                  <>
                    <Input
                      value={task}
                      onChange={(e) => {
                        const updated = [...tasks];
                        updated[i] = e.target.value;
                        commit(updated);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const updated = [...tasks];
                          updated.splice(i + 1, 0, "");
                          commit(updated);
                          setTimeout(() => {
                            const inputs = (e.target as HTMLElement)
                              .closest(".space-y-1\.5")
                              ?.querySelectorAll("input");
                            inputs?.[i + 1]?.focus();
                          }, 0);
                        }
                      }}
                      placeholder={i === 0 ? "e.g. Excavated footings" : "Next task…"}
                      className="h-7 text-xs flex-1"
                    />
                    {tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => commit(tasks.filter((_, idx) => idx !== i))}
                        className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs h-7 cursor-pointer"
              onClick={() => commit([...tasks, ""])}
            >
              <Plus className="h-3 w-3" />
              Add task
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function newBlankEntry(date: string): TimeEntry {
  return {
    id: `te-${crypto.randomUUID().slice(0, 8)}`,
    date,
    employeeId: "",
    projectId: "",
    costCodeId: "",
    equipmentId: EQUIPMENT_NONE_ID,
    attachmentId: "",
    toolId: "",
    workType: "lump-sum",
    hours: 0,
    notes: "",
    approval: "pending",
  };
}

const BLANK_NEW_ENTRY = {
  date: new Date().toISOString().split("T")[0],
  employeeId: "",
  projectId: "",
  costCodeId: "",
  equipmentId: EQUIPMENT_NONE_ID,
  attachmentId: "none",
  toolId: "none",
  workType: "tm" as WorkType,
  hours: "",
  notes: "",
};

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────
interface TimeTrackingTableProps {
  entries: TimeEntry[];
  onEntriesChange: (entries: TimeEntry[] | ((prev: TimeEntry[]) => TimeEntry[])) => void;
}

export function TimeTrackingTable({
  entries,
  onEntriesChange,
}: TimeTrackingTableProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: costCodes } = useCostCodes();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  const [unlockedIds, setUnlockedIds] = React.useState<Set<string>>(new Set());

  // ── Column settings ──
  const { columns, toggleColumn, reorderColumns, reset: resetColumns } =
    useTableColumns("time-tracking-columns", TIME_COLUMN_DEFS);

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
  const [newForm, setNewForm] = React.useState(BLANK_NEW_ENTRY);

  // ── Sort state ──
  const { sortKey, sortDir, toggleSort, sortData } = useTableSort<string>();

  // ── Filter state ──
  const [employeeFilter, setEmployeeFilter] = React.useState<Set<string>>(new Set());
  const [projectFilter, setProjectFilter] = React.useState<Set<string>>(new Set());
  const [costCodeFilter, setCostCodeFilter] = React.useState<Set<string>>(new Set());
  const [equipmentFilter, setEquipmentFilter] = React.useState<Set<string>>(new Set());
  const [attachmentFilter, setAttachmentFilter] = React.useState<Set<string>>(new Set());
  const [toolFilter, setToolFilter] = React.useState<Set<string>>(new Set());
  const [workTypeFilter, setWorkTypeFilter] = React.useState<Set<string>>(new Set());
  const [approvalFilter, setApprovalFilter] = React.useState<Set<string>>(new Set());

  // Lookup option arrays for dropdowns
  const employeeOptions = React.useMemo(
    () => employees.map((e) => ({ id: e.id, label: e.name })),
    [employees]
  );
  const projectOptions = React.useMemo(
    () => projects.map((p) => ({ id: p.id, label: p.name })),
    [projects]
  );
  const costCodeOptions = React.useMemo(
    () => costCodes.map((c) => ({ id: c.id, label: c.code })),
    [costCodes]
  );
  const equipmentOptions = React.useMemo(
    () => [
      { id: EQUIPMENT_NONE_ID, label: "None" },
      ...equipment
        .filter((e) => e.id !== EQUIPMENT_NONE_ID)
        .map((e) => ({ id: e.id, label: e.name })),
    ],
    [equipment]
  );
  const attachmentOptions = React.useMemo(
    () => [
      { id: "none", label: "None" },
      ...attachments.map((a) => ({ id: a.id, label: a.name })),
    ],
    [attachments]
  );
  const toolOptions = React.useMemo(
    () => [
      { id: "none", label: "None" },
      ...tools.map((t) => ({ id: t.id, label: t.name })),
    ],
    [tools]
  );

  // ── Filtered entries ──
  const filteredEntries = React.useMemo(() => {
    return entries.filter((entry) => {
      if (employeeFilter.size > 0 && !employeeFilter.has(entry.employeeId)) return false;
      if (projectFilter.size > 0 && !projectFilter.has(entry.projectId)) return false;
      if (costCodeFilter.size > 0 && !costCodeFilter.has(entry.costCodeId)) return false;
      if (equipmentFilter.size > 0 && !equipmentFilter.has(entry.equipmentId)) return false;
      if (attachmentFilter.size > 0 && !attachmentFilter.has(entry.attachmentId || "none")) return false;
      if (toolFilter.size > 0 && !toolFilter.has(entry.toolId || "none")) return false;
      if (workTypeFilter.size > 0 && !workTypeFilter.has(entry.workType)) return false;
      if (approvalFilter.size > 0 && !approvalFilter.has(entry.approval)) return false;
      return true;
    });
  }, [entries, employeeFilter, projectFilter, costCodeFilter, equipmentFilter, attachmentFilter, toolFilter, workTypeFilter, approvalFilter]);

  // ── Pagination ──
  const { paginatedData, pageSize, setPageSize, totalItems } =
    useTablePagination(filteredEntries);

  // ── Export ──
  const [exportOpen, setExportOpen] = React.useState(false);

  const handleBulkDelete = React.useCallback(() => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} time entr${selected.size === 1 ? "y" : "ies"}?`)) return;
    onEntriesChange((prev) => prev.filter((e) => !selected.has(e.id)));
    deselectAll();
  }, [selected, onEntriesChange, deselectAll]);

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

  // ── Update a field directly (instant save) ──
  const updateEntry = React.useCallback(
    (id: string, field: keyof TimeEntry, value: string | number) => {
      onEntriesChange((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, [field]: value } : e
        )
      );
      // If approval changed away from approved, auto-lock again
      if (field === "approval" && value !== "approved") {
        setUnlockedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [onEntriesChange]
  );

  const { unlockRow } = useRelockOnClickOutside(entries, unlockedIds, setUnlockedIds);

  // ── Delete row ──
  const deleteRow = React.useCallback(
    (id: string) => {
      onEntriesChange((prev) => prev.filter((entry) => entry.id !== id));
    },
    [onEntriesChange]
  );

  // ── Add new entry via form ──
  const handleAddSubmit = React.useCallback(() => {
    if (!newForm.employeeId || !newForm.projectId || !newForm.hours) return;
    const entry: TimeEntry = {
      id: `te-${crypto.randomUUID().slice(0, 8)}`,
      date: newForm.date,
      employeeId: newForm.employeeId,
      projectId: newForm.projectId,
      costCodeId: newForm.costCodeId,
      equipmentId: newForm.equipmentId || EQUIPMENT_NONE_ID,
      attachmentId: newForm.attachmentId === "none" ? "" : newForm.attachmentId,
      toolId: newForm.toolId === "none" ? "" : newForm.toolId,
      workType: newForm.workType,
      hours: Number(newForm.hours) || 0,
      notes: newForm.notes,
      approval: "pending",
    };
    onEntriesChange((prev) => [...prev, entry]);
    setAdding(false);
    setNewForm(BLANK_NEW_ENTRY);
  }, [newForm, onEntriesChange]);

  // Cost codes filtered by selected project in the add form
  const newFormCostCodeOptions = React.useMemo(() => {
    if (!newForm.projectId) return costCodeOptions;
    const proj = projects.find((p) => p.id === newForm.projectId);
    if (!proj?.costCodeIds?.length) return costCodeOptions;
    return costCodes
      .filter((cc) => proj.costCodeIds.includes(cc.id))
      .map((cc) => ({ id: cc.id, label: cc.code }));
  }, [newForm.projectId, projects, costCodes, costCodeOptions]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={() => { setNewForm({ ...BLANK_NEW_ENTRY, date: new Date().toISOString().split("T")[0] }); setAdding(true); }}
          disabled={adding}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Entry
        </Button>
        <div className="flex items-center gap-2">
          <ColumnSettings columns={columns} onToggle={toggleColumn} onReorder={reorderColumns} onReset={resetColumns} />
          <TableActions actions={tableActions} selectedCount={selectedCount} />
        </div>
      </div>

      {/* Add Entry form — rendered as a mini table matching the main table columns */}
      {adding && (
        <div className="rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                  <TableHead className="w-[120px] text-xs font-semibold px-3">Date</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold px-3">Employee</TableHead>
                  <TableHead className="w-[200px] text-xs font-semibold px-3">Project</TableHead>
                  <TableHead className="w-[200px] text-xs font-semibold px-3">Cost Code</TableHead>
                  <TableHead className="w-[180px] text-xs font-semibold px-3">Equipment</TableHead>
                  <TableHead className="w-[180px] text-xs font-semibold px-3">Attachment</TableHead>
                  <TableHead className="w-[180px] text-xs font-semibold px-3">Tool</TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold px-3">Work Type</TableHead>
                  <TableHead className="w-[80px] text-xs font-semibold px-3">Hours</TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold px-3">Work Tasks</TableHead>
                  <TableHead className="w-[110px] text-xs font-semibold px-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-[36px] hover:bg-muted/20">
                  {/* Date */}
                  <TableCell className="p-0 px-1">
                    <CellInput
                      type="date"
                      value={newForm.date}
                      onChange={(v) => setNewForm((f) => ({ ...f, date: v }))}
                      className="w-full"
                    />
                  </TableCell>
                  {/* Employee */}
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.employeeId}
                      onChange={(v) => setNewForm((f) => ({ ...f, employeeId: v }))}
                      options={employeeOptions}
                      placeholder="Select..."
                    />
                  </TableCell>
                  {/* Project */}
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.projectId}
                      onChange={(v) => setNewForm((f) => ({ ...f, projectId: v, costCodeId: "" }))}
                      options={projectOptions}
                      placeholder="Select..."
                    />
                  </TableCell>
                  {/* Cost Code */}
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.costCodeId}
                      onChange={(v) => setNewForm((f) => ({ ...f, costCodeId: v }))}
                      options={newFormCostCodeOptions}
                      placeholder="Select..."
                    />
                  </TableCell>
                  {/* Equipment */}
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.equipmentId}
                      onChange={(v) => setNewForm((f) => ({ ...f, equipmentId: v }))}
                      options={equipmentOptions}
                      placeholder="None"
                    />
                  </TableCell>
                  {/* Attachment */}
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.attachmentId}
                      onChange={(v) => setNewForm((f) => ({ ...f, attachmentId: v }))}
                      options={attachmentOptions}
                      placeholder="None"
                    />
                  </TableCell>
                  {/* Tool */}
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.toolId}
                      onChange={(v) => setNewForm((f) => ({ ...f, toolId: v }))}
                      options={toolOptions}
                      placeholder="None"
                    />
                  </TableCell>
                  {/* Work Type */}
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.workType}
                      onChange={(v) => setNewForm((f) => ({ ...f, workType: v as WorkType }))}
                      options={workTypeOptions}
                      placeholder="Select..."
                    />
                  </TableCell>
                  {/* Hours */}
                  <TableCell className="p-0 px-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newForm.hours}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d*\.?\d*$/.test(v)) setNewForm((f) => ({ ...f, hours: v }));
                      }}
                      placeholder="0"
                      className="h-[32px] w-full text-xs rounded-none border border-transparent bg-transparent px-2 py-0 shadow-none focus:outline-none focus:border-primary hover:border-muted-foreground/30"
                    />
                  </TableCell>
                  {/* Work Tasks */}
                  <TableCell className="p-0 px-1">
                    <WorkTasksPopover
                      notes={newForm.notes ?? ""}
                      onChange={(v) => setNewForm((f) => ({ ...f, notes: v }))}
                      readOnly={false}
                    />
                  </TableCell>
                  {/* Actions */}
                  <TableCell className="p-0 px-1">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs cursor-pointer px-3"
                        onClick={handleAddSubmit}
                        disabled={!newForm.employeeId || !newForm.projectId || !newForm.hours}
                      >
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 cursor-pointer p-0"
                        onClick={() => { setAdding(false); setNewForm(BLANK_NEW_ENTRY); }}
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

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[40px] px-3">
                  <Checkbox
                    checked={paginatedData.length > 0 && allSelected(paginatedData.map((e) => e.id))}
                    onCheckedChange={(checked) => { if (checked) selectAll(paginatedData.map((e) => e.id)); else deselectAll(); }}
                    aria-label="Select all"
                  />
                </TableHead>
                {columns.filter((c) => c.visible).map((col) => {
                  switch (col.id) {
                    case "date":
                      return <TableHead key="date" className="w-[120px] text-xs font-semibold px-3"><SortableHeader label="Date" column="date" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></TableHead>;
                    case "employee":
                      return <TableHead key="employee" className="w-[160px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Employee" options={employeeOptions} selected={employeeFilter} onChange={setEmployeeFilter} /><SortableHeader label="" column="employee" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "project":
                      return <TableHead key="project" className="w-[200px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Project" options={projectOptions} selected={projectFilter} onChange={setProjectFilter} /><SortableHeader label="" column="project" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "costCode":
                      return <TableHead key="costCode" className="w-[200px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Cost Code" options={costCodeOptions} selected={costCodeFilter} onChange={setCostCodeFilter} /><SortableHeader label="" column="costCode" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "equipment":
                      return <TableHead key="equipment" className="w-[180px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Equipment" options={equipmentOptions} selected={equipmentFilter} onChange={setEquipmentFilter} /><SortableHeader label="" column="equipment" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "attachment":
                      return <TableHead key="attachment" className="w-[180px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Attachment" options={attachmentOptions} selected={attachmentFilter} onChange={setAttachmentFilter} /><SortableHeader label="" column="attachment" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "tool":
                      return <TableHead key="tool" className="w-[180px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Tool" options={toolOptions} selected={toolFilter} onChange={setToolFilter} /><SortableHeader label="" column="tool" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "workType":
                      return <TableHead key="workType" className="w-[130px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Work Type" options={workTypeOptions} selected={workTypeFilter} onChange={setWorkTypeFilter} /><SortableHeader label="" column="workType" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    case "hours":
                      return <TableHead key="hours" className="w-[80px] text-xs font-semibold px-3"><SortableHeader label="Hours" column="hours" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></TableHead>;
                    case "workTasks":
                      return <TableHead key="workTasks" className="min-w-[180px] text-xs font-semibold px-3">Work Tasks</TableHead>;
                    case "approval":
                      return <TableHead key="approval" className="w-[110px] text-xs font-semibold px-3"><div className="flex items-center gap-1"><ColumnFilter title="Approval" options={approvalOptions} selected={approvalFilter} onChange={setApprovalFilter} /><SortableHeader label="" column="approval" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></div></TableHead>;
                    default:
                      return null;
                  }
                })}
                <TableHead className="w-[50px] text-xs font-semibold px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.filter(c => c.visible).length + 2} className="h-32 text-center text-muted-foreground">
                    No time entries match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {sortData(paginatedData, (entry, key) => {
                switch (key) {
                  case "date": return entry.date;
                  case "employee": return lookupName(entry.employeeId, employees);
                  case "project": return lookupName(entry.projectId, projects);
                  case "costCode": return lookupName(entry.costCodeId, costCodes);
                  case "equipment": return lookupName(entry.equipmentId, equipment);
                  case "attachment": return entry.attachmentId ? lookupName(entry.attachmentId, attachments) : "";
                  case "tool": return entry.toolId ? lookupName(entry.toolId, tools) : "";
                  case "workType": return workTypeLabels[entry.workType] ?? entry.workType;
                  case "hours": return entry.hours;
                  case "approval": return entry.approval;
                  default: return "";
                }
              }).map((entry) => {
                const isApproved = entry.approval === "approved" && !unlockedIds.has(entry.id);

                return (
                  <TableRow
                    key={entry.id}
                    data-row-id={entry.id}
                    className={`group h-[36px] ${isApproved ? "bg-green-50/30" : "hover:bg-muted/20"}`}
                  >
                    {/* Checkbox */}
                    <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected(entry.id)}
                        onCheckedChange={() => toggleSelection(entry.id)}
                        aria-label="Select entry"
                      />
                    </TableCell>

                    {columns.filter((c) => c.visible).map((col) => {
                      switch (col.id) {
                        case "date":
                          return (
                            <TableCell key="date" className="text-xs p-0 px-1">
                      {isApproved ? (
                        <span className="px-2 text-muted-foreground">{format(parseISO(entry.date), "MM/dd/yyyy")}</span>
                      ) : (
                        <CellInput type="date" value={entry.date} onChange={(v) => updateEntry(entry.id, "date", v)} className="w-full" />
                      )}
                            </TableCell>
                          );
                        case "employee":
                          return (
                            <TableCell key="employee" className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{lookupName(entry.employeeId, employees)}</span>
                      ) : (
                        <CellSelect value={entry.employeeId} onChange={(v) => updateEntry(entry.id, "employeeId", v)} options={employeeOptions} placeholder="Select..." />
                      )}
                            </TableCell>
                          );
                        case "project":
                          return (
                            <TableCell key="project" className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{lookupName(entry.projectId, projects)}</span>
                      ) : (
                        <CellSelect value={entry.projectId} onChange={(v) => updateEntry(entry.id, "projectId", v)} options={projectOptions} placeholder="Select..." />
                      )}
                            </TableCell>
                          );
                        case "costCode":
                          return (
                            <TableCell key="costCode" className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{lookupName(entry.costCodeId, costCodes)}</span>
                      ) : (
                        <CellSelect value={entry.costCodeId} onChange={(v) => updateEntry(entry.id, "costCodeId", v)} options={costCodeOptions} placeholder="Select..." />
                      )}
                            </TableCell>
                          );
                        case "equipment":
                          return (
                            <TableCell key="equipment" className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{lookupName(entry.equipmentId, equipment)}</span>
                      ) : (
                        <CellSelect value={entry.equipmentId} onChange={(v) => updateEntry(entry.id, "equipmentId", v)} options={equipmentOptions} placeholder="Select..." />
                      )}
                            </TableCell>
                          );
                        case "attachment":
                          return (
                            <TableCell key="attachment" className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{entry.attachmentId ? lookupName(entry.attachmentId, attachments) : "—"}</span>
                      ) : (
                        <CellSelect value={entry.attachmentId || "none"} onChange={(v) => updateEntry(entry.id, "attachmentId", v === "none" ? "" : v)} options={attachmentOptions} placeholder="Select..." />
                      )}
                            </TableCell>
                          );
                        case "tool":
                          return (
                            <TableCell key="tool" className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{entry.toolId ? lookupName(entry.toolId, tools) : "—"}</span>
                      ) : (
                        <CellSelect value={entry.toolId || "none"} onChange={(v) => updateEntry(entry.id, "toolId", v === "none" ? "" : v)} options={toolOptions} placeholder="Select..." />
                      )}
                            </TableCell>
                          );
                        case "workType":
                          return (
                            <TableCell key="workType" className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{workTypeLabels[entry.workType]}</span>
                      ) : (
                        <CellSelect value={entry.workType} onChange={(v) => updateEntry(entry.id, "workType", v)} options={workTypeOptions} placeholder="Select..." />
                      )}
                            </TableCell>
                          );
                        case "hours":
                          return (
                            <TableCell key="hours" className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs font-medium text-muted-foreground">{entry.hours}</span>
                      ) : (
                        <HoursInput value={entry.hours} onChange={(v) => updateEntry(entry.id, "hours", v)} />
                      )}
                            </TableCell>
                          );
                        case "workTasks":
                          return (
                            <TableCell key="workTasks" className="p-0 px-1">
                      <WorkTasksPopover notes={entry.notes} onChange={(v) => updateEntry(entry.id, "notes", v)} readOnly={isApproved} />
                            </TableCell>
                          );
                        case "approval":
                          return (
                            <TableCell key="approval" className="p-0 px-1">
                      {isApproved ? (
                        <Badge variant="outline" className={`text-[10px] font-medium capitalize ${approvalStatusColors[entry.approval]}`}>
                          {entry.approval}
                        </Badge>
                      ) : (
                        <CellSelect value={entry.approval} onChange={(v) => updateEntry(entry.id, "approval", v)} options={[{ id: "pending", label: "Pending" }, { id: "approved", label: "Approved" }, { id: "rejected", label: "Rejected" }]} placeholder="Status" />
                      )}
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}

                    {/* Actions */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={(e) => unlockRow(entry.id, e)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Edit approved entry</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <DeleteConfirmButton
                            onConfirm={() => deleteRow(entry.id)}
                            itemLabel="this time entry"
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

      {/* Pagination footer */}
      <TablePaginationBar
        selectedCount={selectedCount}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {/* Export dialog */}
      <TimeTrackingExport
        entries={filteredEntries}
        employees={employees}
        projects={projects}
        costCodes={costCodes}
        equipment={equipment}
        attachments={attachments}
        tools={tools}
        open={exportOpen}
        onOpenChange={setExportOpen}
        trigger={null}
      />
    </div>
  );
}

// ── Hours input (allows clearing, commits on blur) ──
const HoursInput = React.memo(function HoursInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = React.useState(value === 0 ? "" : String(value));

  // Sync when external value changes (e.g. undo, data reload)
  React.useEffect(() => {
    setText(value === 0 ? "" : String(value));
  }, [value]);

  const commit = () => {
    const n = parseFloat(text);
    onChange(isNaN(n) ? 0 : n);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        // Allow digits, one decimal point, and empty string
        const v = e.target.value;
        if (v === "" || /^\d*\.?\d*$/.test(v)) {
          setText(v);
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="h-[32px] w-full text-xs rounded-none border border-transparent bg-transparent px-2 py-0 shadow-none outline-none focus:border-primary hover:border-muted-foreground/30"
    />
  );
});
