"use client";

import * as React from "react";
import { Clock, Filter, TableProperties, Users } from "lucide-react";
import { parseISO, isWithinInterval } from "date-fns";

import { TimeTrackingTable } from "@/components/time-tracking/time-tracking-table";
import { PayrollView } from "@/components/time-tracking/payroll-view";
import { PayPeriodPicker } from "@/components/time-tracking/pay-period-picker";
import type { PayPeriod } from "@/lib/utils/pay-period";
import { type TimeEntry } from "@/lib/types/time-tracking";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { Skeleton } from "@/components/ui/skeleton";
import { SavingIndicator } from "@/components/shared/saving-indicator";
import { RequirePermission } from "@/components/require-permission";

type ViewMode = "entries" | "payroll";

export default function TimeTrackingPage() {
  const [entries, setEntries, loading, saving] = useFirestoreState<TimeEntry>(Collections.TIME_ENTRIES);
  const [payPeriod, setPayPeriod] = React.useState<PayPeriod | null>(null);
  const [view, setView] = React.useState<ViewMode>("entries");

  // Filter entries to the selected pay period
  const periodEntries = React.useMemo(() => {
    if (!payPeriod) return entries;
    const start = parseISO(payPeriod.start);
    const end = parseISO(payPeriod.end);
    return entries.filter((e) => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start, end });
    });
  }, [entries, payPeriod]);

  // Summary stats scoped to the pay period
  const totalHours = periodEntries.reduce((sum, e) => sum + e.hours, 0);
  const pendingCount = periodEntries.filter((e) => e.approval === "pending").length;
  const approvedCount = periodEntries.filter((e) => e.approval === "approved").length;

  return (
    <RequirePermission permission="time-tracking.view">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Time Tracking
          </h1>
          <p className="text-muted-foreground">
            Track employee hours, overtime, and labor costs.
          </p>
        </div>
      </div>

      {/* Pay Period Picker + View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PayPeriodPicker period={payPeriod} onPeriodChange={setPayPeriod} />
        <div className="flex items-center rounded-lg border bg-card shadow-sm overflow-hidden">
          <button
            onClick={() => setView("entries")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              view === "entries"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <TableProperties className="h-3.5 w-3.5" />
            Entries
          </button>
          <button
            onClick={() => setView("payroll")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              view === "payroll"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Payroll
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Total Hours
          </div>
          <div className="mt-1 text-2xl font-bold">{totalHours}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Pending Approval
          </div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">
            {pendingCount}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Approved
          </div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {approvedCount}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : view === "payroll" && payPeriod ? (
        <PayrollView entries={periodEntries} period={payPeriod} />
      ) : (
        <TimeTrackingTable
          entries={periodEntries}
          onEntriesChange={setEntries}
        />
      )}
      <SavingIndicator saving={saving} />
    </div>
    </RequirePermission>
  );
}
