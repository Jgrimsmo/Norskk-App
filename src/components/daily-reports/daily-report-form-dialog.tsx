"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
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
  Clock,
  RefreshCw,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  useTimeEntries,
  useCostCodes,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { useUnsavedWarning } from "@/hooks/use-unsaved-warning";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { dailyReportStatusColors as statusColors } from "@/lib/constants/status-colors";
import { fetchWeatherForAddress } from "@/lib/utils/weather";

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

// ── Props ──
interface DailyReportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DailyReport;
  onSave: (report: DailyReport) => void;
}

export default function DailyReportFormDialog({
  open,
  onOpenChange,
  report,
  onSave,
}: DailyReportFormDialogProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: timeEntries } = useTimeEntries();
  const { data: costCodes } = useCostCodes();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  const [form, setForm] = React.useState<DailyReport>({ ...report });
  const isLocked = form.status === "approved";
  const isDirty = JSON.stringify(form) !== JSON.stringify(report);
  const { confirmClose } = useUnsavedWarning(isDirty && open);

  // Staff search
  const [staffSearch, setStaffSearch] = React.useState("");
  // Equipment search
  const [equipSearch, setEquipSearch] = React.useState("");

  // Weather auto-fill
  const [weatherLoading, setWeatherLoading] = React.useState(false);
  const [weatherAutoFilled, setWeatherAutoFilled] = React.useState(false);

  React.useEffect(() => {
    setForm({ ...report });
  }, [report]);

  const update = <K extends keyof DailyReport>(key: K, value: DailyReport[K]) => {
    if (isLocked) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleWeatherCondition = (cond: WeatherCondition) => {
    if (isLocked) return;
    setForm((prev) => {
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
    if (isLocked) return;
    setForm((prev) => ({
      ...prev,
      weather: { ...prev.weather, [key]: value },
    }));
  };

  const toggleStaff = (empId: string) => {
    if (isLocked) return;
    setForm((prev) => {
      const current = prev.onSiteStaff ?? [];
      const staff = current.includes(empId)
        ? current.filter((id) => id !== empId)
        : [...current, empId];
      return { ...prev, onSiteStaff: staff };
    });
  };

  const toggleEquipment = (eqId: string) => {
    if (isLocked) return;
    setForm((prev) => {
      const current = prev.onSiteEquipment ?? [];
      const next = current.includes(eqId)
        ? current.filter((id) => id !== eqId)
        : [...current, eqId];
      return { ...prev, onSiteEquipment: next };
    });
  };

  const autoFetchWeather = React.useCallback(
    async (projectId: string, date: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj?.address || !date) return;
      setWeatherLoading(true);
      setWeatherAutoFilled(false);
      try {
        const wx = await fetchWeatherForAddress(proj.address, date);
        if (wx) {
          setForm((prev) => ({
            ...prev,
            weather: { ...prev.weather, ...wx },
          }));
          setWeatherAutoFilled(true);
        }
      } finally {
        setWeatherLoading(false);
      }
    },
    [projects]
  );

  const project = projects.find((p) => p.id === form.projectId);

  // ── Matched time entries for this project + date ──
  const matchedTimeEntries = React.useMemo(
    () =>
      form.projectId && form.date
        ? timeEntries.filter(
            (te) => te.projectId === form.projectId && te.date === form.date
          )
        : [],
    [timeEntries, form.projectId, form.date]
  );
  const totalHours = matchedTimeEntries.reduce((sum, te) => sum + (te.hours || 0), 0);

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

  const totalPhotos =
    (form.morningPhotoUrls?.length ?? 0) +
    (form.workPhotoUrls?.length ?? 0) +
    (form.endOfDayPhotoUrls?.length ?? 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !confirmClose()) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[95vw] w-full h-[95vh] max-h-[95vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                Daily Site Report
                <Badge
                  variant="outline"
                  className={`text-[10px] capitalize ${statusColors[form.status]}`}
                >
                  {form.status}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {project
                  ? project.name
                  : "Select a project"}
                {form.date &&
                  ` · ${format(parseISO(form.date), "EEEE, MMMM d, yyyy")}`}
                {form.time && ` · ${form.time}`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* ─── Project, Date, Time ─── */}
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Project
                  </Label>
                  <Select
                    value={form.projectId}
                    onValueChange={(v) => {
                      update("projectId", v);
                      if (form.weather.conditions.length === 0 && form.date) {
                        autoFetchWeather(v, form.date);
                      }
                    }}
                    disabled={isLocked}
                  >
                    <SelectTrigger className="h-9 text-sm mt-1 cursor-pointer">
                      <SelectValue placeholder="Select project…" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-sm">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => {
                      update("date", e.target.value);
                      if (form.projectId && form.weather.conditions.length === 0) {
                        autoFetchWeather(form.projectId, e.target.value);
                      }
                    }}
                    className="h-9 text-sm mt-1"
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => update("time", e.target.value)}
                    className="h-9 text-sm mt-1"
                    disabled={isLocked}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ─── Weather ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
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
                {!isLocked && form.projectId && form.date && !weatherLoading && (
                  <button
                    type="button"
                    onClick={() => autoFetchWeather(form.projectId, form.date)}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                    title="Refresh weather from project address"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </button>
                )}
              </h3>
              <div className="space-y-3">
                {/* Condition chips */}
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(weatherLabels) as WeatherCondition[]).map(
                    (cond) => {
                      const Icon = weatherIcons[cond];
                      const active = form.weather.conditions.includes(cond);
                      return (
                        <button
                          key={cond}
                          type="button"
                          disabled={isLocked}
                          onClick={() => toggleWeatherCondition(cond)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border transition-colors cursor-pointer ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/30"
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          {weatherLabels[cond]}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Temp row */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Temperature
                    </Label>
                    <Input
                      value={form.weather.temperature}
                      onChange={(e) =>
                        updateWeather("temperature", e.target.value)
                      }
                      placeholder="e.g. 6°C"
                      className="h-8 text-xs mt-1"
                      disabled={isLocked}
                    />
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* ─── Work Description ─── */}
            <section>
              <Label className="text-sm font-semibold text-foreground">
                Work Description
              </Label>
              <Textarea
                value={form.workDescription}
                onChange={(e) => update("workDescription", e.target.value)}
                placeholder="Describe the main work performed today…"
                className="text-sm mt-2 min-h-[80px]"
                disabled={isLocked}
              />
            </section>

            <Separator />

            {/* ─── Site Photos (Morning / Work / End of Day) ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Camera className="h-4 w-4 text-sky-500" />
                Photos ({totalPhotos})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Sunrise className="h-3.5 w-3.5 text-amber-500" />
                    Morning ({form.morningPhotoUrls?.length ?? 0})
                  </div>
                  <PhotoUpload
                    photos={form.morningPhotoUrls ?? []}
                    onChange={(urls) => update("morningPhotoUrls", urls)}
                    storagePath={`daily-reports/${form.id}/morning`}
                    disabled={isLocked}
                    maxPhotos={10}
                  />
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Hammer className="h-3.5 w-3.5 text-orange-500" />
                    Work Hours ({form.workPhotoUrls?.length ?? 0})
                  </div>
                  <PhotoUpload
                    photos={form.workPhotoUrls ?? []}
                    onChange={(urls) => update("workPhotoUrls", urls)}
                    storagePath={`daily-reports/${form.id}/work`}
                    disabled={isLocked}
                    maxPhotos={10}
                  />
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Moon className="h-3.5 w-3.5 text-indigo-500" />
                    End of Day ({form.endOfDayPhotoUrls?.length ?? 0})
                  </div>
                  <PhotoUpload
                    photos={form.endOfDayPhotoUrls ?? []}
                    onChange={(urls) => update("endOfDayPhotoUrls", urls)}
                    storagePath={`daily-reports/${form.id}/eod`}
                    disabled={isLocked}
                    maxPhotos={10}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ─── On-site Staff ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-orange-500" />
                On-site Staff ({(form.onSiteStaff ?? []).length})
              </h3>

              {/* Selected staff chips */}
              {(form.onSiteStaff ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(form.onSiteStaff ?? []).map((empId) => {
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

              {/* Search + checkboxes */}
              {!isLocked && (
                <div className="rounded-lg border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      placeholder="Search employees…"
                      className="h-9 text-xs pl-8 border-0 border-b rounded-b-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto p-1.5 space-y-0.5">
                    {filteredEmployees.map((emp) => {
                      const checked = (form.onSiteStaff ?? []).includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-xs"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleStaff(emp.id)}
                            className="h-3.5 w-3.5"
                          />
                          <span className={checked ? "font-medium" : ""}>
                            {emp.name}
                          </span>
                          {emp.role && (
                            <span className="text-muted-foreground ml-auto">
                              {emp.role}
                            </span>
                          )}
                        </label>
                      );
                    })}
                    {filteredEmployees.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No employees found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <Separator />

            {/* ─── On-site Equipment ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4 text-yellow-500" />
                On-site Equipment ({(form.onSiteEquipment ?? []).length})
              </h3>

              {/* Selected equipment chips */}
              {(form.onSiteEquipment ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(form.onSiteEquipment ?? []).map((eqId) => {
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

              {/* Search + checkboxes */}
              {!isLocked && (
                <div className="rounded-lg border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={equipSearch}
                      onChange={(e) => setEquipSearch(e.target.value)}
                      placeholder="Search equipment…"
                      className="h-9 text-xs pl-8 border-0 border-b rounded-b-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto p-1.5 space-y-0.5">
                    {filteredEquipment.map((eq) => {
                      const checked = (form.onSiteEquipment ?? []).includes(eq.id);
                      return (
                        <label
                          key={eq.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-xs"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleEquipment(eq.id)}
                            className="h-3.5 w-3.5"
                          />
                          <span className={checked ? "font-medium" : ""}>
                            {eq.name}
                          </span>
                          {eq.number && (
                            <span className="text-muted-foreground">#{eq.number}</span>
                          )}
                          {eq.category && (
                            <span className="text-muted-foreground ml-auto">
                              {eq.category}
                            </span>
                          )}
                        </label>
                      );
                    })}
                    {filteredEquipment.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No equipment found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <Separator />

            {/* ─── Time Entries ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-emerald-500" />
                Time Entries ({matchedTimeEntries.length})
                {matchedTimeEntries.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-auto">
                    Total: {totalHours}h
                  </span>
                )}
              </h3>

              {matchedTimeEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 rounded-lg border bg-muted/20">
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
                        <td className="px-3 py-2 text-right border-r">{totalHours}h</td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t shrink-0 bg-muted/20">
          <div className="flex items-center gap-2">
            {!isLocked && (
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v as DailyReportStatus)}
              >
                <SelectTrigger className="h-8 w-36 text-xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="draft" className="text-xs">
                    Draft
                  </SelectItem>
                  <SelectItem value="submitted" className="text-xs">
                    Submitted
                  </SelectItem>
                  <SelectItem value="approved" className="text-xs">
                    Approved
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {!isLocked && (
              <Button
                size="sm"
                className="text-xs cursor-pointer"
                onClick={() => {
                  onSave(form);
                  onOpenChange(false);
                }}
              >
                Save Report
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
