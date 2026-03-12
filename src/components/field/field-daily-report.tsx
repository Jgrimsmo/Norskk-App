"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  Sun,
  Wind,
  CloudSun,
  CloudOff,
  Camera,
  Sunrise,
  Hammer,
  Moon,
  Users,
  X,
  Search,
  Plus,
  FileText,
  Clock,
  RefreshCw,
  Wrench,
  CalendarIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";

import { PhotoUpload } from "@/components/shared/photo-upload";

import type {
  DailyReport,
  WeatherCondition,
} from "@/lib/types/time-tracking";
import {
  useEmployees,
  useProjects,
  useTimeEntries,
  useCostCodes,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { useCurrentEmployee } from "@/hooks/use-current-employee";
import { Collections, EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { SavingIndicator } from "@/components/shared/saving-indicator";

import { fetchWeatherForProject } from "@/lib/utils/weather";

// ── Weather helpers ──
const weatherIcons: Record<WeatherCondition, React.ElementType> = {
  sunny: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  overcast: CloudOff,
  rain: CloudRain,
  snow: CloudSnow,
  fog: CloudFog,
  windy: Wind,
  thunderstorm: CloudLightning,
};

const weatherLabels: Record<WeatherCondition, string> = {
  sunny: "Sunny",
  "partly-cloudy": "Partly Cloudy",
  cloudy: "Cloudy",
  overcast: "Overcast",
  rain: "Rain",
  snow: "Snow",
  fog: "Fog",
  windy: "Windy",
  thunderstorm: "Thunderstorm",
};

function nextId(): string {
  return `dr-${crypto.randomUUID().slice(0, 8)}`;
}

function createBlankReport(authorId: string): DailyReport {
  const now = new Date();
  return {
    id: nextId(),
    reportNumber: Math.floor(Math.random() * 9000) + 1000,
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm"),
    projectId: "",
    authorId,
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

// ────────────────────────────────────────────────────────
// Field Daily Report — Mobile-friendly daily reports
// ────────────────────────────────────────────────────────

export function FieldDailyReport() {
  const { employeeId } = useCurrentEmployee();

  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: timeEntries } = useTimeEntries();
  const { data: costCodes } = useCostCodes();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();
  const [reports, setReports, , saving] = useFirestoreState<DailyReport>(
    Collections.DAILY_REPORTS
  );

  const [mode, setMode] = React.useState<"list" | "edit">("list");
  const [activeReport, setActiveReport] = React.useState<DailyReport | null>(null);
  const [staffSearch, setStaffSearch] = React.useState("");

  // List view tab & browse filters
  const [listTab, setListTab] = React.useState<"today" | "mine" | "browse">("today");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [browseProjectId, setBrowseProjectId] = React.useState("");

  // Weather auto-fill
  const [weatherLoading, setWeatherLoading] = React.useState(false);
  const [weatherAutoFilled, setWeatherAutoFilled] = React.useState(false);

  // Equipment search
  const [equipSearch, setEquipSearch] = React.useState("");

  // Work tasks (stored as newline-separated workDescription)
  const [workTasks, setWorkTasks] = React.useState<string[]>([""]);

  const updateWorkTasks = (tasks: string[]) => {
    setWorkTasks(tasks);
    update("workDescription", tasks.filter((t) => t.trim()).join("\n"));
  };

  const autoFetchWeather = React.useCallback(
    async (projectId: string, date: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj?.city || !date) return;
      setWeatherLoading(true);
      setWeatherAutoFilled(false);
      try {
        const wx = await fetchWeatherForProject(proj.city, proj.province ?? "", date);
        if (wx) {
          setActiveReport((prev) =>
            prev ? { ...prev, weather: { ...prev.weather, ...wx } } : prev
          );
          setWeatherAutoFilled(true);
        }
      } finally {
        setWeatherLoading(false);
      }
    },
    [projects]
  );

  const today = format(new Date(), "yyyy-MM-dd");

  const myReports = React.useMemo(
    () =>
      reports
        .filter((r) => r.authorId === employeeId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [reports, employeeId]
  );

  // All reports from today (everyone)
  const todayReports = React.useMemo(
    () =>
      reports
        .filter((r) => r.date === today)
        .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    [reports, today]
  );

  // Browse / search results
  const browseFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const browseTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : browseFrom;
  const hasDateFilter = !!browseFrom;
  const browseReports = React.useMemo(() => {
    let filtered = reports;
    if (browseFrom) {
      filtered = filtered.filter((r) => r.date >= browseFrom);
    }
    if (browseTo) {
      filtered = filtered.filter((r) => r.date <= browseTo);
    }
    if (browseProjectId && browseProjectId !== "all") {
      filtered = filtered.filter((r) => r.projectId === browseProjectId);
    }
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, browseFrom, browseTo, browseProjectId]);

  const activeProjects = React.useMemo(
    () => projects.filter((p) => p.status === "active" || p.status === "bidding"),
    [projects]
  );

  const activeEmployees = React.useMemo(
    () => employees.filter((e) => e.status === "active"),
    [employees]
  );

  const filteredEmployees = React.useMemo(() => {
    if (!staffSearch) return activeEmployees;
    const q = staffSearch.toLowerCase();
    return activeEmployees.filter((e) => e.name.toLowerCase().includes(q));
  }, [activeEmployees, staffSearch]);

  const activeEquipment = React.useMemo(
    () => equipment.filter((e) => e.status !== "retired" && e.id !== EQUIPMENT_NONE_ID),
    [equipment]
  );

  const filteredEquipment = React.useMemo(() => {
    if (!equipSearch) return activeEquipment;
    const q = equipSearch.toLowerCase();
    return activeEquipment.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.number.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }, [activeEquipment, equipSearch]);

  // Start a new report
  const handleNew = () => {
    const blank = createBlankReport(employeeId);
    setActiveReport(blank);
    setWorkTasks([""]);
    setMode("edit");
  };

  // Open existing
  const handleOpen = (r: DailyReport) => {
    setActiveReport({ ...r });
    const desc = r.workDescription || "";
    const lines = desc.split("\n").filter((l) => l.trim());
    setWorkTasks(lines.length > 0 ? lines : [""]);
    setMode("edit");
  };

  // Save
  const handleSave = () => {
    if (!activeReport) return;
    const existing = reports.find((r) => r.id === activeReport.id);
    if (existing) {
      setReports((prev) =>
        prev.map((r) => (r.id === activeReport.id ? activeReport : r))
      );
    } else {
      setReports((prev) => [activeReport, ...prev]);
    }
    setMode("list");
    setActiveReport(null);
  };

  // ── Helpers ──
  const update = <K extends keyof DailyReport>(key: K, value: DailyReport[K]) => {
    if (!activeReport) return;
    setActiveReport((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const toggleWeatherCondition = (cond: WeatherCondition) => {
    if (!activeReport) return;
    setActiveReport((prev) => {
      if (!prev) return prev;
      const conditions = prev.weather.conditions.includes(cond)
        ? prev.weather.conditions.filter((c) => c !== cond)
        : [...prev.weather.conditions, cond];
      return { ...prev, weather: { ...prev.weather, conditions } };
    });
  };

  const updateWeather = <K extends keyof DailyReport["weather"]>(
    key: K,
    value: DailyReport["weather"][K]
  ) => {
    if (!activeReport) return;
    setActiveReport((prev) =>
      prev ? { ...prev, weather: { ...prev.weather, [key]: value } } : prev
    );
  };

  const toggleStaff = (empId: string) => {
    if (!activeReport) return;
    setActiveReport((prev) => {
      if (!prev) return prev;
      const staff = prev.onSiteStaff.includes(empId)
        ? prev.onSiteStaff.filter((id) => id !== empId)
        : [...prev.onSiteStaff, empId];
      return { ...prev, onSiteStaff: staff };
    });
  };

  const toggleEquipment = (eqId: string) => {
    if (!activeReport) return;
    setActiveReport((prev) => {
      if (!prev) return prev;
      const current = prev.onSiteEquipment ?? [];
      const next = current.includes(eqId)
        ? current.filter((id) => id !== eqId)
        : [...current, eqId];
      return { ...prev, onSiteEquipment: next };
    });
  };

  // ── Matched time entries for active project + date ──
  const matchedTimeEntries = React.useMemo(
    () =>
      activeReport?.projectId && activeReport?.date
        ? timeEntries.filter(
            (te) =>
              te.projectId === activeReport.projectId &&
              te.date === activeReport.date
          )
        : [],
    [timeEntries, activeReport]
  );
  const totalTimeHours = matchedTimeEntries.reduce(
    (sum, te) => sum + (te.hours || 0),
    0
  );

  // ─── LIST VIEW ───
  if (mode === "list") {
    // Reusable report card renderer
    const renderReportCard = (r: DailyReport, showAuthor = false) => {
      const proj = projects.find((p) => p.id === r.projectId);
      const author = employees.find((e) => e.id === r.authorId);
      const isOwn = r.authorId === employeeId;
      return (
        <button
          key={r.id}
          onClick={() => handleOpen(r)}
          className={`w-full rounded-xl border shadow-sm p-4 text-left cursor-pointer transition-colors ${
            isOwn
              ? "bg-card hover:bg-muted/40 active:bg-muted/60"
              : "bg-muted/30 hover:bg-muted/50 active:bg-muted/70"
          }`}
        >
          <div className="flex items-start justify-between mb-1">
            <span className="text-sm font-semibold">
              {proj ? proj.name : "No project"}
            </span>
            {isOwn && (
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                You
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {showAuthor && (author ? `${author.name} · ` : "")}
            {format(parseISO(r.date), "MMM d, yyyy")}
            {r.time && ` · ${r.time}`}
            {r.onSiteStaff.length > 0 && ` · ${r.onSiteStaff.length} staff`}
          </p>
          {r.workDescription && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {r.workDescription}
            </p>
          )}
        </button>
      );
    };

    const tabs = [
      { id: "today" as const, label: "Today", count: todayReports.length },
      { id: "mine" as const, label: "My Reports", count: myReports.length },
      { id: "browse" as const, label: "Browse", count: null },
    ];

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href={`/field?employee=${employeeId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">Daily Site Reports</h1>
          </div>
          <Button
            size="sm"
            className="text-xs gap-1 cursor-pointer"
            onClick={handleNew}
          >
            <Plus className="h-3 w-3" />
            New Report
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setListTab(tab.id)}
              className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors cursor-pointer ${
                listTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {listTab === "today" && (
          <div className="space-y-2">
            {todayReports.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No reports filed today</p>
              </div>
            ) : (
              todayReports.map((r) => renderReportCard(r, true))
            )}
          </div>
        )}

        {listTab === "mine" && (
          <div className="space-y-2">
            {myReports.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No reports yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs cursor-pointer"
                  onClick={handleNew}
                >
                  Create Your First Report
                </Button>
              </div>
            ) : (
              myReports.map((r) => renderReportCard(r))
            )}
          </div>
        )}

        {listTab === "browse" && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-start text-xs font-normal cursor-pointer"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    {dateRange?.from ? (
                      dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() ? (
                        <>
                          {format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      <span className="text-muted-foreground">Select date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
              <Select value={browseProjectId} onValueChange={setBrowseProjectId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(hasDateFilter || (browseProjectId && browseProjectId !== "all")) && (
              <button
                onClick={() => { setDateRange(undefined); setBrowseProjectId(""); }}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear filters
              </button>
            )}

            <div className="space-y-2">
              {!(hasDateFilter || (browseProjectId && browseProjectId !== "all")) ? (
                <div className="text-center py-10">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Select a date range or project to find reports
                  </p>
                </div>
              ) : browseReports.length === 0 ? (
                <div className="text-center py-10">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No reports match your filters
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {browseReports.length} report{browseReports.length !== 1 ? "s" : ""} found
                  </p>
                  {browseReports.map((r) => renderReportCard(r, true))}
                </>
              )}
            </div>
          </div>
        )}

        <SavingIndicator saving={saving} />
      </div>
    );
  }

  // ─── EDIT VIEW ───
  const isLocked = false;
  const totalPhotos =
    (activeReport?.morningPhotoUrls?.length ?? 0) +
    (activeReport?.workPhotoUrls?.length ?? 0) +
    (activeReport?.endOfDayPhotoUrls?.length ?? 0);

  if (!activeReport) return null;

  return (
    <div className="space-y-5 pb-36">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => {
              setMode("list");
              setActiveReport(null);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">
            Daily Site Report
          </h1>
        </div>
      </div>

      {/* ─── Project, Date, Time ─── */}
      <section className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Project</Label>
          <Select
            value={activeReport.projectId}
            onValueChange={(v) => {
              update("projectId", v);
              if (activeReport.weather.conditions.length === 0 && activeReport.date) {
                autoFetchWeather(v, activeReport.date);
              }
            }}
            disabled={isLocked}
          >
            <SelectTrigger className="h-11 text-sm mt-1 cursor-pointer">
              <SelectValue placeholder="Select project…" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-sm">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={activeReport.date}
              onChange={(e) => update("date", e.target.value)}
              className="h-11 text-sm mt-1"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Time</Label>
            <Input
              type="time"
              value={activeReport.time}
              onChange={(e) => update("time", e.target.value)}
              className="h-11 text-sm mt-1"
              disabled={isLocked}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ─── Weather ─── */}
      <section>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Cloud className="h-4 w-4 text-blue-500" />
          Weather
          {weatherLoading && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {weatherAutoFilled && !weatherLoading && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Auto-filled
            </span>
          )}
          {!isLocked && activeReport.projectId && activeReport.date && !weatherLoading && (
            <button
              type="button"
              onClick={() => autoFetchWeather(activeReport.projectId, activeReport.date)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              title="Refresh weather from project address"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          )}
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(Object.keys(weatherLabels) as WeatherCondition[]).map((cond) => {
            const Icon = weatherIcons[cond];
            const active = activeReport.weather.conditions.includes(cond);
            return (
              <button
                key={cond}
                type="button"
                disabled={isLocked}
                onClick={() => toggleWeatherCondition(cond)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {weatherLabels[cond]}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Temperature</Label>
            <Input
              value={activeReport.weather.temperature}
              onChange={(e) => updateWeather("temperature", e.target.value)}
              placeholder="e.g. -5°C – 3°C"
              className="h-10 text-sm mt-1"
              disabled={isLocked}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ─── Work Tasks ─── */}
      <section>
        <Label className="text-sm font-semibold">Work Tasks</Label>
        <div className="mt-2 space-y-1.5">
          {workTasks.map((task, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-5 text-right shrink-0">
                {idx + 1}.
              </span>
              <Input
                value={task}
                onChange={(e) => {
                  const next = [...workTasks];
                  next[idx] = e.target.value;
                  updateWorkTasks(next);
                }}
                placeholder={`Task ${idx + 1}…`}
                className="h-10 text-sm flex-1"
                disabled={isLocked}
              />
              {workTasks.length > 1 && !isLocked && (
                <button
                  type="button"
                  onClick={() => {
                    const next = workTasks.filter((_, i) => i !== idx);
                    updateWorkTasks(next);
                  }}
                  className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {!isLocked && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1 cursor-pointer mt-1"
              onClick={() => updateWorkTasks([...workTasks, ""])}
            >
              <Plus className="h-3 w-3" />
              Add Task
            </Button>
          )}
        </div>
      </section>

      <Separator />

      {/* ─── Photos ─── */}
      <section>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Camera className="h-4 w-4 text-sky-500" />
          Photos ({totalPhotos})
        </h3>
        <div className="space-y-3">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Sunrise className="h-3.5 w-3.5 text-amber-500" />
              Morning ({activeReport.morningPhotoUrls?.length ?? 0})
            </div>
            <PhotoUpload
              photos={activeReport.morningPhotoUrls ?? []}
              onChange={(urls) => update("morningPhotoUrls", urls)}
              storagePath={`daily-reports/${activeReport.id}/morning`}
              disabled={isLocked}
              maxPhotos={10}
            />
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Hammer className="h-3.5 w-3.5 text-orange-500" />
              Work Hours ({activeReport.workPhotoUrls?.length ?? 0})
            </div>
            <PhotoUpload
              photos={activeReport.workPhotoUrls ?? []}
              onChange={(urls) => update("workPhotoUrls", urls)}
              storagePath={`daily-reports/${activeReport.id}/work`}
              disabled={isLocked}
              maxPhotos={10}
            />
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Moon className="h-3.5 w-3.5 text-indigo-500" />
              End of Day ({activeReport.endOfDayPhotoUrls?.length ?? 0})
            </div>
            <PhotoUpload
              photos={activeReport.endOfDayPhotoUrls ?? []}
              onChange={(urls) => update("endOfDayPhotoUrls", urls)}
              storagePath={`daily-reports/${activeReport.id}/eod`}
              disabled={isLocked}
              maxPhotos={10}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ─── On-site Staff ─── */}
      <section>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-orange-500" />
          On-site Staff ({activeReport.onSiteStaff.length})
        </h3>

        {activeReport.onSiteStaff.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {activeReport.onSiteStaff.map((empId) => {
              const emp = employees.find((e) => e.id === empId);
              return (
                <span
                  key={empId}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium"
                >
                  {emp?.name ?? empId}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => toggleStaff(empId)}
                      className="hover:text-destructive cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {!isLocked && (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search employees…"
                className="h-10 text-sm pl-8 rounded-lg focus-visible:ring-1"
              />
            </div>
            {staffSearch.trim().length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border bg-popover shadow-md">
                <div className="max-h-[200px] overflow-y-auto p-1.5 space-y-0.5">
                  {filteredEmployees.map((emp) => {
                    const checked = activeReport.onSiteStaff.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleStaff(emp.id)}
                          className="h-4 w-4"
                        />
                        <span className={checked ? "font-medium" : ""}>
                          {emp.name}
                        </span>
                        {emp.role && (
                          <span className="text-muted-foreground ml-auto text-xs">
                            {emp.role}
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No employees found
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Separator />

      {/* ─── On-site Equipment ─── */}
      <section>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 text-yellow-500" />
          On-site Equipment ({(activeReport.onSiteEquipment ?? []).length})
        </h3>

        {(activeReport.onSiteEquipment ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(activeReport.onSiteEquipment ?? []).map((eqId) => {
              const eq = equipment.find((e) => e.id === eqId);
              return (
                <span
                  key={eqId}
                  className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 text-xs font-medium"
                >
                  {eq?.name ?? eqId}
                  {eq?.number && (
                    <span className="opacity-60">#{eq.number}</span>
                  )}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => toggleEquipment(eqId)}
                      className="hover:text-destructive cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {!isLocked && (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={equipSearch}
                onChange={(e) => setEquipSearch(e.target.value)}
                placeholder="Search equipment…"
                className="h-10 text-sm pl-8 rounded-lg focus-visible:ring-1"
              />
            </div>
            {equipSearch.trim().length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border bg-popover shadow-md">
                <div className="max-h-[200px] overflow-y-auto p-1.5 space-y-0.5">
                  {filteredEquipment.map((eq) => {
                    const checked = (activeReport.onSiteEquipment ?? []).includes(eq.id);
                    return (
                      <label
                        key={eq.id}
                        className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleEquipment(eq.id)}
                          className="h-4 w-4"
                        />
                        <span className={checked ? "font-medium" : ""}>
                          {eq.name}
                        </span>
                        {eq.number && (
                          <span className="text-muted-foreground text-xs">#{eq.number}</span>
                        )}
                        {eq.category && (
                          <span className="text-muted-foreground ml-auto text-xs">
                            {eq.category}
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {filteredEquipment.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No equipment found
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Separator />

      {/* ─── Time Entries ─── */}
      <section>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-emerald-500" />
          Time Entries ({matchedTimeEntries.length})
          {matchedTimeEntries.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground ml-auto">
              Total: {totalTimeHours}h
            </span>
          )}
        </h3>

        {matchedTimeEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 rounded-lg border bg-muted/20">
            No time entries for this project and date.
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-3 py-2 font-semibold border-r border-b">Date</th>
                  <th className="px-3 py-2 font-semibold border-r border-b">Employee</th>
                  <th className="px-3 py-2 font-semibold border-r border-b">Cost Code</th>
                  <th className="px-3 py-2 font-semibold border-r border-b">Equipment</th>
                  <th className="px-3 py-2 font-semibold border-r border-b">Attachment</th>
                  <th className="px-3 py-2 font-semibold border-r border-b">Tool</th>
                  <th className="px-3 py-2 font-semibold border-r border-b">Work Type</th>
                  <th className="px-3 py-2 font-semibold border-r border-b text-right">Hours</th>
                  <th className="px-3 py-2 font-semibold border-b">Notes</th>
                </tr>
              </thead>
              <tbody>
                {matchedTimeEntries.map((te) => {
                  const emp = employees.find((e) => e.id === te.employeeId);
                  const cc = costCodes.find((c) => c.id === te.costCodeId);
                  const eq = te.equipmentId && te.equipmentId !== EQUIPMENT_NONE_ID
                    ? equipment.find((e) => e.id === te.equipmentId)
                    : null;
                  const att = te.attachmentId
                    ? attachments.find((a) => a.id === te.attachmentId)
                    : null;
                  const tl = te.toolId
                    ? tools.find((t) => t.id === te.toolId)
                    : null;
                  return (
                    <tr key={te.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-3 py-2 border-r whitespace-nowrap">{format(parseISO(te.date), "MM/dd/yyyy")}</td>
                      <td className="px-3 py-2 border-r">{emp?.name ?? "—"}</td>
                      <td className="px-3 py-2 border-r">{cc?.description ?? "—"}</td>
                      <td className="px-3 py-2 border-r">{eq?.name ?? "—"}</td>
                      <td className="px-3 py-2 border-r">{att?.name ?? "—"}</td>
                      <td className="px-3 py-2 border-r">{tl?.name ?? "—"}</td>
                      <td className="px-3 py-2 border-r whitespace-nowrap">{te.workType === "tm" ? "T&M" : "Lump Sum"}</td>
                      <td className="px-3 py-2 border-r text-right font-medium">{te.hours}</td>
                      <td className="px-3 py-2 text-muted-foreground">{te.notes || "—"}</td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/30 font-semibold">
                  <td colSpan={7} className="px-3 py-2 text-right border-r">Total</td>
                  <td className="px-3 py-2 text-right border-r">{totalTimeHours}h</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Sticky Footer ─── */}
      <div className="fixed bottom-20 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 flex items-center gap-3 max-w-lg mx-auto safe-area-bottom z-40">
        <Button
          className="flex-1 h-10 text-sm cursor-pointer"
          onClick={handleSave}
          disabled={isLocked}
        >
          Save Report
        </Button>
      </div>

      <SavingIndicator saving={saving} />
    </div>
  );
}
