"use client";

import * as React from "react";
import Link from "next/link";
import { DateRange } from "react-day-picker";
import Image from "next/image";
import {
  ArrowLeft,
  Clock,
  FileText,
  ShieldCheck,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  MapPin,
  User,
  Hash,
  Pencil,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { CellInput } from "@/components/shared/cell-input";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CellSelect } from "@/components/shared/cell-select";
import { SavingIndicator } from "@/components/shared/saving-indicator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateColumnFilter } from "@/components/time-tracking/date-column-filter";
import DailyReportFormDialog from "@/components/daily-reports/daily-report-form-dialog";

import { useFirestoreState } from "@/hooks/use-firestore-state";
import {
  useEmployees,
  useCostCodes,
  useSafetyForms,
} from "@/hooks/use-firestore";
import { Collections } from "@/lib/firebase/collections";
import {
  projectStatusColors,
  dailyReportStatusColors,
  safetyStatusColors,
} from "@/lib/constants/status-colors";
import type {
  ProjectStatus,
  Project,
  SafetyFormType,
  TimeEntry,
  DailyReport,
} from "@/lib/types/time-tracking";

// ────────────────────────────────────────────
// Labels
// ────────────────────────────────────────────

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  "on-hold": "On Hold",
  completed: "Completed",
  bidding: "Bidding",
};

const formTypeLabels: Record<SafetyFormType, string> = {
  flha: "FLHA",
  "toolbox-talk": "Toolbox Talk",
  "near-miss": "Near Miss",
  "incident-report": "Incident Report",
  "safety-inspection": "Safety Inspection",
};

const workTypeOptions = [
  { id: "lump-sum", label: "Lump Sum" },
  { id: "tm", label: "T&M" },
];

const approvalOptions = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

// ────────────────────────────────────────────
// Date range helper
// ────────────────────────────────────────────

function matchesDateRange(dateStr: string, range: DateRange | undefined): boolean {
  if (!range?.from) return true;
  const d = new Date(dateStr + "T00:00:00");
  if (range.from && d < new Date(range.from.toDateString())) return false;
  if (range.to && d > new Date(range.to.toDateString())) return false;
  return true;
}

// ────────────────────────────────────────────
// Photo gallery lightbox with date filter
// ────────────────────────────────────────────

interface PhotoWithDate {
  url: string;
  date: string;
  category: string;
}

function PhotoGallery({ photos }: { photos: PhotoWithDate[] }) {
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const filtered = React.useMemo(() => {
    if (!dateRange?.from) return photos;
    return photos.filter((p) => matchesDateRange(p.date, dateRange));
  }, [photos, dateRange]);

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No photos found for this project.
      </div>
    );
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3">
        <DateColumnFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {photos.length} photos
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No photos match the selected date range.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((photo, idx) => (
            <button
              key={photo.url}
              onClick={() => setLightboxIdx(idx)}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted/30 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
            >
              <Image
                src={photo.url}
                alt={`Photo ${idx + 1}`}
                fill
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Date overlay */}
              <span className="absolute bottom-1 left-1 text-[9px] text-white bg-black/50 px-1.5 py-0.5 rounded">
                {photo.date} · {photo.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog
        open={lightboxIdx !== null}
        onOpenChange={(open) => !open && setLightboxIdx(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-full h-[95vh] max-h-[95vh] p-0 border-none bg-black/95 flex items-center justify-center">
          <DialogTitle className="sr-only">Photo viewer</DialogTitle>
          {lightboxIdx !== null && (
            <>
              <Image
                src={filtered[lightboxIdx].url}
                alt={`Photo ${lightboxIdx + 1}`}
                width={1600}
                height={1200}
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
              <span className="absolute top-4 left-4 text-white/80 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                {lightboxIdx + 1} / {filtered.length}
              </span>
              <span className="absolute bottom-4 left-4 text-white/70 text-xs bg-black/50 px-2 py-1 rounded">
                {filtered[lightboxIdx].date} · {filtered[lightboxIdx].category}
              </span>
              {filtered.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIdx(
                        (lightboxIdx - 1 + filtered.length) % filtered.length
                      );
                    }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIdx((lightboxIdx + 1) % filtered.length);
                    }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ────────────────────────────────────────────
// Cost Codes tab
// ────────────────────────────────────────────

function CostCodesTab({
  assignedIds,
  onToggle,
}: {
  assignedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  const { data: allCodes } = useCostCodes();
  const [search, setSearch] = React.useState("");
  const assigned = new Set(assignedIds);

  const filtered = allCodes
    .filter((cc) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return cc.code.toLowerCase().includes(q) || cc.description.toLowerCase().includes(q);
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select which cost codes are available on this project.
        </p>
        <span className="text-xs text-muted-foreground">
          {assignedIds.length} of {allCodes.length} assigned
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cost codes…"
          className="h-8 text-xs pl-8"
        />
      </div>

      {allCodes.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No cost codes found. Add them in Settings → Cost Codes.
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {filtered.map((cc) => (
            <label
              key={cc.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <Checkbox
                checked={assigned.has(cc.id)}
                onCheckedChange={(v) => onToggle(cc.id, !!v)}
              />
              <span className="text-xs font-mono font-semibold text-primary w-[90px] shrink-0">
                {cc.code}
              </span>
              <span className="text-xs text-muted-foreground">{cc.description}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No cost codes match your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  // ── Data sources ──
  const [projects, setProjects, loadingProjects, savingProjects] = useFirestoreState<Project>(Collections.PROJECTS);
  const { data: employees } = useEmployees();
  const { data: costCodes } = useCostCodes();
  const { data: safetyForms, loading: loadingSafety } = useSafetyForms();

  // Editable collections
  const [allTimeEntries, setAllTimeEntries, loadingTime, savingTime] =
    useFirestoreState<TimeEntry>(Collections.TIME_ENTRIES);
  const [allDailyReports, setAllDailyReports, loadingReports, savingReports] =
    useFirestoreState<DailyReport>(Collections.DAILY_REPORTS);

  const project = projects.find((p) => p.id === projectId);
  const loading = loadingProjects || loadingTime || loadingReports || loadingSafety;
  const saving = savingTime || savingReports || savingProjects;

  // ── Unlock approved entries for editing ──
  const [unlockedIds, setUnlockedIds] = React.useState<Set<string>>(new Set());

  // ── Date filter state (per tab) ──
  const [timeDateRange, setTimeDateRange] = React.useState<DateRange | undefined>(undefined);
  const [reportDateRange, setReportDateRange] = React.useState<DateRange | undefined>(undefined);
  const [safetyDateRange, setSafetyDateRange] = React.useState<DateRange | undefined>(undefined);

  // ── Daily report dialog state ──
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeReport, setActiveReport] = React.useState<DailyReport | null>(null);

  // ── Filtered data ──
  const projectTimeEntries = React.useMemo(
    () =>
      allTimeEntries
        .filter((te) => te.projectId === projectId && matchesDateRange(te.date, timeDateRange))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allTimeEntries, projectId, timeDateRange]
  );

  const projectDailyReports = React.useMemo(
    () =>
      allDailyReports
        .filter((dr) => dr.projectId === projectId && matchesDateRange(dr.date, reportDateRange))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allDailyReports, projectId, reportDateRange]
  );

  const allProjectReports = React.useMemo(
    () => allDailyReports.filter((dr) => dr.projectId === projectId),
    [allDailyReports, projectId]
  );

  const projectSafetyForms = React.useMemo(
    () =>
      safetyForms
        .filter((sf) => sf.projectId === projectId && matchesDateRange(sf.date, safetyDateRange))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [safetyForms, projectId, safetyDateRange]
  );

  // ── All photos with date metadata ──
  const allPhotos = React.useMemo(() => {
    const photos: PhotoWithDate[] = [];
    allProjectReports.forEach((dr) => {
      (dr.morningPhotoUrls ?? []).forEach((url) =>
        photos.push({ url, date: dr.date, category: "Morning" })
      );
      (dr.workPhotoUrls ?? []).forEach((url) =>
        photos.push({ url, date: dr.date, category: "Work" })
      );
      (dr.endOfDayPhotoUrls ?? []).forEach((url) =>
        photos.push({ url, date: dr.date, category: "End of Day" })
      );
      (dr.photoUrls ?? []).forEach((url) =>
        photos.push({ url, date: dr.date, category: "General" })
      );
    });
    return photos;
  }, [allProjectReports]);

  // ── Helpers ──
  const getEmployeeName = (id: string) =>
    employees.find((e) => e.id === id)?.name ?? "—";

  const employeeOptions = employees.map((e) => ({ id: e.id, label: e.name }));
  const costCodeOptions = costCodes.map((c) => ({ id: c.id, label: c.description }));

  // ── Total hours (unfiltered for summary card) ──
  const allProjectTimeEntries = React.useMemo(
    () => allTimeEntries.filter((te) => te.projectId === projectId),
    [allTimeEntries, projectId]
  );
  const totalHours = React.useMemo(
    () => allProjectTimeEntries.reduce((sum, te) => sum + (te.hours || 0), 0),
    [allProjectTimeEntries]
  );
  const filteredHours = React.useMemo(
    () => projectTimeEntries.reduce((sum, te) => sum + (te.hours || 0), 0),
    [projectTimeEntries]
  );

  // ── Time entry inline edit ──
  const updateTimeEntry = React.useCallback(
    (id: string, field: keyof TimeEntry, value: string | number) => {
      setAllTimeEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
      // If approval changed away from approved, auto-lock again
      if (field === "approval" && value !== "approved") {
        setUnlockedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [setAllTimeEntries]
  );

  const unlockRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlockedIds((prev) => new Set(prev).add(id));
  };

  // ── Daily report handlers ──
  const openReport = (report: DailyReport) => {
    setActiveReport({ ...report });
    setDialogOpen(true);
  };

  const handleSaveReport = (updated: DailyReport) => {
    setAllDailyReports((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
    setDialogOpen(false);
    setActiveReport(null);
  };

  // ── Loading / Not found ──
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Project not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon" className="h-9 w-9 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {project.name}
            </h1>
            <Badge
              variant="outline"
              className={`text-xs font-medium capitalize ${projectStatusColors[project.status]}`}
            >
              {statusLabels[project.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            {project.number && (
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {project.number}
              </span>
            )}
            {project.developer && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {project.developer}
              </span>
            )}
            {(project.address || project.city || project.province) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[project.address, project.city, project.province].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Time Entries
          </div>
          <div className="mt-1 text-2xl font-bold">{allProjectTimeEntries.length}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalHours.toFixed(1)} total hours
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            Daily Reports
          </div>
          <div className="mt-1 text-2xl font-bold">{allProjectReports.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Safety Forms
          </div>
          <div className="mt-1 text-2xl font-bold">
            {safetyForms.filter((sf) => sf.projectId === projectId).length}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            Photos
          </div>
          <div className="mt-1 text-2xl font-bold">{allPhotos.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="time-entries">
        <TabsList>
          <TabsTrigger value="time-entries" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Time Entries
          </TabsTrigger>
          <TabsTrigger value="daily-reports" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Daily Reports
          </TabsTrigger>
          <TabsTrigger value="safety" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Safety
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Photos
          </TabsTrigger>
          <TabsTrigger value="cost-codes" className="gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            Cost Codes
          </TabsTrigger>
        </TabsList>

        {/* ── Time Entries (inline editable) ── */}
        <TabsContent value="time-entries" className="mt-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                    <TableHead className="w-[120px] text-xs font-semibold px-3">
                      <DateColumnFilter
                        dateRange={timeDateRange}
                        onDateRangeChange={setTimeDateRange}
                      />
                    </TableHead>
                    <TableHead className="w-[160px] text-xs font-semibold px-3">Employee</TableHead>
                    <TableHead className="w-[180px] text-xs font-semibold px-3">Cost Code</TableHead>
                    <TableHead className="w-[110px] text-xs font-semibold px-3">Work Type</TableHead>
                    <TableHead className="w-[80px] text-xs font-semibold px-3">Hours</TableHead>
                    <TableHead className="w-[110px] text-xs font-semibold px-3">Approval</TableHead>
                    <TableHead className="text-xs font-semibold px-3">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectTimeEntries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No time entries match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectTimeEntries.map((te) => {
                      const isLocked = te.approval === "approved" && !unlockedIds.has(te.id);
                      return (
                        <TableRow
                          key={te.id}
                          className={`group h-[36px] ${isLocked ? "bg-green-50/30" : "hover:bg-muted/20"}`}
                        >
                          <TableCell className="text-xs p-0 px-1">
                            {isLocked ? (
                              <span className="px-2 text-muted-foreground">{te.date}</span>
                            ) : (
                              <CellInput
                                value={te.date}
                                type="date"
                                onChange={(v) => updateTimeEntry(te.id, "date", v)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="p-0 px-1">
                            {isLocked ? (
                              <span className="text-xs px-2 text-muted-foreground">{getEmployeeName(te.employeeId)}</span>
                            ) : (
                              <CellSelect
                                value={te.employeeId}
                                onChange={(v) => updateTimeEntry(te.id, "employeeId", v)}
                                options={employeeOptions}
                                placeholder="Employee"
                              />
                            )}
                          </TableCell>
                          <TableCell className="p-0 px-1">
                            {isLocked ? (
                              <span className="text-xs px-2 text-muted-foreground">{costCodes.find((c) => c.id === te.costCodeId)?.code ?? "—"}</span>
                            ) : (
                              <CellSelect
                                value={te.costCodeId}
                                onChange={(v) => updateTimeEntry(te.id, "costCodeId", v)}
                                options={costCodeOptions}
                                placeholder="Cost code"
                              />
                            )}
                          </TableCell>
                          <TableCell className="p-0 px-1">
                            {isLocked ? (
                              <span className="text-xs px-2 text-muted-foreground">{te.workType === "tm" ? "T&M" : "Lump Sum"}</span>
                            ) : (
                              <CellSelect
                                value={te.workType}
                                onChange={(v) => updateTimeEntry(te.id, "workType", v)}
                                options={workTypeOptions}
                                placeholder="Type"
                              />
                            )}
                          </TableCell>
                          <TableCell className="p-0 px-1">
                            {isLocked ? (
                              <span className="text-xs px-2 font-medium text-muted-foreground">{te.hours}</span>
                            ) : (
                              <CellInput
                                value={te.hours}
                                type="number"
                                onChange={(v) => updateTimeEntry(te.id, "hours", parseFloat(v) || 0)}
                                placeholder="0"
                              />
                            )}
                          </TableCell>
                          <TableCell className="p-0 px-1">
                            {isLocked ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium capitalize bg-green-100 text-green-800 border-green-200"
                              >
                                Approved
                              </Badge>
                            ) : (
                              <CellSelect
                                value={te.approval}
                                onChange={(v) => updateTimeEntry(te.id, "approval", v)}
                                options={approvalOptions}
                                placeholder="Status"
                              />
                            )}
                          </TableCell>
                          <TableCell className="p-0 px-1">
                            {isLocked ? (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground truncate max-w-[200px] px-2">
                                  {te.notes || "—"}
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => unlockRow(te.id, e)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p className="text-xs">Edit approved entry</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              <CellInput
                                value={te.notes}
                                onChange={(v) => updateTimeEntry(te.id, "notes", v)}
                                placeholder="Notes"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t px-3 py-2 text-xs text-muted-foreground flex justify-between">
              <span>{projectTimeEntries.length} entries</span>
              <span className="font-medium text-foreground">
                {filteredHours.toFixed(1)} hours
                {timeDateRange?.from ? " (filtered)" : ""}
              </span>
            </div>
          </div>
        </TabsContent>

        {/* ── Daily Reports (click to open dialog) ── */}
        <TabsContent value="daily-reports" className="mt-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                    <TableHead className="w-[80px] text-xs font-semibold px-3">Report #</TableHead>
                    <TableHead className="w-[120px] text-xs font-semibold px-3">
                      <DateColumnFilter
                        dateRange={reportDateRange}
                        onDateRangeChange={setReportDateRange}
                      />
                    </TableHead>
                    <TableHead className="w-[90px] text-xs font-semibold px-3">Time</TableHead>
                    <TableHead className="w-[140px] text-xs font-semibold px-3">Author</TableHead>
                    <TableHead className="text-xs font-semibold px-3">Weather</TableHead>
                    <TableHead className="text-xs font-semibold px-3">Staff</TableHead>
                    <TableHead className="w-[70px] text-xs font-semibold px-3 text-right">Photos</TableHead>
                    <TableHead className="w-[90px] text-xs font-semibold px-3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectDailyReports.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No daily reports match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectDailyReports.map((dr) => {
                      const photoCount =
                        (dr.morningPhotoUrls?.length ?? 0) +
                        (dr.workPhotoUrls?.length ?? 0) +
                        (dr.endOfDayPhotoUrls?.length ?? 0) +
                        (dr.photoUrls?.length ?? 0);
                      return (
                        <TableRow
                          key={dr.id}
                          className="h-[36px] cursor-pointer hover:bg-muted/30"
                          onClick={() => openReport(dr)}
                        >
                          <TableCell className="text-xs px-3 font-medium">
                            #{dr.reportNumber}
                          </TableCell>
                          <TableCell className="text-xs px-3">{dr.date}</TableCell>
                          <TableCell className="text-xs px-3">{dr.time || "—"}</TableCell>
                          <TableCell className="text-xs px-3">{getEmployeeName(dr.authorId)}</TableCell>
                          <TableCell className="text-xs px-3 capitalize">
                            {dr.weather?.conditions?.join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-xs px-3 max-w-[200px] truncate">
                            {(dr.onSiteStaff ?? []).length > 0
                              ? (dr.onSiteStaff ?? []).map((id) => getEmployeeName(id)).join(", ")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs px-3 text-right">
                            {photoCount > 0 ? photoCount : "—"}
                          </TableCell>
                          <TableCell className="text-xs px-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize ${dailyReportStatusColors[dr.status]}`}
                            >
                              {dr.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              {projectDailyReports.length} reports
              {reportDateRange?.from ? " (filtered)" : ""}
            </div>
          </div>
        </TabsContent>

        {/* ── Safety Forms ── */}
        <TabsContent value="safety" className="mt-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                    <TableHead className="w-[120px] text-xs font-semibold px-3">
                      <DateColumnFilter
                        dateRange={safetyDateRange}
                        onDateRangeChange={setSafetyDateRange}
                      />
                    </TableHead>
                    <TableHead className="w-[140px] text-xs font-semibold px-3">Type</TableHead>
                    <TableHead className="text-xs font-semibold px-3">Title</TableHead>
                    <TableHead className="w-[160px] text-xs font-semibold px-3">Submitted By</TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold px-3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectSafetyForms.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No safety forms match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectSafetyForms.map((sf) => (
                      <TableRow key={sf.id} className="h-[36px]">
                        <TableCell className="text-xs px-3">{sf.date}</TableCell>
                        <TableCell className="text-xs px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {formTypeLabels[sf.formType] ?? sf.formType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs px-3 max-w-[300px] truncate">
                          {sf.title || "—"}
                        </TableCell>
                        <TableCell className="text-xs px-3">
                          {getEmployeeName(sf.submittedById)}
                        </TableCell>
                        <TableCell className="text-xs px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${safetyStatusColors[sf.status]}`}
                          >
                            {sf.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              {projectSafetyForms.length} forms
              {safetyDateRange?.from ? " (filtered)" : ""}
            </div>
          </div>
        </TabsContent>

        {/* ── Photos (with date filter) ── */}
        <TabsContent value="photos" className="mt-4">
          <PhotoGallery photos={allPhotos} />
        </TabsContent>

        {/* ── Cost Codes ── */}
        <TabsContent value="cost-codes" className="mt-4">
          <CostCodesTab
            assignedIds={project.costCodeIds ?? []}
            onToggle={(id, checked) => {
              const next = checked
                ? [...(project.costCodeIds ?? []), id]
                : (project.costCodeIds ?? []).filter((c) => c !== id);
              setProjects((prev) =>
                prev.map((p) => (p.id === project.id ? { ...p, costCodeIds: next } : p))
              );
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Daily report dialog */}
      {activeReport && (
        <DailyReportFormDialog
          open={dialogOpen}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setDialogOpen(false);
              setActiveReport(null);
            }
          }}
          report={activeReport}
          onSave={handleSaveReport}
        />
      )}

      <SavingIndicator saving={saving} />
    </div>
  );
}
