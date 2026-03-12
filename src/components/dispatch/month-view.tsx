"use client";

import { format, isToday, isSameMonth } from "date-fns";
import { Users } from "lucide-react";
import type { DispatchAssignment } from "@/lib/types/time-tracking";
import { getProjectColor } from "./dispatch-helpers";
import { useProjects } from "@/hooks/use-firestore";

interface MonthViewProps {
  days: Date[];
  currentDate: Date;
  getDispatches: (day: Date) => DispatchAssignment[];
  onAssign: (day: Date) => void;
  hasSelection: boolean;
  onExpandDay: (day: Date) => void;
}

export function MonthView({
  days,
  currentDate,
  getDispatches,
  onAssign,
  hasSelection,
  onExpandDay,
}: MonthViewProps) {
  const { data: projects } = useProjects();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[480px]">
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
      <div className="grid grid-cols-7 auto-rows-[minmax(110px,1fr)]">
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
                      className={`rounded-lg px-1.5 py-1 text-xs font-medium truncate shadow-md ${color.bg} ${color.text} cursor-pointer transition-colors`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpandDay(day);
                      }}
                    >
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${color.dot} shrink-0`} />
                        {project?.name}
                        <span className="ml-auto flex items-center gap-0.5 text-muted-foreground">
                          <Users className="h-2.5 w-2.5" />
                          {dispatch.employeeIds.filter((id) => {
                            const dayStr = format(day, "yyyy-MM-dd");
                            const ranges = dispatch.resourceDates?.[id];
                            if (!ranges) return true;
                            const arr = Array.isArray(ranges) ? ranges : [ranges as { start: string; end: string }];
                            return arr.some((r) => dayStr >= r.start && dayStr <= r.end);
                          }).length}
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
    </div>
  );
}
