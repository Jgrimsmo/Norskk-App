"use client";

import * as React from "react";
import { Clock, Download, Filter } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { TimeTrackingTable } from "@/components/time-tracking/time-tracking-table";
import { type TimeEntry } from "@/lib/types/time-tracking";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { Skeleton } from "@/components/ui/skeleton";
import { SavingIndicator } from "@/components/shared/saving-indicator";

export default function TimeTrackingPage() {
  const [entries, setEntries, loading, saving] = useFirestoreState<TimeEntry>(Collections.TIME_ENTRIES);

  // Summary stats (over all entries)
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const pendingCount = entries.filter((e) => e.approval === "pending").length;
  const approvedCount = entries.filter((e) => e.approval === "approved").length;

  return (
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
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => toast.info("Export coming soon", { description: "CSV and PDF export will be available once the backend is connected." })}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
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

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <TimeTrackingTable
          entries={entries}
          onEntriesChange={setEntries}
        />
      )}
      <SavingIndicator saving={saving} />
    </div>
  );
}
