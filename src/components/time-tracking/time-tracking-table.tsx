"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Plus, Lock, Pencil } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ExportDialog } from "@/components/shared/export-dialog";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import type { ExportColumnDef, ExportConfig } from "@/components/shared/export-dialog";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { generatePDF } from "@/lib/export/pdf";
import { timeEntryColumns, timeEntryPDFRows } from "@/lib/export/columns";
import { generateTimeTrackingReport, generateTimeTrackingReportBlobUrl } from "@/lib/export/time-tracking-report";

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
  type TimeEntry,
  type ApprovalStatus,
  type WorkType,
} from "@/lib/types/time-tracking";
import {
  useEmployees,
  useProjects,
  useCostCodes,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
import { lookupName } from "@/lib/utils/lookup";

const approvalColors: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const workTypeLabels: Record<WorkType, string> = {
  "lump-sum": "Lump Sum",
  tm: "T&M",
};

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
  const employeeOptions = employees.map((e) => ({ id: e.id, label: e.name }));
  const projectOptions = projects.map((p) => ({
    id: p.id,
    label: p.name,
  }));
  const costCodeOptions = costCodes.map((c) => ({
    id: c.id,
    label: c.description,
  }));
  const equipmentOptions = [
    { id: EQUIPMENT_NONE_ID, label: "None" },
    ...equipment
      .filter((e) => e.id !== EQUIPMENT_NONE_ID)
      .map((e) => ({ id: e.id, label: e.name })),
  ];
  const attachmentOptions = [
    { id: "none", label: "None" },
    ...attachments.map((a) => ({
      id: a.id,
      label: a.name,
    })),
  ];
  const toolOptions = [
    { id: "none", label: "None" },
    ...tools.map((t) => ({
      id: t.id,
      label: t.name,
    })),
  ];
  const workTypeOptions = [
    { id: "lump-sum", label: "Lump Sum" },
    { id: "tm", label: "T&M" },
  ];
  const approvalOptions = [
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

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

  // ── Unlock an approved row for editing ──
  const unlockRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlockedIds((prev) => new Set(prev).add(id));
  };

  // ── Delete row ──
  const deleteRow = React.useCallback(
    (id: string) => {
      onEntriesChange((prev) => prev.filter((entry) => entry.id !== id));
    },
    [onEntriesChange]
  );

  // ── Add new row ──
  const addRow = React.useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const entry = newBlankEntry(today);
    onEntriesChange((prev) => [...prev, entry]);
  }, [onEntriesChange]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={addRow}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Entry
        </Button>
        <TimeTrackingExport
          entries={filteredEntries}
          employees={employees}
          projects={projects}
          costCodes={costCodes}
          equipment={equipment}
          attachments={attachments}
          tools={tools}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[120px] text-xs font-semibold px-3">Date</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold px-3">
                  <ColumnFilter title="Employee" options={employeeOptions} selected={employeeFilter} onChange={setEmployeeFilter} />
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold px-3">
                  <ColumnFilter title="Project" options={projectOptions} selected={projectFilter} onChange={setProjectFilter} />
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold px-3">
                  <ColumnFilter title="Cost Code" options={costCodeOptions} selected={costCodeFilter} onChange={setCostCodeFilter} />
                </TableHead>
                <TableHead className="w-[180px] text-xs font-semibold px-3">
                  <ColumnFilter title="Equipment" options={equipmentOptions} selected={equipmentFilter} onChange={setEquipmentFilter} />
                </TableHead>
                <TableHead className="w-[180px] text-xs font-semibold px-3">
                  <ColumnFilter title="Attachment" options={attachmentOptions} selected={attachmentFilter} onChange={setAttachmentFilter} />
                </TableHead>
                <TableHead className="w-[180px] text-xs font-semibold px-3">
                  <ColumnFilter title="Tool" options={toolOptions} selected={toolFilter} onChange={setToolFilter} />
                </TableHead>
                <TableHead className="w-[130px] text-xs font-semibold px-3">
                  <ColumnFilter title="Work Type" options={workTypeOptions} selected={workTypeFilter} onChange={setWorkTypeFilter} />
                </TableHead>
                <TableHead className="w-[80px] text-xs font-semibold px-3">Hours</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold px-3">Notes</TableHead>
                <TableHead className="w-[110px] text-xs font-semibold px-3">
                  <ColumnFilter title="Approval" options={approvalOptions} selected={approvalFilter} onChange={setApprovalFilter} />
                </TableHead>
                <TableHead className="w-[50px] text-xs font-semibold px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                    No time entries match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredEntries.map((entry) => {
                const isApproved = entry.approval === "approved" && !unlockedIds.has(entry.id);

                return (
                  <TableRow
                    key={entry.id}
                    className={`group h-[36px] ${isApproved ? "bg-green-50/30" : "hover:bg-muted/20"}`}
                  >
                    {/* Date */}
                    <TableCell className="text-xs p-0 px-1">
                      {isApproved ? (
                        <span className="px-2 text-muted-foreground">{format(parseISO(entry.date), "MM/dd/yyyy")}</span>
                      ) : (
                        <CellInput
                          type="date"
                          value={entry.date}
                          onChange={(v) => updateEntry(entry.id, "date", v)}
                          className="w-full"
                        />
                      )}
                    </TableCell>

                    {/* Employee */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{lookupName(entry.employeeId, employees)}</span>
                      ) : (
                        <CellSelect
                          value={entry.employeeId}
                          onChange={(v) => updateEntry(entry.id, "employeeId", v)}
                          options={employeeOptions}
                          placeholder="Select..."
                        />
                      )}
                    </TableCell>

                    {/* Project */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{lookupName(entry.projectId, projects)}</span>
                      ) : (
                        <CellSelect
                          value={entry.projectId}
                          onChange={(v) => updateEntry(entry.id, "projectId", v)}
                          options={projectOptions}
                          placeholder="Select..."
                        />
                      )}
                    </TableCell>

                    {/* Cost Code */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{lookupName(entry.costCodeId, costCodes)}</span>
                      ) : (
                        <CellSelect
                          value={entry.costCodeId}
                          onChange={(v) => updateEntry(entry.id, "costCodeId", v)}
                          options={costCodeOptions}
                          placeholder="Select..."
                        />
                      )}
                    </TableCell>

                    {/* Equipment */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{lookupName(entry.equipmentId, equipment)}</span>
                      ) : (
                        <CellSelect
                          value={entry.equipmentId}
                          onChange={(v) => updateEntry(entry.id, "equipmentId", v)}
                          options={equipmentOptions}
                          placeholder="Select..."
                        />
                      )}
                    </TableCell>

                    {/* Attachment */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{entry.attachmentId ? lookupName(entry.attachmentId, attachments) : "—"}</span>
                      ) : (
                        <CellSelect
                          value={entry.attachmentId || "none"}
                          onChange={(v) => updateEntry(entry.id, "attachmentId", v === "none" ? "" : v)}
                          options={attachmentOptions}
                          placeholder="Select..."
                        />
                      )}
                    </TableCell>

                    {/* Tool */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{entry.toolId ? lookupName(entry.toolId, tools) : "—"}</span>
                      ) : (
                        <CellSelect
                          value={entry.toolId || "none"}
                          onChange={(v) => updateEntry(entry.id, "toolId", v === "none" ? "" : v)}
                          options={toolOptions}
                          placeholder="Select..."
                        />
                      )}
                    </TableCell>

                    {/* Work Type */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs px-2 text-muted-foreground">{workTypeLabels[entry.workType]}</span>
                      ) : (
                        <CellSelect
                          value={entry.workType}
                          onChange={(v) => updateEntry(entry.id, "workType", v)}
                          options={workTypeOptions}
                          placeholder="Select..."
                        />
                      )}
                    </TableCell>

                    {/* Hours */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs font-medium text-muted-foreground">{entry.hours}</span>
                      ) : (
                        <HoursInput
                          value={entry.hours}
                          onChange={(v) => updateEntry(entry.id, "hours", v)}
                        />
                      )}
                    </TableCell>

                    {/* Notes */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <span className="text-xs text-muted-foreground truncate block max-w-[250px] px-2">
                          {entry.notes || "—"}
                        </span>
                      ) : (
                        <CellInput
                          value={entry.notes}
                          onChange={(v) => updateEntry(entry.id, "notes", v)}
                        />
                      )}
                    </TableCell>

                    {/* Approval */}
                    <TableCell className="p-0 px-1">
                      {isApproved ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium capitalize ${approvalColors[entry.approval]}`}
                        >
                          {entry.approval}
                        </Badge>
                      ) : (
                        <CellSelect
                          value={entry.approval}
                          onChange={(v) => updateEntry(entry.id, "approval", v)}
                          options={[
                            { id: "pending", label: "Pending" },
                            { id: "approved", label: "Approved" },
                            { id: "rejected", label: "Rejected" },
                          ]}
                          placeholder="Status"
                        />
                      )}
                    </TableCell>

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

      {/* Summary footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>{filteredEntries.length} of {entries.length} entries</span>
        <span className="font-medium text-foreground">
          Total: {filteredEntries.reduce((sum, e) => sum + e.hours, 0)} hours
        </span>
      </div>
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

// ── Export sub-component ──
const TIME_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "date", header: "Date" },
  { id: "employee", header: "Employee" },
  { id: "project", header: "Project" },
  { id: "costCode", header: "Cost Code" },
  { id: "equipment", header: "Equipment", defaultSelected: false },
  { id: "attachment", header: "Attachment", defaultSelected: false },
  { id: "tool", header: "Tool", defaultSelected: false },
  { id: "workType", header: "Work Type" },
  { id: "hours", header: "Hours" },
  { id: "approval", header: "Approval" },
  { id: "notes", header: "Notes" },
];

const TIME_GROUP_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "employee", label: "Employee" },
  { value: "date", label: "Date" },
  { value: "costCode", label: "Cost Code" },
];

function TimeTrackingExport({
  entries,
  employees,
  projects,
  costCodes,
  equipment,
  attachments,
  tools,
}: {
  entries: TimeEntry[];
  employees: { id: string; name: string }[];
  projects: { id: string; name: string; number: string }[];
  costCodes: { id: string; code: string; description: string }[];
  equipment: { id: string; name: string; number: string }[];
  attachments: { id: string; name: string; number: string }[];
  tools: { id: string; name: string; number: string }[];
}) {
  const { profile } = useCompanyProfile();
  const { csv } = timeEntryColumns(
    employees as never[],
    projects as never[],
    costCodes as never[],
    equipment as never[],
    attachments as never[],
    tools as never[]
  );

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(entries, csv, filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(entries, csv, filename, config.selectedColumns);
    } else {
      generateTimeTrackingReport({
        entries,
        employees: employees as never[],
        projects: projects as never[],
        costCodes: costCodes as never[],
        company: profile,
        filename,
        selectedColumns: config.selectedColumns,
        groupBy: config.groupBy,
        title: config.title,
        orientation: config.orientation,
      });
    }
  };

  const handlePreview = (config: ExportConfig) =>
    generateTimeTrackingReportBlobUrl({
      entries,
      employees: employees as never[],
      projects: projects as never[],
      costCodes: costCodes as never[],
      company: profile,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
      title: config.title,
      orientation: config.orientation,
    });

  return (
    <ExportDialog
      columns={TIME_EXPORT_COLUMNS}
      groupOptions={TIME_GROUP_OPTIONS}
      defaultTitle="Time Tracking Report"
      defaultOrientation="landscape"
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={entries.length === 0}
      recordCount={entries.length}
    />
  );
}
