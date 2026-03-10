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
  Save,
  Undo2,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import type {
  DispatchAssignment,
  DispatchView,
} from "@/lib/types/time-tracking";


import { Collections } from "@/lib/firebase/collections";
import { nextDispatchId } from "./dispatch-helpers";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { DispatchSidebar } from "./dispatch-sidebar";
import { useProjects, useDispatches } from "@/hooks/use-firestore";
import { createDispatchNotifications } from "@/lib/utils/notifications";
import { create, update as updateDoc, remove as removeDoc } from "@/lib/firebase/firestore";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────
// Main Dispatch Board
// ────────────────────────────────────────────────────────
export default function DispatchBoard() {
  // Live Firestore data (read-only subscription)
  const { data: savedDispatches, loading: loadingDispatches } = useDispatches();
  const { data: projects } = useProjects();

  // Local editing state — mutations only touch this until Save
  const [localDispatches, setLocalDispatches] = React.useState<DispatchAssignment[]>([]);
  const [initialized, setInitialized] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);

  // Initialize local state from Firestore once loaded
  React.useEffect(() => {
    if (!loadingDispatches && !initialized) {
      setLocalDispatches(savedDispatches);
      setInitialized(true);
    }
  }, [savedDispatches, loadingDispatches, initialized]);

  // Dirty check: local differs from saved
  const isDirty = React.useMemo(() => {
    if (!initialized) return false;
    return JSON.stringify(localDispatches) !== JSON.stringify(savedDispatches);
  }, [localDispatches, savedDispatches, initialized]);

  // After save, suppress dirty bar until Firestore catches up
  const showDirtyBar = isDirty && !justSaved;

  // When Firestore delivers post-save data, force-sync local to match
  // so isDirty becomes genuinely false (avoids JSON serialization mismatches)
  React.useEffect(() => {
    if (justSaved) {
      setLocalDispatches(savedDispatches);
      setJustSaved(false);
    } else if (initialized && !isDirty) {
      setLocalDispatches(savedDispatches);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDispatches]);

  // Use local dispatches for all reads
  const dispatches = localDispatches;
  const setDispatches = setLocalDispatches;

  // Project name lookup for notifications
  const projectLookup = React.useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name || "Unknown Project",
    [projects]
  );

  // ── Save: diff local vs saved, write to Firestore, send notifications ──
  const handleSave = React.useCallback(async () => {
    // Capture the pre-save state before any async work
    const snapshotBefore = [...savedDispatches];
    const snapshotAfter = [...localDispatches];

    setSaving(true);
    try {
      const savedMap = new Map(snapshotBefore.map((d) => [d.id, d]));
      const localMap = new Map(snapshotAfter.map((d) => [d.id, d]));

      const ops: Promise<void>[] = [];

      // Added dispatches
      for (const d of snapshotAfter) {
        if (!savedMap.has(d.id)) {
          ops.push(create<DispatchAssignment>(Collections.DISPATCHES, d));
        }
      }

      // Removed dispatches
      for (const d of snapshotBefore) {
        if (!localMap.has(d.id)) {
          ops.push(removeDoc(Collections.DISPATCHES, d.id));
        }
      }

      // Updated dispatches
      for (const d of snapshotAfter) {
        const old = savedMap.get(d.id);
        if (old && JSON.stringify(old) !== JSON.stringify(d)) {
          const { id, ...rest } = d;
          ops.push(updateDoc<DispatchAssignment>(Collections.DISPATCHES, id, rest));
        }
      }

      await Promise.all(ops);

      // Send notifications after successful save
      await createDispatchNotifications(snapshotBefore, snapshotAfter, projectLookup);

      // Force local and saved to match so isDirty clears immediately
      // (the Firestore subscription will reconcile shortly after)
      setLocalDispatches(snapshotAfter);
      setJustSaved(true);

      toast.success("Dispatch saved successfully.");
    } catch {
      toast.error("Failed to save dispatch changes.");
    } finally {
      setSaving(false);
    }
  }, [savedDispatches, localDispatches, projectLookup]);

  // ── Discard: reset local state to Firestore ──
  const handleDiscard = React.useCallback(() => {
    setLocalDispatches(savedDispatches);
  }, [savedDispatches]);

  // View state
  const [view, setView] = React.useState<DispatchView>("week");
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Selected project (shared between sidebar and calendar)
  const [selectedProjectId, setSelectedProjectId] = React.useState("");

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

  // ── Get dispatches for a day (handles multi-day spans) ──
  const getDispatchesForDay = React.useCallback(
    (day: Date): DispatchAssignment[] => {
      const dateStr = format(day, "yyyy-MM-dd");
      return dispatches.filter((d) => {
        const endDate = d.endDate ?? d.date;
        return d.date <= dateStr && dateStr <= endDate;
      });
    },
    [dispatches]
  );

  // ── All dispatches overlapping the current week ──
  const weekDispatches = React.useMemo(() => {
    if (view !== "week" || calendarDays.length === 0) return [];
    const weekStart = format(calendarDays[0], "yyyy-MM-dd");
    const weekEnd = format(calendarDays[calendarDays.length - 1], "yyyy-MM-dd");
    return dispatches.filter((d) => {
      const endDate = d.endDate ?? d.date;
      return d.date <= weekEnd && endDate >= weekStart;
    });
  }, [dispatches, calendarDays, view]);

  // ── Normalize a raw resourceDates value to an array (handles legacy single-object format) ──
  const normalizeRanges = (raw: unknown): { start: string; end: string }[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as { start: string; end: string }[];
    // Legacy single object: { start, end }
    const obj = raw as { start?: string; end?: string };
    if (obj.start && obj.end) return [{ start: obj.start, end: obj.end }];
    return [];
  };

  // ── Merge overlapping ranges (sort by start, collapse overlaps) ──
  const mergeRanges = (ranges: { start: string; end: string }[]): { start: string; end: string }[] => {
    if (ranges.length === 0) return ranges;
    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
    const result = [{ ...sorted[0] }];
    for (let i = 1; i < sorted.length; i++) {
      const prev = result[result.length - 1];
      const curr = sorted[i];
      if (curr.start <= prev.end) {
        if (curr.end > prev.end) prev.end = curr.end;
      } else {
        result.push({ ...curr });
      }
    }
    return result;
  };

  // ── Check if a resource is already dispatched on a day ──
  const isResourceOnDay = React.useCallback(
    (
      day: Date,
      type: "employee" | "equipment" | "attachment" | "tool",
      resourceId: string
    ): boolean => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayDispatches = getDispatchesForDay(day);
      return dayDispatches.some((d) => {
        let ids: string[];
        if (type === "employee") ids = d.employeeIds;
        else if (type === "equipment") ids = d.equipmentIds;
        else if (type === "attachment") ids = d.attachmentIds;
        else if (type === "tool") ids = d.toolIds;
        else return false;
        if (!ids.includes(resourceId)) return false;
        // If the resource has pinned ranges, check any of them cover this day
        const ranges = normalizeRanges(d.resourceDates?.[resourceId]);
        if (ranges.length > 0) return ranges.some((r) => dayStr >= r.start && dayStr <= r.end);
        return true;
      });
    },
    [getDispatchesForDay]
  );

  // ── Assign project directly to a day (from drag) ──
  const assignProjectToDay = React.useCallback(
    (projectId: string, day: Date) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const alreadyExists = dispatches.some(
        (d) => d.projectId === projectId &&
               d.date <= dateStr &&
               (d.endDate ?? d.date) >= dateStr
      );
      if (alreadyExists) return;
      setDispatches((prev) => [
        ...prev,
        {
          id: nextDispatchId(),
          date: dateStr,
          projectId,
          employeeIds: [],
          equipmentIds: [],
          attachmentIds: [],
          toolIds: [],
        },
      ]);
    },
    [dispatches, setDispatches]
  );

  // ── Has selection ──
  const hasSelection = selectedProjectId !== "";

  // ── Assign selection to a day ──
  const assignToDay = React.useCallback(
    (day: Date) => {
      if (!hasSelection) return;
      const dateStr = format(day, "yyyy-MM-dd");
      const alreadyExists = dispatches.some(
        (d) => d.projectId === selectedProjectId &&
               d.date <= dateStr &&
               (d.endDate ?? d.date) >= dateStr
      );
      if (alreadyExists) return;
      setDispatches((prev) => [
        ...prev,
        {
          id: nextDispatchId(),
          date: dateStr,
          projectId: selectedProjectId,
          employeeIds: [],
          equipmentIds: [],
          attachmentIds: [],
          toolIds: [],
        },
      ]);
    },
    [hasSelection, selectedProjectId, dispatches, setDispatches]
  );

  // ── Assign selection across a date range (week view multi-day) ──
  const assignRange = React.useCallback(
    (startDay: Date, endDay: Date) => {
      if (!hasSelection) return;
      const startStr = format(startDay, "yyyy-MM-dd");
      const endStr = format(endDay, "yyyy-MM-dd");
      const projectOverlap = dispatches.some((d) => {
        if (d.projectId !== selectedProjectId) return false;
        const dEnd = d.endDate ?? d.date;
        return d.date <= endStr && dEnd >= startStr;
      });
      if (projectOverlap) return;
      setDispatches((prev) => [
        ...prev,
        {
          id: nextDispatchId(),
          date: startStr,
          ...(endStr !== startStr && { endDate: endStr }),
          projectId: selectedProjectId,
          employeeIds: [],
          equipmentIds: [],
          attachmentIds: [],
          toolIds: [],
        },
      ]);
    },
    [hasSelection, selectedProjectId, dispatches, setDispatches]
  );

  // ── Remove an entire dispatch ──
  const removeDispatch = React.useCallback(
    (dispatchId: string) => {
      setDispatches((prev) => prev.filter((d) => d.id !== dispatchId));
    },
    [setDispatches]
  );

  // ── Update a specific range for a resource (by index) within a dispatch ──
  const updateResourceDates = React.useCallback(
    (dispatchId: string, resourceId: string, rangeIndex: number, start: string, end: string) => {
      setDispatches((prev) =>
        prev.map((d) => {
          if (d.id !== dispatchId) return d;
          const existing = normalizeRanges(d.resourceDates?.[resourceId]);
          // Empty start/end signals "remove this range"
          const updated = start === "" && end === ""
            ? existing.filter((_, i) => i !== rangeIndex)
            : mergeRanges(existing.map((r, i) => i === rangeIndex ? { start, end } : r));
          return {
            ...d,
            resourceDates: {
              ...(d.resourceDates ?? {}),
              [resourceId]: updated,
            },
          };
        })
      );
    },
    [setDispatches]
  );

  // ── Resize a dispatch's end date ──
  const resizeDispatch = React.useCallback(
    (dispatchId: string, newEndDate: string) => {
      setDispatches((prev) =>
        prev.map((d) => {
          if (d.id !== dispatchId) return d;
          if (newEndDate === d.date) {
            // single day — strip endDate
            const { endDate: _drop, ...rest } = d;
            void _drop;
            return rest;
          }
          return { ...d, endDate: newEndDate };
        })
      );
    },
    [setDispatches]
  );

  // ── Add a single resource to an existing dispatch ──
  const addResourceToDispatch = React.useCallback(
    (
      dispatchId: string,
      type: "employee" | "equipment" | "attachment" | "tool",
      resourceId: string,
      targetDate?: string, // if provided, pins resource to just this day via resourceDates
    ) => {
      const dispatch = dispatches.find((d) => d.id === dispatchId);
      if (!dispatch) return;

      // If dropping onto a specific day, only check that day for conflicts.
      // Otherwise check every day in the dispatch's full span.
      let alreadyScheduled: boolean;
      if (targetDate) {
        alreadyScheduled = isResourceOnDay(new Date(targetDate + "T00:00:00"), type, resourceId);
      } else {
        const spanStart = new Date(dispatch.date + "T00:00:00");
        const spanEnd = new Date((dispatch.endDate ?? dispatch.date) + "T00:00:00");
        const spanDays: Date[] = [];
        let cur = spanStart;
        while (cur <= spanEnd) { spanDays.push(cur); cur = addDays(cur, 1); }
        alreadyScheduled = spanDays.some((d) => isResourceOnDay(d, type, resourceId));
      }
      if (alreadyScheduled) return;

      setDispatches((prev) =>
        prev.map((d) => {
          if (d.id !== dispatchId) return d;
          const copy = { ...d };
          if (type === "employee" && !copy.employeeIds.includes(resourceId))
            copy.employeeIds = [...copy.employeeIds, resourceId];
          if (type === "equipment" && !copy.equipmentIds.includes(resourceId))
            copy.equipmentIds = [...copy.equipmentIds, resourceId];
          if (type === "attachment" && !copy.attachmentIds.includes(resourceId))
            copy.attachmentIds = [...copy.attachmentIds, resourceId];
          if (type === "tool" && !copy.toolIds.includes(resourceId))
            copy.toolIds = [...copy.toolIds, resourceId];
          if (targetDate) {
            const existing = normalizeRanges(copy.resourceDates?.[resourceId]);
            // Add a new single-day range, then merge any overlaps
            const merged = mergeRanges([...existing, { start: targetDate, end: targetDate }]);
            copy.resourceDates = {
              ...(copy.resourceDates ?? {}),
              [resourceId]: merged,
            };
          }
          return copy;
        })
      );
    },
    [dispatches, isResourceOnDay, setDispatches]
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
          // Clean up resourceDates for the removed resource
          if (copy.resourceDates?.[resourceId]) {
            const { [resourceId]: _, ...rest } = copy.resourceDates;
            copy.resourceDates = Object.keys(rest).length > 0 ? rest : undefined;
          }
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
  const clearSelection = () => setSelectedProjectId("");

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
      <DispatchSidebar
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        hasSelection={hasSelection}
        clearSelection={clearSelection}
      />

      {/* ─── RIGHT: Calendar Area ─── */}
      <div className="flex-1 rounded-xl border border-border bg-card shadow-sm flex flex-col min-w-0">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              {headerLabel}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex gap-0.5 bg-muted/60 p-1 rounded-lg">
              {(["day", "week", "month"] as DispatchView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-xs font-semibold capitalize cursor-pointer rounded-md transition-all ${
                    view === v
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
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
              onRemoveDispatch={removeDispatch}
              hasSelection={hasSelection}
            />
          ) : view === "week" ? (
            <WeekView
              days={calendarDays}
              weekDispatches={weekDispatches}
              onAssignRange={assignRange}
              onAssignProjectToDay={assignProjectToDay}
              onRemoveResource={removeResource}
              onRemoveDispatch={removeDispatch}
              onResizeDispatch={resizeDispatch}
              onUpdateResourceDates={updateResourceDates}
              onAddResource={(id, type, rid) => addResourceToDispatch(id, type, rid)}
              onAddResourceToDay={(id, type, rid, day) => addResourceToDispatch(id, type, rid, day)}
              hasSelection={hasSelection}
              getDispatchesForDay={getDispatchesForDay}
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

      {/* Save / Discard bar */}
      {showDirtyBar && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5 shadow-lg">
          <Badge variant="outline" className="text-xs font-medium text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30">
            Unsaved changes
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs cursor-pointer"
            onClick={handleDiscard}
            disabled={saving}
          >
            <Undo2 className="h-3 w-3" />
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs cursor-pointer"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            {saving ? "Saving…" : "Save & Notify"}
          </Button>
        </div>
      )}
    </div>
  );
}
