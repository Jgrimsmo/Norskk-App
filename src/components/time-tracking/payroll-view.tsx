"use client";

import * as React from "react";
import { eachDayOfInterval, parseISO, format } from "date-fns";
import { useEmployees } from "@/hooks/use-firestore";
import type { TimeEntry, ApprovalStatus } from "@/lib/types/time-tracking";
import type { PayPeriod } from "@/lib/utils/pay-period";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HoursByStatus {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

const EMPTY_HOURS: HoursByStatus = { approved: 0, pending: 0, rejected: 0, total: 0 };

interface PayrollViewProps {
  entries: TimeEntry[];
  period: PayPeriod;
}

export function PayrollView({ entries, period }: PayrollViewProps) {
  const { data: employees } = useEmployees();
  const activeEmployees = React.useMemo(
    () => employees.filter((e) => e.status === "active"),
    [employees]
  );

  // All dates in the period
  const dates = React.useMemo(
    () =>
      eachDayOfInterval({
        start: parseISO(period.start),
        end: parseISO(period.end),
      }),
    [period.start, period.end]
  );

  // Build a lookup: employeeId → date string → hours by status
  const hoursMap = React.useMemo(() => {
    const map = new Map<string, Map<string, HoursByStatus>>();
    for (const entry of entries) {
      if (!map.has(entry.employeeId)) {
        map.set(entry.employeeId, new Map());
      }
      const dateMap = map.get(entry.employeeId)!;
      const dateKey = entry.date;
      const existing = dateMap.get(dateKey) ?? { ...EMPTY_HOURS };
      existing[entry.approval] += entry.hours;
      existing.total += entry.hours;
      dateMap.set(dateKey, existing);
    }
    return map;
  }, [entries]);

  const getCell = (employeeId: string, dateKey: string): HoursByStatus => {
    return hoursMap.get(employeeId)?.get(dateKey) ?? EMPTY_HOURS;
  };

  // Employee totals for the period
  const getEmployeeTotal = (employeeId: string): HoursByStatus => {
    const dateMap = hoursMap.get(employeeId);
    if (!dateMap) return EMPTY_HOURS;
    const result = { ...EMPTY_HOURS };
    for (const h of dateMap.values()) {
      result.approved += h.approved;
      result.pending += h.pending;
      result.rejected += h.rejected;
      result.total += h.total;
    }
    return result;
  };

  // Grand total
  const grandTotal = React.useMemo(() => {
    const result = { ...EMPTY_HOURS };
    for (const entry of entries) {
      result[entry.approval] += entry.hours;
      result.total += entry.hours;
    }
    return result;
  }, [entries]);

  // Day totals
  const dayTotals = React.useMemo(() => {
    return dates.map((d) => {
      const dateKey = format(d, "yyyy-MM-dd");
      const result = { ...EMPTY_HOURS };
      for (const dateMap of hoursMap.values()) {
        const cell = dateMap.get(dateKey);
        if (cell) {
          result.approved += cell.approved;
          result.pending += cell.pending;
          result.rejected += cell.rejected;
          result.total += cell.total;
        }
      }
      return result;
    });
  }, [dates, hoursMap]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="sticky left-0 z-10 bg-muted/50 min-w-[180px] text-xs font-semibold px-3">
                  Employee
                </TableHead>
                {dates.map((d) => {
                  const dayName = format(d, "EEE");
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <TableHead
                      key={d.toISOString()}
                      className={`text-center text-xs font-semibold px-2 min-w-[60px] ${
                        isWeekend ? "bg-muted/80" : ""
                      }`}
                    >
                      <div>{dayName}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {format(d, "MMM d")}
                      </div>
                    </TableHead>
                  );
                })}
                <TableHead className="text-center text-xs font-semibold px-3 min-w-[70px] bg-muted/80">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEmployees.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={dates.length + 2}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No active employees found.
                  </TableCell>
                </TableRow>
              )}
              {activeEmployees.map((emp) => {
                const empTotal = getEmployeeTotal(emp.id);
                const hasMissingDays = dates.some((d) => {
                  if (d.getDay() === 0 || d.getDay() === 6) return false;
                  const dateKey = format(d, "yyyy-MM-dd");
                  return getCell(emp.id, dateKey).total === 0;
                });

                return (
                  <TableRow
                    key={emp.id}
                    className={`h-[36px] ${hasMissingDays ? "bg-yellow-50/50" : ""}`}
                  >
                    <TableCell className="sticky left-0 z-10 bg-card text-xs font-medium px-3 whitespace-nowrap border-r">
                      <div className="flex items-center gap-2">
                        <span>{emp.name}</span>
                        {hasMissingDays && (
                          <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" title="Missing hours on a weekday" />
                        )}
                      </div>
                    </TableCell>
                    {dates.map((d) => {
                      const dateKey = format(d, "yyyy-MM-dd");
                      const cell = getCell(emp.id, dateKey);
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isMissing = !isWeekend && cell.total === 0;

                      return (
                        <TableCell
                          key={dateKey}
                          className={`text-center text-xs px-1 ${
                            isWeekend
                              ? "bg-muted/30"
                              : isMissing
                                ? "bg-red-50/60"
                                : ""
                          }`}
                        >
                          {cell.total > 0 ? (
                            <HoursCell cell={cell} />
                          ) : isWeekend ? (
                            <span className="text-muted-foreground/40">—</span>
                          ) : (
                            <span className="text-red-300">0</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center text-xs font-semibold px-2 bg-muted/30 border-l">
                      <HoursCell cell={empTotal} bold />
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Totals row */}
              <TableRow className="bg-muted/50 hover:bg-muted/50 font-semibold">
                <TableCell className="sticky left-0 z-10 bg-muted/50 text-xs font-semibold px-3 border-r">
                  Daily Total
                </TableCell>
                {dayTotals.map((total, i) => (
                  <TableCell
                    key={dates[i].toISOString()}
                    className="text-center text-xs font-semibold px-1"
                  >
                    {total.total > 0 ? <HoursCell cell={total} bold /> : "—"}
                  </TableCell>
                ))}
                <TableCell className="text-center text-xs font-bold px-2 bg-muted/80 border-l">
                  <HoursCell cell={grandTotal} bold />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
          Missing weekday hours
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded bg-red-50 border border-red-100" />
          No hours
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-green-600 font-semibold">8</span>
          Approved
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-600 font-semibold">8</span>
          Pending
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-500 font-semibold line-through">8</span>
          Rejected
        </div>
        <span>
          {activeEmployees.length} employees · {grandTotal.total} total hours
        </span>
      </div>
    </div>
  );
}

// ── Hours cell with approval coloring + tooltip ──
function HoursCell({ cell, bold }: { cell: HoursByStatus; bold?: boolean }) {
  // Determine primary color based on dominant status
  const allApproved = cell.pending === 0 && cell.rejected === 0;
  const allPending = cell.approved === 0 && cell.rejected === 0;
  const allRejected = cell.approved === 0 && cell.pending === 0;
  const mixed = !allApproved && !allPending && !allRejected;

  const colorClass = allApproved
    ? "text-green-600"
    : allPending
      ? "text-yellow-600"
      : allRejected
        ? "text-red-500 line-through"
        : "text-foreground";

  const content = (
    <span className={`${bold ? "font-semibold" : "font-medium"} ${colorClass}`}>
      {cell.total}
    </span>
  );

  // Show tooltip with breakdown when there are mixed statuses or always for context
  if (mixed || cell.total > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">{content}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-0.5">
            {cell.approved > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-green-600">Approved:</span>
                <span className="font-medium">{cell.approved}h</span>
              </div>
            )}
            {cell.pending > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">Pending:</span>
                <span className="font-medium">{cell.pending}h</span>
              </div>
            )}
            {cell.rejected > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-red-500">Rejected:</span>
                <span className="font-medium">{cell.rejected}h</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
