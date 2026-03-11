"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Search,
  Camera,
  Users,
  Wrench,
  Clock,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { generateDailyReportPDF, generateDailyReportPDFBlobUrl } from "@/lib/export/react-pdf/daily-report";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useTimeEntries,
  useEquipment,
  useCostCodes,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { SavingIndicator } from "@/components/shared/saving-indicator";

import type {
  DailyReport,
  Employee,
  Project,
  Equipment as EquipmentType,
} from "@/lib/types/time-tracking";

// ── Helpers ──
function nextId(): string {
  return `dr-${crypto.randomUUID().slice(0, 8)}`;
}

function createBlankReport(): DailyReport {
  const now = new Date();
  return {
    id: nextId(),
    reportNumber: Math.floor(Math.random() * 9000) + 1000,
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm"),
    projectId: "",
    authorId: "",
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
  const { data: timeEntries } = useTimeEntries();
  const { data: equipment } = useEquipment();
  const { data: costCodes } = useCostCodes();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();
  const { profile } = useCompanyProfile();
  const [reports, setReports, , reportsSaving] = useFirestoreState<DailyReport>(Collections.DAILY_REPORTS);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeReport, setActiveReport] = React.useState<DailyReport | null>(
    null
  );
  const [pendingNew, setPendingNew] = React.useState(false);

  // PDF Preview state
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewReportId, setPreviewReportId] = React.useState<string | null>(null);

  // Cleanup blob URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Filters
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [projectFilter, setProjectFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [authorFilter, setAuthorFilter] = React.useState<Set<string>>(
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
  const getEquipmentName = React.useCallback(
    (id: string) => equipment.find((e: EquipmentType) => e.id === id)?.name ?? id,
    [equipment]
  );

  // Time entries count per report (matched by date + projectId)
  const timeEntryCountByReport = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reports) {
      const count = timeEntries.filter(
        (te) => te.date === r.date && te.projectId === r.projectId
      ).length;
      map.set(r.id, count);
    }
    return map;
  }, [reports, timeEntries]);

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

  // Export single report PDF — show preview
  const handleExportReport = async (report: DailyReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewLoading(true);
    setPreviewReportId(report.id);
    try {
      const url = await generateDailyReportPDFBlobUrl({
        report,
        employees,
        projects,
        equipment,
        timeEntries,
        costCodes,
        attachments,
        tools,
        company: profile,
      });
      setPreviewUrl(url);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Download from preview
  const handleDownloadFromPreview = () => {
    const report = reports.find((r) => r.id === previewReportId);
    if (!report) return;
    generateDailyReportPDF({
      report,
      employees,
      projects,
      equipment,
      timeEntries,
      costCodes,
      attachments,
      tools,
      company: profile,
    });
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewReportId(null);
  };

  // Filter options
  const projectOptions = React.useMemo(
    () => [...new Set(reports.map((r) => r.projectId))].map(
      (id) => ({ id, label: getProjectName(id) })
    ),
    [reports, getProjectName]
  );
  const authorOptions = React.useMemo(
    () => [...new Set(reports.map((r) => r.authorId))].map(
      (id) => ({ id, label: getEmployeeName(id) })
    ),
    [reports, getEmployeeName]
  );
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
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer gap-1"
            onClick={handleNewReport}
          >
            <Plus className="h-3.5 w-3.5" />
            New Daily Report
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
              <TableHead className="w-[100px] text-xs font-semibold px-3">
                <DateColumnFilter
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </TableHead>
              <TableHead className="w-[60px] text-xs font-semibold px-3">Time</TableHead>
              <TableHead className="min-w-[140px] text-xs font-semibold px-3">
                <ColumnFilter
                  title="Project"
                  options={projectOptions}
                  selected={projectFilter}
                  onChange={setProjectFilter}
                />
              </TableHead>
              <TableHead className="min-w-[120px] text-xs font-semibold px-3">
                <ColumnFilter
                  title="Author"
                  options={authorOptions}
                  selected={authorFilter}
                  onChange={setAuthorFilter}
                />
              </TableHead>
              <TableHead className="min-w-[160px] text-xs font-semibold px-3">Work Description</TableHead>
              <TableHead className="w-[70px] text-xs font-semibold px-3">Staff</TableHead>
              <TableHead className="w-[90px] text-xs font-semibold px-3">Equipment</TableHead>
              <TableHead className="w-[60px] text-xs font-semibold px-3">Photos</TableHead>
              <TableHead className="w-[90px] text-xs font-semibold px-3">Time Entries</TableHead>
              <TableHead className="w-[50px] text-xs font-semibold px-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  No reports found.
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => {
                const totalPhotos =
                  (report.morningPhotoUrls?.length ?? 0) +
                  (report.workPhotoUrls?.length ?? 0) +
                  (report.endOfDayPhotoUrls?.length ?? 0);
                const equipCount = (report.onSiteEquipment ?? []).length;
                const teCount = timeEntryCountByReport.get(report.id) ?? 0;

                return (
                  <TableRow
                    key={report.id}
                    className="group h-[36px] cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => openReport(report)}
                  >
                    <TableCell className="text-xs font-medium px-3">
                      {format(parseISO(report.date), "MM/dd/yyyy")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground px-3">
                      {report.time || "—"}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[200px] px-3">
                      {getProjectName(report.projectId)}
                    </TableCell>
                    <TableCell className="text-xs px-3">
                      {getEmployeeName(report.authorId)}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[200px] text-muted-foreground px-3">
                      {report.workDescription || "—"}
                    </TableCell>
                    <TableCell className="text-xs px-3">
                      {(report.onSiteStaff ?? []).length > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {(report.onSiteStaff ?? []).length}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs px-3">
                      {equipCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Wrench className="h-3 w-3 text-muted-foreground" />
                          {equipCount}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs px-3">
                      {totalPhotos > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Camera className="h-3 w-3 text-muted-foreground" />
                          {totalPhotos}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs px-3">
                      {teCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {teCount}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={(e) => handleExportReport(report, e)}
                          title="Preview PDF"
                          disabled={previewLoading && previewReportId === report.id}
                        >
                          {previewLoading && previewReportId === report.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <DeleteConfirmButton
                          onConfirm={() => handleDelete(report.id)}
                          itemLabel="this daily report"
                        />
                      </div>
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
      {/* PDF Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              PDF Preview
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 rounded-md border overflow-hidden">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="PDF Preview"
              />
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 cursor-pointer"
              onClick={closePreview}
            >
              Close
            </Button>
            <div className="flex-1" />
            <Button
              className="gap-2 cursor-pointer bg-red-700 hover:bg-red-800 text-white"
              size="sm"
              onClick={handleDownloadFromPreview}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SavingIndicator saving={reportsSaving} />
    </>
  );
}
