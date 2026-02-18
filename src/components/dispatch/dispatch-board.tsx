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
  Users,
  Wrench,
  Paperclip,
  Hammer,
  FolderKanban,
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
} from "@/lib/types/time-tracking";

import {
  useEmployees,
  useProjects,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections, EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { SavingIndicator } from "@/components/shared/saving-indicator";
import { nextDispatchId } from "./dispatch-helpers";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";

// ────────────────────────────────────────────────────────
// Main Dispatch Board
// ────────────────────────────────────────────────────────
export default function DispatchBoard() {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();
  const [dispatches, setDispatches, , dispatchesSaving] = useFirestoreState<DispatchAssignment>(Collections.DISPATCHES);

  // Filtered arrays (were module-level constants)
  const activeEmployees = React.useMemo(() => employees.filter((e) => e.status === "active"), [employees]);
  const activeProjects = React.useMemo(() => projects.filter((p) => p.status === "active" || p.status === "bidding"), [projects]);
  const availableEquipment = React.useMemo(() => equipment.filter((e) => e.id !== EQUIPMENT_NONE_ID && e.status !== "retired"), [equipment]);
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
            id: nextDispatchId(),
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
      setDispatches,
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
    [setDispatches]
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
                      {p.name}
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
