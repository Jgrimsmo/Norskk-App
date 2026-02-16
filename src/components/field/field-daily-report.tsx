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
  Pencil,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";

import { PhotoUpload } from "@/components/shared/photo-upload";

import type {
  DailyReport,
  DailyReportStatus,
  WeatherCondition,
} from "@/lib/types/time-tracking";
import {
  useEmployees,
  useProjects,
} from "@/hooks/use-firestore";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { SavingIndicator } from "@/components/shared/saving-indicator";
import { dailyReportStatusColors as statusColors } from "@/lib/constants/status-colors";

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
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

// ────────────────────────────────────────────────────────
// Field Daily Report — Mobile-friendly daily reports
// ────────────────────────────────────────────────────────

export function FieldDailyReport() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employee") || "";

  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const [reports, setReports, , saving] = useFirestoreState<DailyReport>(
    Collections.DAILY_REPORTS
  );

  const [mode, setMode] = React.useState<"list" | "edit">("list");
  const [activeReport, setActiveReport] = React.useState<DailyReport | null>(null);
  const [staffSearch, setStaffSearch] = React.useState("");

  const employee = employees.find((e) => e.id === employeeId);
  const myReports = React.useMemo(
    () =>
      reports
        .filter((r) => r.authorId === employeeId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [reports, employeeId]
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

  // Start a new report
  const handleNew = () => {
    const blank = createBlankReport(employeeId);
    setActiveReport(blank);
    setMode("edit");
  };

  // Open existing
  const handleOpen = (r: DailyReport) => {
    setActiveReport({ ...r });
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
    if (!activeReport || activeReport.status === "approved") return;
    setActiveReport((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const toggleWeatherCondition = (cond: WeatherCondition) => {
    if (!activeReport || activeReport.status === "approved") return;
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
    if (!activeReport || activeReport.status === "approved") return;
    setActiveReport((prev) =>
      prev ? { ...prev, weather: { ...prev.weather, [key]: value } } : prev
    );
  };

  const toggleStaff = (empId: string) => {
    if (!activeReport || activeReport.status === "approved") return;
    setActiveReport((prev) => {
      if (!prev) return prev;
      const staff = prev.onSiteStaff.includes(empId)
        ? prev.onSiteStaff.filter((id) => id !== empId)
        : [...prev.onSiteStaff, empId];
      return { ...prev, onSiteStaff: staff };
    });
  };

  // ─── LIST VIEW ───
  if (mode === "list") {
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

        {/* Reports list */}
        {myReports.length === 0 ? (
          <div className="text-center py-12">
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
          <div className="space-y-2">
            {myReports.map((r) => {
              const proj = projects.find((p) => p.id === r.projectId);
              return (
                <button
                  key={r.id}
                  onClick={() => handleOpen(r)}
                  className="w-full rounded-xl border bg-card shadow-sm p-4 text-left cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">
                      {proj ? `${proj.number} — ${proj.name}` : "No project"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${statusColors[r.status]}`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
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
            })}
          </div>
        )}
        <SavingIndicator saving={saving} />
      </div>
    );
  }

  // ─── EDIT VIEW ───
  const isLocked = activeReport?.status === "approved";
  const totalPhotos =
    (activeReport?.morningPhotoUrls?.length ?? 0) +
    (activeReport?.workPhotoUrls?.length ?? 0) +
    (activeReport?.endOfDayPhotoUrls?.length ?? 0);

  if (!activeReport) return null;

  return (
    <div className="space-y-5 pb-20">
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
        <Badge
          variant="outline"
          className={`text-[10px] capitalize ${statusColors[activeReport.status]}`}
        >
          {activeReport.status}
        </Badge>
      </div>

      {/* ─── Project, Date, Time ─── */}
      <section className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Project</Label>
          <Select
            value={activeReport.projectId}
            onValueChange={(v) => update("projectId", v)}
            disabled={isLocked}
          >
            <SelectTrigger className="h-11 text-sm mt-1 cursor-pointer">
              <SelectValue placeholder="Select project…" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-sm">
                  {p.number} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
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
              placeholder="e.g. 6°C"
              className="h-10 text-sm mt-1"
              disabled={isLocked}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ─── Work Description ─── */}
      <section>
        <Label className="text-sm font-semibold">Work Description</Label>
        <Textarea
          value={activeReport.workDescription}
          onChange={(e) => update("workDescription", e.target.value)}
          placeholder="Describe the main work performed today…"
          className="text-sm mt-2 min-h-[100px]"
          disabled={isLocked}
        />
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
          <div className="rounded-lg border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search employees…"
                className="h-10 text-sm pl-8 border-0 border-b rounded-b-none focus-visible:ring-0"
              />
            </div>
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
      </section>

      {/* ─── Sticky Footer ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 flex items-center gap-3 max-w-lg mx-auto">
        {!isLocked && (
          <Select
            value={activeReport.status}
            onValueChange={(v) => update("status", v as DailyReportStatus)}
          >
            <SelectTrigger className="h-10 w-32 text-xs cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="submitted" className="text-xs">Submitted</SelectItem>
              <SelectItem value="approved" className="text-xs">Approved</SelectItem>
            </SelectContent>
          </Select>
        )}
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
