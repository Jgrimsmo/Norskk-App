"use client";

import DailyReportsTable from "@/components/daily-reports/daily-reports-table";
import { RequirePermission } from "@/components/require-permission";

export default function DailyReportsPage() {
  return (
    <RequirePermission permission="daily-reports.view">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Daily Reports
        </h1>
        <p className="text-muted-foreground">
          Daily site logs with weather, manpower, work performed, delays, and deliveries.
        </p>
      </div>

      <DailyReportsTable />
    </div>
    </RequirePermission>
  );
}
