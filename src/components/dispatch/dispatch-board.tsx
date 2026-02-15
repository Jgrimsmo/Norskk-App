"use client";

import * as React from "react";
import {
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from "date-fns";

import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  X,
  Users,
  Wrench,
  Paperclip,
  Hammer,
  FolderKanban,
  CircleCheck,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  DispatchAssignment,
  DispatchView,
  Employee,
  Project,
  Equipment,
  Attachment,
  Tool,
} from "@/lib/types/time-tracking";

import {
  useEmployees,
  useProjects,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { SavingIndicator } from "@/components/shared/saving-indicator";

// ── Helpers ──
let idCounter = 100;
function nextId(): string {
  return `dsp-${++idCounter}`;
}

// ── Color palette per project ──
const PROJECT_COLORS = [
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800", dot: "bg-blue-500" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-800", dot: "bg-cyan-500" },
];

function getProjectColor(projectId: string, projectsList: Project[]) {
  const idx = projectsList.findIndex((p) => p.id === projectId);
  return PROJECT_COLORS[idx % PROJECT_COLORS.length];
}

// ── Availability calculation ──
function getAvailableResources(
  dayDispatches: DispatchAssignment[],
  activeEmps: Employee[],
  availEq: Equipment[],
  availAtt: Attachment[],
  availTl: Tool[]
) {
  const usedEmpIds = new Set(dayDispatches.flatMap((d) => d.employeeIds));
  const usedEqIds = new Set(dayDispatches.flatMap((d) => d.equipmentIds));
  const usedAttIds = new Set(dayDispatches.flatMap((d) => d.attachmentIds));
  const usedTlIds = new Set(dayDispatches.flatMap((d) => d.toolIds));

  return {
    employees: activeEmps.filter((e) => !usedEmpIds.has(e.id)),
    equipment: availEq.filter((e) => !usedEqIds.has(e.id)),
    attachments: availAtt.filter((a) => !usedAttIds.has(a.id)),
    tools: availTl.filter((t) => !usedTlIds.has(t.id)),
  };
}

// ────────────────────────────────────────────────────────
// Main Dispatch Board
// ────────────────────────────────────────────────────────
export default function DispatchBoard() {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();
  const [dispatches, setDispatches, dispatchesLoading, dispatchesSaving] = useFirestoreState<DispatchAssignment>(Collections.DISPATCHES);

  // Filtered arrays (were module-level constants)
  const activeEmployees = React.useMemo(() => employees.filter((e) => e.status === "active"), [employees]);
  const activeProjects = React.useMemo(() => projects.filter((p) => p.status === "active" || p.status === "bidding"), [projects]);
  const availableEquipment = React.useMemo(() => equipment.filter((e) => e.id !== "eq-none" && e.status !== "retired"), [equipment]);
  const availableAttachments = React.useMemo(() => attachments.filter((a) => a.status !== "retired"), [attachments]);
  const availableTools = React.useMemo(() => tools.filter((t) => t.status !== "retired" && t.status !== "lost"), [tools]);

  // View state
  const [view, setView] = React.useState<DispatchView>("week");
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Selection state
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<
    Set<string>
  >(new Set());
  const [selectedEquipmentIds, setSelectedEquipmentIds] = React.useState<
    Set<string>
  >(new Set());
  const [selectedAttachmentIds, setSelectedAttachmentIds] = React.useState<
    Set<string>
  >(new Set());
  const [selectedToolIds, setSelectedToolIds] = React.useState<Set<string>>(
    new Set()
  );

  // Expanded day (for day view drill-down)
  const [expandedDay, setExpandedDay] = React.useState<Date | null>(null);

  // Search filters for resource lists
  const [empSearch, setEmpSearch] = React.useState("");
  const [eqSearch, setEqSearch] = React.useState("");
  const [attSearch, setAttSearch] = React.useState("");
  const [tlSearch, setTlSearch] = React.useState("");

  const filteredEmployees = React.useMemo(
    () =>
      empSearch
        ? activeEmployees.filter(
            (e) =>
              e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
              e.role.toLowerCase().includes(empSearch.toLowerCase())
          )
        : activeEmployees,
    [empSearch, activeEmployees]
  );
  const filteredEquipment = React.useMemo(
    () =>
      eqSearch
        ? availableEquipment.filter(
            (e) =>
              e.name.toLowerCase().includes(eqSearch.toLowerCase()) ||
              e.number.toLowerCase().includes(eqSearch.toLowerCase()) ||
              e.category.toLowerCase().includes(eqSearch.toLowerCase())
          )
        : availableEquipment,
    [eqSearch, availableEquipment]
  );
  const filteredAttachments = React.useMemo(
    () =>
      attSearch
        ? availableAttachments.filter(
            (a) =>
              a.name.toLowerCase().includes(attSearch.toLowerCase()) ||
              a.number.toLowerCase().includes(attSearch.toLowerCase())
          )
        : availableAttachments,
    [attSearch, availableAttachments]
  );
  const filteredTools = React.useMemo(
    () =>
      tlSearch
        ? availableTools.filter(
            (t) =>
              t.name.toLowerCase().includes(tlSearch.toLowerCase()) ||
              t.number.toLowerCase().includes(tlSearch.toLowerCase()) ||
              t.category.toLowerCase().includes(tlSearch.toLowerCase())
          )
        : availableTools,
    [tlSearch, availableTools]
  );

  // ── Navigation ──
  const goBack = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, -1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  };
  const goForward = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  // ── Calendar days ──
  const calendarDays = React.useMemo(() => {
    if (view === "day") return [currentDate];
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    // month: show full grid (pad to fill weeks)
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate, view]);

  // ── Get dispatches for a day ──
  const getDispatchesForDay = React.useCallback(
    (day: Date): DispatchAssignment[] => {
      const dateStr = format(day, "yyyy-MM-dd");
      return dispatches.filter((d) => d.date === dateStr);
    },
    [dispatches]
  );

  // ── Check if a resource is already dispatched on a day ──
  const isResourceOnDay = React.useCallback(
    (
      day: Date,
      type: "employee" | "equipment" | "attachment" | "tool",
      resourceId: string
    ): boolean => {
      const dayDispatches = getDispatchesForDay(day);
      return dayDispatches.some((d) => {
        if (type === "employee") return d.employeeIds.includes(resourceId);
        if (type === "equipment") return d.equipmentIds.includes(resourceId);
        if (type === "attachment") return d.attachmentIds.includes(resourceId);
        if (type === "tool") return d.toolIds.includes(resourceId);
        return false;
      });
    },
    [getDispatchesForDay]
  );

  // ── Has selection ──
  const hasSelection =
    selectedProjectId !== "" &&
    (selectedEmployeeIds.size > 0 ||
      selectedEquipmentIds.size > 0 ||
      selectedAttachmentIds.size > 0 ||
      selectedToolIds.size > 0);

  // ── Assign selection to a day ──
  const assignToDay = React.useCallback(
    (day: Date) => {
      if (!hasSelection) return;

      const dateStr = format(day, "yyyy-MM-dd");

      // Filter out resources already dispatched on this day (any project)
      const newEmployees = [...selectedEmployeeIds].filter(
        (id) => !isResourceOnDay(day, "employee", id)
      );
      const newEquipment = [...selectedEquipmentIds].filter(
        (id) => !isResourceOnDay(day, "equipment", id)
      );
      const newAttachments = [...selectedAttachmentIds].filter(
        (id) => !isResourceOnDay(day, "attachment", id)
      );
      const newTools = [...selectedToolIds].filter(
        (id) => !isResourceOnDay(day, "tool", id)
      );

      // If everything was already assigned, no-op
      if (
        newEmployees.length === 0 &&
        newEquipment.length === 0 &&
        newAttachments.length === 0 &&
        newTools.length === 0
      ) {
        return;
      }

      // Find existing dispatch for this project on this day
      const existingIdx = dispatches.findIndex(
        (d) => d.date === dateStr && d.projectId === selectedProjectId
      );

      if (existingIdx !== -1) {
        // Merge into existing
        setDispatches((prev) => {
          const updated = [...prev];
          const existing = { ...updated[existingIdx] };
          existing.employeeIds = [
            ...new Set([...existing.employeeIds, ...newEmployees]),
          ];
          existing.equipmentIds = [
            ...new Set([...existing.equipmentIds, ...newEquipment]),
          ];
          existing.attachmentIds = [
            ...new Set([...existing.attachmentIds, ...newAttachments]),
          ];
          existing.toolIds = [
            ...new Set([...existing.toolIds, ...newTools]),
          ];
          updated[existingIdx] = existing;
          return updated;
        });
      } else {
        // Create new dispatch
        setDispatches((prev) => [
          ...prev,
          {
            id: nextId(),
            date: dateStr,
            projectId: selectedProjectId,
            employeeIds: newEmployees,
            equipmentIds: newEquipment,
            attachmentIds: newAttachments,
            toolIds: newTools,
          },
        ]);
      }
    },
    [
      hasSelection,
      selectedProjectId,
      selectedEmployeeIds,
      selectedEquipmentIds,
      selectedAttachmentIds,
      selectedToolIds,
      dispatches,
      isResourceOnDay,
    ]
  );

  // ── Remove a single resource from a dispatch ──
  const removeResource = React.useCallback(
    (
      dispatchId: string,
      type: "employee" | "equipment" | "attachment" | "tool",
      resourceId: string
    ) => {
      setDispatches((prev) => {
        const updated = prev.map((d) => {
          if (d.id !== dispatchId) return d;
          const copy = { ...d };
          if (type === "employee")
            copy.employeeIds = copy.employeeIds.filter((id) => id !== resourceId);
          if (type === "equipment")
            copy.equipmentIds = copy.equipmentIds.filter((id) => id !== resourceId);
          if (type === "attachment")
            copy.attachmentIds = copy.attachmentIds.filter(
              (id) => id !== resourceId
            );
          if (type === "tool")
            copy.toolIds = copy.toolIds.filter((id) => id !== resourceId);
          return copy;
        });
        // Remove dispatches with no resources left
        return updated.filter(
          (d) =>
            d.employeeIds.length > 0 ||
            d.equipmentIds.length > 0 ||
            d.attachmentIds.length > 0 ||
            d.toolIds.length > 0
        );
      });
    },
    []
  );

  // ── Clear selection ──
  const clearSelection = () => {
    setSelectedProjectId("");
    setSelectedEmployeeIds(new Set());
    setSelectedEquipmentIds(new Set());
    setSelectedAttachmentIds(new Set());
    setSelectedToolIds(new Set());
  };

  // ── Toggle helpers ──
  const toggleSet = (
    set: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Header label ──
  const headerLabel = React.useMemo(() => {
    if (view === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "MMMM d")} – ${format(end, "d, yyyy")}`;
      }
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  }, [currentDate, view]);

  // ── Render ──
  return (
    <div className="flex gap-4 h-full">
      {/* ─── LEFT: Resource Selection Panel ─── */}
      <div className="w-72 shrink-0 rounded-xl border bg-card shadow-sm flex flex-col h-full overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Dispatch Resources
            </h3>
            {hasSelection && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-muted-foreground cursor-pointer"
                onClick={clearSelection}
              >
                Clear all
              </Button>
            )}
          </div>
          {hasSelection ? (
            <p className="text-[10px] text-primary font-medium mt-1">
              Click a day on the calendar to assign →
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground mt-1">
              Select items then click a day to assign
            </p>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-1">
            {/* Project */}
            <div className="pb-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5 px-1">
                <FolderKanban className="h-3 w-3" /> Project
              </label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="Select project…" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.number} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Employees */}
            <div className="py-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5 px-1">
                <Users className="h-3 w-3" /> Employees
                {selectedEmployeeIds.size > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[9px] h-4 px-1 normal-case tracking-normal"
                  >
                    {selectedEmployeeIds.size} selected
                  </Badge>
                )}
              </label>
              <div className="relative mb-1.5">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="Search employees…"
                  aria-label="Search employees"
                  className="h-7 text-xs pl-7 pr-2"
                />
              </div>
              <div className="space-y-0.5">
                {filteredEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/50 cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={selectedEmployeeIds.has(emp.id)}
                      onCheckedChange={() =>
                        toggleSet(
                          selectedEmployeeIds,
                          setSelectedEmployeeIds,
                          emp.id
                        )
                      }
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate">{emp.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {emp.role}
                    </span>
                  </label>
                ))}
                {filteredEmployees.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-1">No matches</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Equipment */}
            <div className="py-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5 px-1">
                <Wrench className="h-3 w-3" /> Equipment
                {selectedEquipmentIds.size > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[9px] h-4 px-1 normal-case tracking-normal"
                  >
                    {selectedEquipmentIds.size} selected
                  </Badge>
                )}
              </label>
              <div className="relative mb-1.5">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={eqSearch}
                  onChange={(e) => setEqSearch(e.target.value)}
                  placeholder="Search equipment…"
                  aria-label="Search equipment"
                  className="h-7 text-xs pl-7 pr-2"
                />
              </div>
              <div className="space-y-0.5">
                {filteredEquipment.map((eq) => (
                  <label
                    key={eq.id}
                    className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/50 cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={selectedEquipmentIds.has(eq.id)}
                      onCheckedChange={() =>
                        toggleSet(
                          selectedEquipmentIds,
                          setSelectedEquipmentIds,
                          eq.id
                        )
                      }
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate">{eq.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {eq.number}
                    </span>
                  </label>
                ))}
                {filteredEquipment.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-1">No matches</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Attachments */}
            <div className="py-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5 px-1">
                <Paperclip className="h-3 w-3" /> Attachments
                {selectedAttachmentIds.size > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[9px] h-4 px-1 normal-case tracking-normal"
                  >
                    {selectedAttachmentIds.size} selected
                  </Badge>
                )}
              </label>
              <div className="relative mb-1.5">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={attSearch}
                  onChange={(e) => setAttSearch(e.target.value)}
                  placeholder="Search attachments…"
                  aria-label="Search attachments"
                  className="h-7 text-xs pl-7 pr-2"
                />
              </div>
              <div className="space-y-0.5">
                {filteredAttachments.map((att) => (
                  <label
                    key={att.id}
                    className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/50 cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={selectedAttachmentIds.has(att.id)}
                      onCheckedChange={() =>
                        toggleSet(
                          selectedAttachmentIds,
                          setSelectedAttachmentIds,
                          att.id
                        )
                      }
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate">{att.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {att.number}
                    </span>
                  </label>
                ))}
                {filteredAttachments.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-1">No matches</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Tools */}
            <div className="py-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5 px-1">
                <Hammer className="h-3 w-3" /> Tools
                {selectedToolIds.size > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[9px] h-4 px-1 normal-case tracking-normal"
                  >
                    {selectedToolIds.size} selected
                  </Badge>
                )}
              </label>
              <div className="relative mb-1.5">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={tlSearch}
                  onChange={(e) => setTlSearch(e.target.value)}
                  placeholder="Search tools…"
                  aria-label="Search tools"
                  className="h-7 text-xs pl-7 pr-2"
                />
              </div>
              <div className="space-y-0.5">
                {filteredTools.map((tl) => (
                  <label
                    key={tl.id}
                    className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/50 cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={selectedToolIds.has(tl.id)}
                      onCheckedChange={() =>
                        toggleSet(selectedToolIds, setSelectedToolIds, tl.id)
                      }
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate">{tl.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {tl.number}
                    </span>
                  </label>
                ))}
                {filteredTools.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 text-center py-1">No matches</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ─── RIGHT: Calendar Area ─── */}
      <div className="flex-1 rounded-xl border bg-card shadow-sm flex flex-col min-w-0">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              {headerLabel}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border overflow-hidden">
              {(["day", "week", "month"] as DispatchView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-xs font-medium capitalize cursor-pointer transition-colors ${
                    view === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-5" />

            {/* Navigation */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs cursor-pointer"
              onClick={goToday}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 cursor-pointer"
              onClick={goBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 cursor-pointer"
              onClick={goForward}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          {view === "day" ? (
            <DayView
              day={currentDate}
              dispatches={getDispatchesForDay(currentDate)}
              onAssign={() => assignToDay(currentDate)}
              onRemoveResource={removeResource}
              hasSelection={hasSelection}
            />
          ) : view === "week" ? (
            <WeekView
              days={calendarDays}
              getDispatches={getDispatchesForDay}
              onAssign={assignToDay}
              onRemoveResource={removeResource}
              hasSelection={hasSelection}
              onExpandDay={(d) => {
                setCurrentDate(d);
                setView("day");
              }}
            />
          ) : (
            <MonthView
              days={calendarDays}
              currentDate={currentDate}
              getDispatches={getDispatchesForDay}
              onAssign={assignToDay}
              onRemoveResource={removeResource}
              hasSelection={hasSelection}
              onExpandDay={(d) => {
                setCurrentDate(d);
                setView("day");
              }}
            />
          )}
        </div>
      </div>
      <SavingIndicator saving={dispatchesSaving} />
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Day View
// ────────────────────────────────────────────────────────
function DayView({
  day,
  dispatches,
  onAssign,
  onRemoveResource,
  hasSelection,
}: {
  day: Date;
  dispatches: DispatchAssignment[];
  onAssign: () => void;
  onRemoveResource: (
    dispatchId: string,
    type: "employee" | "equipment" | "attachment" | "tool",
    resourceId: string
  ) => void;
  hasSelection: boolean;
}) {
  return (
    <div className="p-4 space-y-3">
      {hasSelection && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs cursor-pointer gap-1"
          onClick={onAssign}
        >
          <Plus className="h-3 w-3" />
          Assign selection to {format(day, "MMM d")}
        </Button>
      )}

      {dispatches.length === 0 && !hasSelection && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No dispatches for this day
        </div>
      )}

      {dispatches.map((dispatch) => (
        <DispatchCard
          key={dispatch.id}
          dispatch={dispatch}
          onRemoveResource={onRemoveResource}
        />
      ))}

      {/* Available resources */}
      <AvailableResourcesPanel dispatches={dispatches} />
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Week View
// ────────────────────────────────────────────────────────
function WeekView({
  days,
  getDispatches,
  onAssign,
  onRemoveResource,
  hasSelection,
  onExpandDay,
}: {
  days: Date[];
  getDispatches: (day: Date) => DispatchAssignment[];
  onAssign: (day: Date) => void;
  onRemoveResource: (
    dispatchId: string,
    type: "employee" | "equipment" | "attachment" | "tool",
    resourceId: string
  ) => void;
  hasSelection: boolean;
  onExpandDay: (day: Date) => void;
}) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  return (
    <div className="grid grid-cols-7 h-full divide-x">
      {days.map((day) => {
        const dayDispatches = getDispatches(day);
        const today = isToday(day);

        return (
          <div
            key={day.toISOString()}
            className={`flex flex-col min-h-0 ${
              hasSelection
                ? "cursor-pointer hover:bg-primary/5 transition-colors"
                : ""
            }`}
            onClick={() => hasSelection && onAssign(day)}
          >
            {/* Day header */}
            <div
              className={`p-2 border-b text-center shrink-0 ${
                today ? "bg-primary/10" : ""
              }`}
            >
              <div className="text-[10px] text-muted-foreground uppercase">
                {format(day, "EEE")}
              </div>
              <div
                className={`text-sm font-semibold ${
                  today ? "text-primary" : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </div>
            </div>

            {/* Day body */}
            <ScrollArea className="flex-1 p-1">
              <div className="space-y-1.5">
                {dayDispatches.map((dispatch) => {
                  const project = projects.find(
                    (p) => p.id === dispatch.projectId
                  );
                  const color = getProjectColor(dispatch.projectId, projects);

                  return (
                    <div
                      key={dispatch.id}
                      className={`rounded-md px-2 py-1.5 border ${color.bg} ${color.border} cursor-pointer`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpandDay(day);
                      }}
                    >
                      {/* Project header */}
                      <div className={`text-[10px] font-semibold ${color.text} truncate mb-1`}>
                        {project?.number} — {project?.name}
                      </div>

                      {/* Resource lists */}
                      <div className="space-y-0.5">
                        {dispatch.employeeIds.length > 0 && (
                          <div className="flex items-start gap-1">
                            <Users className={`h-2.5 w-2.5 mt-px shrink-0 ${color.text} opacity-60`} />
                            <span className={`text-[9px] ${color.text} leading-tight`}>
                              {dispatch.employeeIds
                                .map((id) => employees.find((e) => e.id === id)?.name ?? id)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        {dispatch.equipmentIds.length > 0 && (
                          <div className="flex items-start gap-1">
                            <Wrench className={`h-2.5 w-2.5 mt-px shrink-0 ${color.text} opacity-60`} />
                            <span className={`text-[9px] ${color.text} leading-tight`}>
                              {dispatch.equipmentIds
                                .map((id) => equipment.find((e) => e.id === id)?.name ?? id)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        {dispatch.attachmentIds.length > 0 && (
                          <div className="flex items-start gap-1">
                            <Paperclip className={`h-2.5 w-2.5 mt-px shrink-0 ${color.text} opacity-60`} />
                            <span className={`text-[9px] ${color.text} leading-tight`}>
                              {dispatch.attachmentIds
                                .map((id) => attachments.find((a) => a.id === id)?.name ?? id)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        {dispatch.toolIds.length > 0 && (
                          <div className="flex items-start gap-1">
                            <Hammer className={`h-2.5 w-2.5 mt-px shrink-0 ${color.text} opacity-60`} />
                            <span className={`text-[9px] ${color.text} leading-tight`}>
                              {dispatch.toolIds
                                .map((id) => tools.find((t) => t.id === id)?.name ?? id)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayDispatches.length === 0 && (
                  <div className="text-center py-4">
                    <div className="text-[10px] text-muted-foreground/50">—</div>
                  </div>
                )}

                {/* Available resources summary */}
                <WeekDayAvailability dispatches={dayDispatches} />
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Week Day Availability (compact, for week view columns)
// ────────────────────────────────────────────────────────
function WeekDayAvailability({
  dispatches,
}: {
  dispatches: DispatchAssignment[];
}) {
  const { data: employees } = useEmployees();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  const activeEmployees = employees.filter((e) => e.status === "active");
  const availableEquipment = equipment.filter((e) => e.id !== "eq-none" && e.status !== "retired");
  const availableAttachments = attachments.filter((a) => a.status !== "retired");
  const availableTools = tools.filter((t) => t.status !== "retired" && t.status !== "lost");

  const avail = getAvailableResources(dispatches, activeEmployees, availableEquipment, availableAttachments, availableTools);
  const hasAny =
    avail.employees.length > 0 ||
    avail.equipment.length > 0 ||
    avail.attachments.length > 0 ||
    avail.tools.length > 0;

  if (!hasAny) return null;

  return (
    <div className="mt-1 pt-1 border-t border-dashed border-muted-foreground/20">
      <div className="flex items-center gap-1 mb-1">
        <CircleCheck className="h-2.5 w-2.5 text-green-600" />
        <span className="text-[9px] font-medium text-green-700">Available</span>
      </div>
      <div className="space-y-0.5">
        {avail.employees.length > 0 && (
          <div className="flex items-start gap-1">
            <Users className="h-2.5 w-2.5 mt-px shrink-0 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground leading-tight">
              {avail.employees.map((e) => e.name.split(" ")[0]).join(", ")}
            </span>
          </div>
        )}
        {avail.equipment.length > 0 && (
          <div className="flex items-start gap-1">
            <Wrench className="h-2.5 w-2.5 mt-px shrink-0 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground leading-tight">
              {avail.equipment.map((e) => e.name).join(", ")}
            </span>
          </div>
        )}
        {avail.attachments.length > 0 && (
          <div className="flex items-start gap-1">
            <Paperclip className="h-2.5 w-2.5 mt-px shrink-0 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground leading-tight">
              {avail.attachments.map((a) => a.name).join(", ")}
            </span>
          </div>
        )}
        {avail.tools.length > 0 && (
          <div className="flex items-start gap-1">
            <Hammer className="h-2.5 w-2.5 mt-px shrink-0 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground leading-tight">
              {avail.tools.map((t) => t.name).join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Available Resources Panel (expanded, for day view)
// ────────────────────────────────────────────────────────
function AvailableResourcesPanel({
  dispatches,
}: {
  dispatches: DispatchAssignment[];
}) {
  const { data: employees } = useEmployees();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  const activeEmployees = employees.filter((e) => e.status === "active");
  const availableEquipment = equipment.filter((e) => e.id !== "eq-none" && e.status !== "retired");
  const availableAttachments = attachments.filter((a) => a.status !== "retired");
  const availableTools = tools.filter((t) => t.status !== "retired" && t.status !== "lost");

  const avail = getAvailableResources(dispatches, activeEmployees, availableEquipment, availableAttachments, availableTools);
  const hasAny =
    avail.employees.length > 0 ||
    avail.equipment.length > 0 ||
    avail.attachments.length > 0 ||
    avail.tools.length > 0;

  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-dashed border-green-300 bg-green-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CircleCheck className="h-4 w-4 text-green-600" />
        <span className="text-xs font-semibold text-green-800">Available Resources</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {avail.employees.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              Employees ({avail.employees.length})
            </div>
            <div className="space-y-0.5">
              {avail.employees.map((emp) => (
                <div key={emp.id} className="text-xs text-foreground px-1.5 py-0.5">
                  {emp.name} <span className="text-[10px] text-muted-foreground">· {emp.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {avail.equipment.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Wrench className="h-3 w-3" />
              Equipment ({avail.equipment.length})
            </div>
            <div className="space-y-0.5">
              {avail.equipment.map((eq) => (
                <div key={eq.id} className="text-xs text-foreground px-1.5 py-0.5">
                  {eq.name} <span className="text-[10px] text-muted-foreground">· {eq.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {avail.attachments.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Paperclip className="h-3 w-3" />
              Attachments ({avail.attachments.length})
            </div>
            <div className="space-y-0.5">
              {avail.attachments.map((att) => (
                <div key={att.id} className="text-xs text-foreground px-1.5 py-0.5">
                  {att.name} <span className="text-[10px] text-muted-foreground">· {att.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {avail.tools.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Hammer className="h-3 w-3" />
              Tools ({avail.tools.length})
            </div>
            <div className="space-y-0.5">
              {avail.tools.map((tl) => (
                <div key={tl.id} className="text-xs text-foreground px-1.5 py-0.5">
                  {tl.name} <span className="text-[10px] text-muted-foreground">· {tl.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Month View
// ────────────────────────────────────────────────────────
function MonthView({
  days,
  currentDate,
  getDispatches,
  onAssign,
  onRemoveResource,
  hasSelection,
  onExpandDay,
}: {
  days: Date[];
  currentDate: Date;
  getDispatches: (day: Date) => DispatchAssignment[];
  onAssign: (day: Date) => void;
  onRemoveResource: (
    dispatchId: string,
    type: "employee" | "equipment" | "attachment" | "tool",
    resourceId: string
  ) => void;
  hasSelection: boolean;
  onExpandDay: (day: Date) => void;
}) {
  const { data: projects } = useProjects();

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-medium text-muted-foreground uppercase"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 auto-rows-[minmax(90px,1fr)]">
        {days.map((day) => {
          const dayDispatches = getDispatches(day);
          const today = isToday(day);
          const inMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toISOString()}
              className={`border-b border-r p-1 ${
                !inMonth ? "bg-muted/20" : ""
              } ${
                hasSelection
                  ? "cursor-pointer hover:bg-primary/5 transition-colors"
                  : ""
              }`}
              onClick={() => hasSelection && onAssign(day)}
            >
              <div
                className={`text-xs font-medium mb-1 px-0.5 ${
                  today
                    ? "text-primary font-bold"
                    : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/40"
                }`}
              >
                {format(day, "d")}
              </div>

              <div className="space-y-0.5">
                {dayDispatches.slice(0, 3).map((dispatch) => {
                  const project = projects.find(
                    (p) => p.id === dispatch.projectId
                  );
                  const color = getProjectColor(dispatch.projectId, projects);

                  return (
                    <div
                      key={dispatch.id}
                      className={`rounded px-1 py-0.5 text-[9px] font-medium truncate border ${color.bg} ${color.border} ${color.text} cursor-pointer`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpandDay(day);
                      }}
                    >
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${color.dot} shrink-0`} />
                        {project?.number}
                        <span className="ml-auto flex items-center gap-0.5">
                          <Users className="h-2 w-2" />
                          {dispatch.employeeIds.length}
                        </span>
                      </span>
                    </div>
                  );
                })}
                {dayDispatches.length > 3 && (
                  <div
                    className="text-[9px] text-muted-foreground px-1 cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpandDay(day);
                    }}
                  >
                    +{dayDispatches.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Dispatch Card (expanded detail view)
// ────────────────────────────────────────────────────────
function DispatchCard({
  dispatch,
  onRemoveResource,
}: {
  dispatch: DispatchAssignment;
  onRemoveResource: (
    dispatchId: string,
    type: "employee" | "equipment" | "attachment" | "tool",
    resourceId: string
  ) => void;
}) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  const project = projects.find((p) => p.id === dispatch.projectId);
  const color = getProjectColor(dispatch.projectId, projects);

  return (
    <div className={`rounded-lg border-2 ${color.border} ${color.bg} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
        <span className={`text-sm font-semibold ${color.text}`}>
          {project?.number} — {project?.name}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Employees */}
        {dispatch.employeeIds.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              Employees ({dispatch.employeeIds.length})
            </div>
            <div className="space-y-0.5">
              {dispatch.employeeIds.map((empId) => {
                const emp = employees.find((e) => e.id === empId);
                return (
                  <div
                    key={empId}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-white/60 border text-xs group"
                  >
                    <span className="truncate">{emp?.name ?? empId}</span>
                    <button
                      onClick={() =>
                        onRemoveResource(dispatch.id, "employee", empId)
                      }
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Equipment */}
        {dispatch.equipmentIds.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Wrench className="h-3 w-3" />
              Equipment ({dispatch.equipmentIds.length})
            </div>
            <div className="space-y-0.5">
              {dispatch.equipmentIds.map((eqId) => {
                const eq = equipment.find((e) => e.id === eqId);
                return (
                  <div
                    key={eqId}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-white/60 border text-xs group"
                  >
                    <span className="truncate">{eq?.name ?? eqId}</span>
                    <button
                      onClick={() =>
                        onRemoveResource(dispatch.id, "equipment", eqId)
                      }
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attachments */}
        {dispatch.attachmentIds.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Paperclip className="h-3 w-3" />
              Attachments ({dispatch.attachmentIds.length})
            </div>
            <div className="space-y-0.5">
              {dispatch.attachmentIds.map((attId) => {
                const att = attachments.find((a) => a.id === attId);
                return (
                  <div
                    key={attId}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-white/60 border text-xs group"
                  >
                    <span className="truncate">{att?.name ?? attId}</span>
                    <button
                      onClick={() =>
                        onRemoveResource(dispatch.id, "attachment", attId)
                      }
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tools */}
        {dispatch.toolIds.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Hammer className="h-3 w-3" />
              Tools ({dispatch.toolIds.length})
            </div>
            <div className="space-y-0.5">
              {dispatch.toolIds.map((tlId) => {
                const tl = tools.find((t) => t.id === tlId);
                return (
                  <div
                    key={tlId}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-white/60 border text-xs group"
                  >
                    <span className="truncate">{tl?.name ?? tlId}</span>
                    <button
                      onClick={() =>
                        onRemoveResource(dispatch.id, "tool", tlId)
                      }
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
