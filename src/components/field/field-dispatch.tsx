"use client";

import * as React from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  MapPin,
  Wrench,
  Paperclip,
  Hammer,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  useEmployees,
  useProjects,
  useEquipment,
  useAttachments,
  useTools,
  useDispatches,
} from "@/hooks/use-firestore";

// ────────────────────────────────────────────────────────
// Field Dispatch — Weekly view of dispatch assignments
// ────────────────────────────────────────────────────────

export function FieldDispatch() {
  const searchParams = useSearchParams();
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();
  const { data: allDispatches } = useDispatches();

  const employeeId = searchParams.get("employee") || "";
  const [weekStart, setWeekStart] = React.useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  // ── Derived data ──

  // All dates in the current week
  const weekDates = React.useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  // Dispatches for the selected employee in this week
  const weekDispatches = React.useMemo(() => {
    if (!employeeId) return [];
    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(weekEnd, "yyyy-MM-dd");
    return allDispatches.filter(
      (d) =>
        d.employeeIds.includes(employeeId) &&
        d.date >= startStr &&
        d.date <= endStr
    );
  }, [allDispatches, employeeId, weekStart, weekEnd]);

  // Group dispatches by date
  const dispatchesByDate = React.useMemo(() => {
    const map = new Map<string, typeof weekDispatches>();
    for (const dispatch of weekDispatches) {
      const existing = map.get(dispatch.date) || [];
      existing.push(dispatch);
      map.set(dispatch.date, existing);
    }
    return map;
  }, [weekDispatches]);

  // Navigation
  const goToPrevious = () => setWeekStart((w) => subWeeks(w, 1));
  const goToNext = () => setWeekStart((w) => addWeeks(w, 1));
  const goToCurrent = () =>
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const isCurrentWeek =
    format(weekStart, "yyyy-MM-dd") === format(currentWeekStart, "yyyy-MM-dd");

  // Count total assignments this week
  const totalAssignments = weekDispatches.length;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/field">
          <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Truck className="h-5 w-5" />
            My Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            See where you&apos;re dispatched this week
          </p>
        </div>
      </div>

      {/* ── Week Navigator ── */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between p-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </p>
            {!isCurrentWeek && (
              <button
                className="text-xs text-primary cursor-pointer hover:underline mt-0.5"
                onClick={goToCurrent}
              >
                Go to current week
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            onClick={goToNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Week summary */}
        {employeeId && (
          <div className="border-t px-4 py-2.5 flex items-center justify-between bg-muted/30">
            <span className="text-sm text-muted-foreground">
              Assignments this week
            </span>
            <span className="text-lg font-bold">{totalAssignments}</span>
          </div>
        )}
      </div>

      {/* ── Daily Breakdown ── */}
      {/* ── Daily Breakdown ── */}
      <div className="space-y-2">
        {weekDates.map((dateObj) => {
            const dateStr = format(dateObj, "yyyy-MM-dd");
            const dayDispatches = dispatchesByDate.get(dateStr) || [];
            const today = isToday(dateObj);
            const isWeekend =
              dateObj.getDay() === 0 || dateObj.getDay() === 6;

            return (
              <div
                key={dateStr}
                className={`rounded-lg border bg-card overflow-hidden ${
                  today ? "ring-2 ring-primary/30" : ""
                } ${isWeekend && dayDispatches.length === 0 ? "opacity-50" : ""}`}
              >
                {/* Day header */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {format(dateObj, "EEE, MMM d")}
                    </span>
                    {today && (
                      <Badge
                        variant="default"
                        className="text-[10px] h-4 px-1.5"
                      >
                        Today
                      </Badge>
                    )}
                  </div>
                  {dayDispatches.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {dayDispatches.length}{" "}
                      {dayDispatches.length === 1 ? "site" : "sites"}
                    </Badge>
                  )}
                </div>

                {/* Dispatches for this day */}
                {dayDispatches.length > 0 ? (
                  <div className="divide-y">
                    {dayDispatches.map((dispatch) => {
                      const project = projects.find(
                        (p) => p.id === dispatch.projectId
                      );
                      const dispatchEquipment = dispatch.equipmentIds
                        .map((id) => equipment.find((e) => e.id === id))
                        .filter(Boolean);
                      const dispatchAttachments = dispatch.attachmentIds
                        .map((id) => attachments.find((a) => a.id === id))
                        .filter(Boolean);
                      const dispatchTools = dispatch.toolIds
                        .map((id) => tools.find((t) => t.id === id))
                        .filter(Boolean);

                      // Other employees on same dispatch
                      const coworkers = dispatch.employeeIds
                        .filter((id) => id !== employeeId)
                        .map((id) => employees.find((e) => e.id === id))
                        .filter(Boolean);

                      return (
                        <div key={dispatch.id} className="px-3 py-3 space-y-2">
                          {/* Project name + address */}
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div>
                              <span className="text-sm font-semibold">
                                {project?.name || "Unknown Project"}
                              </span>
                              {project?.address && (
                                <p className="text-xs text-muted-foreground">
                                  {project.address}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Coworkers */}
                          {coworkers.length > 0 && (
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="font-medium shrink-0">Crew:</span>
                              <span>
                                {coworkers.map((c) => c!.name).join(", ")}
                              </span>
                            </div>
                          )}

                          {/* Equipment / Attachments / Tools */}
                          <div className="flex flex-wrap gap-1.5">
                            {dispatchEquipment.map((eq) => (
                              <Badge
                                key={eq!.id}
                                variant="outline"
                                className="text-[10px] gap-1"
                              >
                                <Wrench className="h-2.5 w-2.5" />
                                {eq!.name}
                              </Badge>
                            ))}
                            {dispatchAttachments.map((att) => (
                              <Badge
                                key={att!.id}
                                variant="outline"
                                className="text-[10px] gap-1"
                              >
                                <Paperclip className="h-2.5 w-2.5" />
                                {att!.name}
                              </Badge>
                            ))}
                            {dispatchTools.map((tl) => (
                              <Badge
                                key={tl!.id}
                                variant="outline"
                                className="text-[10px] gap-1"
                              >
                                <Hammer className="h-2.5 w-2.5" />
                                {tl!.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-xs text-muted-foreground italic">
                    No dispatch
                  </div>
                )}
              </div>
            );
          })}
        </div>
    </div>
  );
}
