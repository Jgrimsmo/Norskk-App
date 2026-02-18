"use client";

import * as React from "react";
import { format, parseISO, eachDayOfInterval, isToday } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Clock,
  Pencil,
  Lock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  useProjects,
  useCostCodes,
  useTimeEntries,
} from "@/hooks/use-firestore";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import {
  getPayPeriod,
  getNextPayPeriod,
  getPreviousPayPeriod,
  type PayPeriod,
} from "@/lib/utils/pay-period";

// ────────────────────────────────────────────────────────
// Field Dashboard — Pay period view of time entries
// ────────────────────────────────────────────────────────

export function FieldDashboard() {
  const searchParams = useSearchParams();
  const { data: projects } = useProjects();
  const { data: costCodes } = useCostCodes();
  const { data: allEntries } = useTimeEntries();
  const { profile, loading: profileLoading } = useCompanyProfile();

  const employeeId = searchParams.get("employee") || "";

  // ── Pay period state ──
  const periodType = profile?.payPeriodType ?? "bi-weekly";
  const anchorDate = profile?.payPeriodStartDate ?? "";
  const [period, setPeriod] = React.useState<PayPeriod | null>(null);

  // Init to current period once profile loads
  React.useEffect(() => {
    if (!profileLoading && !period) {
      setPeriod(getPayPeriod(new Date(), periodType, anchorDate));
    }
  }, [profileLoading, period, periodType, anchorDate]);

  // ── Derived data ──

  // Entries for selected employee within the pay period
  const periodEntries = React.useMemo(() => {
    if (!employeeId || !period) return [];
    return allEntries
      .filter(
        (e) =>
          e.employeeId === employeeId &&
          e.date >= period.start &&
          e.date <= period.end
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allEntries, employeeId, period]);

  // Group entries by date
  const entriesByDate = React.useMemo(() => {
    const map = new Map<string, typeof periodEntries>();
    for (const entry of periodEntries) {
      const existing = map.get(entry.date) || [];
      existing.push(entry);
      map.set(entry.date, existing);
    }
    return map;
  }, [periodEntries]);

  // All dates in the period
  const periodDates = React.useMemo(() => {
    if (!period) return [];
    return eachDayOfInterval({
      start: parseISO(period.start),
      end: parseISO(period.end),
    });
  }, [period]);

  // Totals
  const totalHours = periodEntries.reduce((sum, e) => sum + e.hours, 0);

  const goToPrevious = () => {
    if (period) setPeriod(getPreviousPayPeriod(period, periodType, anchorDate));
  };
  const goToNext = () => {
    if (period) setPeriod(getNextPayPeriod(period, periodType, anchorDate));
  };
  const goToCurrent = () => {
    setPeriod(getPayPeriod(new Date(), periodType, anchorDate));
  };

  const currentPeriod = React.useMemo(
    () => getPayPeriod(new Date(), periodType, anchorDate),
    [periodType, anchorDate]
  );
  const isCurrentPeriod =
    period?.start === currentPeriod.start && period?.end === currentPeriod.end;

  if (profileLoading || !period) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            <CalendarDays className="h-5 w-5" />
            My Hours
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View your entries by pay period
          </p>
        </div>
      </div>

      {/* ── Pay Period Navigator ── */}
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
            <p className="text-sm font-semibold">{period.label}</p>
            {!isCurrentPeriod && (
              <button
                className="text-xs text-primary cursor-pointer hover:underline mt-0.5"
                onClick={goToCurrent}
              >
                Go to current
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

        {/* Period total */}
        {employeeId && (
          <div className="border-t px-4 py-2.5 flex items-center justify-between bg-muted/30">
            <span className="text-sm text-muted-foreground">Period Total</span>
            <span className="text-lg font-bold">{totalHours}h</span>
          </div>
        )}
      </div>

      {/* ── Daily Breakdown ── */}
      <div className="space-y-2">
        {periodDates.map((dateObj) => {
            const dateStr = format(dateObj, "yyyy-MM-dd");
            const dayEntries = entriesByDate.get(dateStr) || [];
            const dayTotal = dayEntries.reduce((s, e) => s + e.hours, 0);
            const today = isToday(dateObj);

            return (
              <div
                key={dateStr}
                className={`rounded-lg border bg-card overflow-hidden ${
                  today ? "ring-2 ring-primary/30" : ""
                }`}
              >
                {/* Day header */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {format(dateObj, "EEE, MMM d")}
                    </span>
                    {today && (
                      <Badge variant="default" className="text-[10px] h-4 px-1.5">
                        Today
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {dayTotal > 0 && (
                      <span className="text-sm font-bold">{dayTotal}h</span>
                    )}
                    <Link
                      href={`/field/entry?date=${dateStr}${employeeId ? `&employee=${employeeId}` : ""}`}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer text-primary"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Entries for this day */}
                {dayEntries.length > 0 && (
                  <div className="divide-y">
                    {dayEntries.map((entry) => {
                      const proj = projects.find(
                        (p) => p.id === entry.projectId
                      );
                      const cc = costCodes.find(
                        (c) => c.id === entry.costCodeId
                      );
                      const isLocked = entry.approval === "approved";

                      const entryContent = (
                        <div
                          className={`flex items-center gap-3 px-3 py-2 ${
                            !isLocked
                              ? "cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors"
                              : "opacity-80"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {proj?.name || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {cc?.description || "—"}
                              {entry.notes ? ` · ${entry.notes}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={
                                entry.approval === "approved"
                                  ? "default"
                                  : entry.approval === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[10px] h-4 px-1.5"
                            >
                              {entry.approval}
                            </Badge>
                            <span className="text-sm font-bold w-8 text-right">
                              {entry.hours}h
                            </span>
                            {isLocked ? (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      );

                      return isLocked ? (
                        <div key={entry.id}>{entryContent}</div>
                      ) : (
                        <Link
                          key={entry.id}
                          href={`/field/entry?edit=${entry.id}`}
                        >
                          {entryContent}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
