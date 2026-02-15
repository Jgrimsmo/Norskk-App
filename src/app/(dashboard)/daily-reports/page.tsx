import DailyReportsTable from "@/components/daily-reports/daily-reports-table";

export default function DailyReportsPage() {
  return (
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
  );
}
