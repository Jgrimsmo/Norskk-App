"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  FileText,
  Plus,
  Search,
  Camera,
  Users,
} from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ExportDialog } from "@/components/shared/export-dialog";
import type { ExportColumnDef, ExportConfig } from "@/components/shared/export-dialog";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl } from "@/lib/export/pdf";
import { dailyReportCSVColumns, dailyReportPDFColumns, dailyReportPDFRows } from "@/lib/export/columns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ColumnFilter } from "@/components/time-tracking/column-filter";
import { DateColumnFilter } from "@/components/time-tracking/date-column-filter";
import DailyReportFormDialog from "@/components/daily-reports/daily-report-form-dialog";
import type { DateRange } from "react-day-picker";

import {
  useEmployees,
  useProjects,
} from "@/hooks/use-firestore";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { SavingIndicator } from "@/components/shared/saving-indicator";

import type {
  DailyReport,
  WeatherCondition,
  Employee,
  Project,
} from "@/lib/types/time-tracking";

// ── Helpers ──
function nextId(): string {
  return `dr-${crypto.randomUUID().slice(0, 8)}`;
}

import { dailyReportStatusColors as statusColors } from "@/lib/constants/status-colors";

const weatherLabels: Record<WeatherCondition, string> = {
  sunny: "☀️ Sunny",
  "partly-cloudy": "⛅ Partly Cloudy",
  cloudy: "☁️ Cloudy",
  overcast: "🌥️ Overcast",
  rain: "🌧️ Rain",
  snow: "🌨️ Snow",
  fog: "🌫️ Fog",
  windy: "💨 Windy",
  thunderstorm: "⛈️ Thunderstorm",
};

function createBlankReport(): DailyReport {
  const now = new Date();
  return {
    id: nextId(),
    reportNumber: Math.floor(Math.random() * 9000) + 1000,
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm"),
    projectId: "",
    authorId: "",
    status: "draft",
    weather: {
      temperature: "",
      conditions: [],
      windSpeed: "",
      precipitation: "",
      groundConditions: "dry",
      weatherDelay: false,
      delayHours: 0,
      notes: "",
    },
    workDescription: "",
    morningPhotoUrls: [],
    workPhotoUrls: [],
    endOfDayPhotoUrls: [],
    onSiteStaff: [],
    onSiteEquipment: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export default function DailyReportsTable() {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const [reports, setReports, , reportsSaving] = useFirestoreState<DailyReport>(Collections.DAILY_REPORTS);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeReport, setActiveReport] = React.useState<DailyReport | null>(
    null
  );
  const [pendingNew, setPendingNew] = React.useState(false);

  // Filters
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [projectFilter, setProjectFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [authorFilter, setAuthorFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = React.useState("");

  // Lookups
  const getProjectName = React.useCallback((id: string) => {
    const p = projects.find((p) => p.id === id);
    return p ? p.name : "—";
  }, [projects]);
  const getEmployeeName = React.useCallback(
    (id: string) => employees.find((e) => e.id === id)?.name ?? "—",
    [employees]
  );

  // Filtering
  const filteredReports = React.useMemo(() => {
    return reports.filter((r) => {
      // Date range
      if (dateRange?.from || dateRange?.to) {
        const d = parseISO(r.date);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
      }
      // Project
      if (projectFilter.size > 0 && !projectFilter.has(r.projectId))
        return false;
      // Author
      if (authorFilter.size > 0 && !authorFilter.has(r.authorId)) return false;
      // Status
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const pName = getProjectName(r.projectId).toLowerCase();
        const aName = getEmployeeName(r.authorId).toLowerCase();
        const rNum = String(r.reportNumber);
        if (
          !pName.includes(q) &&
          !aName.includes(q) &&
          !rNum.includes(q) &&
          !(r.workDescription ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [
    reports,
    dateRange,
    projectFilter,
    authorFilter,
    statusFilter,
    searchQuery,
    getProjectName,
    getEmployeeName,
  ]);

  // Open report dialog
  const openReport = (report: DailyReport) => {
    setActiveReport({ ...report });
    setPendingNew(false);
    setDialogOpen(true);
  };

  // New report
  const handleNewReport = () => {
    const blank = createBlankReport();
    setActiveReport(blank);
    setPendingNew(true);
    setDialogOpen(true);
  };

  // Save
  const handleSave = (updated: DailyReport) => {
    if (pendingNew) {
      setReports((prev) => [updated, ...prev]);
      setPendingNew(false);
    } else {
      setReports((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    }
    setDialogOpen(false);
    setActiveReport(null);
  };

  // Delete
  const handleDelete = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  // Filter options
  const projectOptions = [...new Set(reports.map((r) => r.projectId))].map(
    (id) => ({ id, label: getProjectName(id) })
  );
  const authorOptions = [...new Set(reports.map((r) => r.authorId))].map(
    (id) => ({ id, label: getEmployeeName(id) })
  );
  const statusOptions = [
    { id: "draft", label: "Draft" },
    { id: "submitted", label: "Submitted" },
    { id: "approved", label: "Approved" },
  ];

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports…"
            aria-label="Search reports"
            className="h-8 text-xs pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <DailyReportsExport reports={filteredReports} employees={employees} projects={projects} />
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer gap-1"
            onClick={handleNewReport}
          >
            <Plus className="h-3 w-3" />
            New Daily Report
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">
                <DateColumnFilter
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </TableHead>
              <TableHead className="w-[70px]">Time</TableHead>
              <TableHead>
                <ColumnFilter
                  title="Project"
                  options={projectOptions}
                  selected={projectFilter}
                  onChange={setProjectFilter}
                />
              </TableHead>
              <TableHead>
                <ColumnFilter
                  title="Author"
                  options={authorOptions}
                  selected={authorFilter}
                  onChange={setAuthorFilter}
                />
              </TableHead>
              <TableHead className="w-[120px]">Weather</TableHead>
              <TableHead className="w-[70px]">Staff</TableHead>
              <TableHead className="w-[60px]">Photos</TableHead>
              <TableHead className="w-[90px]">
                <ColumnFilter
                  title="Status"
                  options={statusOptions}
                  selected={statusFilter}
                  onChange={setStatusFilter}
                />
              </TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No reports found
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => {
                const totalPhotos =
                  (report.morningPhotoUrls?.length ?? 0) +
                  (report.workPhotoUrls?.length ?? 0) +
                  (report.endOfDayPhotoUrls?.length ?? 0);
                const weatherStr =
                  report.weather.conditions.length > 0
                    ? report.weather.conditions
                        .map((c) => weatherLabels[c]?.split(" ")[0] ?? c)
                        .join("")
                    : "—";

                return (
                  <TableRow
                    key={report.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => openReport(report)}
                  >
                    <TableCell className="text-xs font-medium">
                      {format(parseISO(report.date), "MM/dd/yyyy")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {report.time || "—"}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">
                      {getProjectName(report.projectId)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getEmployeeName(report.authorId)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span title={report.weather.conditions.join(", ")}>
                        {weatherStr}{" "}
                        <span className="text-muted-foreground">
                          {report.weather.temperature}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {(report.onSiteStaff ?? []).length > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {(report.onSiteStaff ?? []).length}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {totalPhotos > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Camera className="h-3 w-3 text-muted-foreground" />
                          {totalPhotos}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${statusColors[report.status]}`}
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DeleteConfirmButton
                        onConfirm={() => handleDelete(report.id)}
                        itemLabel="this daily report"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      {activeReport && (
        <DailyReportFormDialog
          open={dialogOpen}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setDialogOpen(false);
              setActiveReport(null);
              setPendingNew(false);
            }
          }}
          report={activeReport}
          onSave={handleSave}
        />
      )}
      <SavingIndicator saving={reportsSaving} />
    </>
  );
}

// ── Export sub-component ──
const DAILY_REPORT_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "date", header: "Date" },
  { id: "time", header: "Time" },
  { id: "project", header: "Project" },
  { id: "author", header: "Author" },
  { id: "weather", header: "Weather" },
  { id: "staff", header: "Staff" },
  { id: "photos", header: "Photos" },
  { id: "status", header: "Status" },
];

const DAILY_REPORT_GROUP_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "author", label: "Author" },
  { value: "status", label: "Status" },
];

function DailyReportsExport({ reports, employees, projects }: { reports: DailyReport[]; employees: Employee[]; projects: Project[] }) {
  const { profile } = useCompanyProfile();

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(reports, dailyReportCSVColumns(employees, projects), filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(reports, dailyReportCSVColumns(employees, projects), filename, config.selectedColumns);
    } else {
      generatePDF({
        title: config.title,
        filename,
        company: profile,
        columns: dailyReportPDFColumns,
        rows: dailyReportPDFRows(reports, employees, projects),
        orientation: config.orientation,
        selectedColumns: config.selectedColumns,
        groupBy: config.groupBy,
      });
    }
  };

  const handlePreview = (config: ExportConfig) =>
    generatePDFBlobUrl({
      title: config.title,
      filename: "preview",
      company: profile,
      columns: dailyReportPDFColumns,
      rows: dailyReportPDFRows(reports, employees, projects),
      orientation: config.orientation,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
    });

  return (
    <ExportDialog
      columns={DAILY_REPORT_EXPORT_COLUMNS}
      groupOptions={DAILY_REPORT_GROUP_OPTIONS}
      defaultTitle="Daily Reports"
      defaultOrientation="landscape"
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={reports.length === 0}
      recordCount={reports.length}
    />
  );
}
