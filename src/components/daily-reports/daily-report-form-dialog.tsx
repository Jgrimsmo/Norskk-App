"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  X,
  Plus,
  Trash2,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  Sun,
  Wind,
  CloudSun,
  CloudOff,
  Users,
  Wrench,
  HardHat,
  Clock,
  Package,
  UserCheck,
  ShieldCheck,
  StickyNote,
  CalendarPlus,
  Camera,
  ImageIcon,
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

import { SignaturePad } from "@/components/safety/signature-pad";
import { PhotoUpload } from "@/components/shared/photo-upload";

import type {
  DailyReport,
  DailyReportStatus,
  WeatherCondition,
  GroundCondition,
  DeliveryCondition,
  ManpowerEntry,
  EquipmentLogEntry,
  WorkPerformedEntry,
  DelayEntry,
  MaterialDelivery,
  VisitorEntry,
} from "@/lib/types/time-tracking";

import {
  useEmployees,
  useProjects,
  useEquipment,
} from "@/hooks/use-firestore";
import { useUnsavedWarning } from "@/hooks/use-unsaved-warning";

// ── Helpers ──
let entryCounter = 500;
function nextEntryId(prefix: string): string {
  return `${prefix}-${++entryCounter}`;
}

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

const groundLabels: Record<GroundCondition, string> = {
  dry: "Dry",
  wet: "Wet",
  muddy: "Muddy",
  frozen: "Frozen",
  flooded: "Flooded",
};

const delayTypeLabels: Record<string, string> = {
  weather: "Weather",
  material: "Material",
  labor: "Labor",
  equipment: "Equipment",
  owner: "Owner",
  inspection: "Inspection",
  design: "Design",
  other: "Other",
};

const deliveryConditionLabels: Record<DeliveryCondition, string> = {
  good: "Good",
  damaged: "Damaged",
  partial: "Partial",
  rejected: "Rejected",
};

import { dailyReportStatusColors as statusColors } from "@/lib/constants/status-colors";

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
  const { data: equipment } = useEquipment();

  const [form, setForm] = React.useState<DailyReport>({ ...report });
  const isLocked = form.status === "approved";
  const isDirty = JSON.stringify(form) !== JSON.stringify(report);
  const { confirmClose } = useUnsavedWarning(isDirty && open);

  React.useEffect(() => {
    setForm({ ...report });
  }, [report]);

  // ── Field updaters ──
  const update = <K extends keyof DailyReport>(key: K, value: DailyReport[K]) => {
    if (isLocked) return;
    setForm((prev) => ({ ...prev, [key]: value }));
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

  const toggleWeatherCondition = (cond: WeatherCondition) => {
    if (isLocked) return;
    setForm((prev) => {
      const conditions = prev.weather.conditions.includes(cond)
        ? prev.weather.conditions.filter((c) => c !== cond)
        : [...prev.weather.conditions, cond];
      return { ...prev, weather: { ...prev.weather, conditions } };
    });
  };

  // ── Array helpers ──
  function addEntry<T>(key: "manpower" | "equipmentLog" | "workPerformed" | "delays" | "materialDeliveries" | "visitors", entry: T) {
    if (isLocked) return;
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] as T[]), entry] }));
  }

  function removeEntry(key: "manpower" | "equipmentLog" | "workPerformed" | "delays" | "materialDeliveries" | "visitors", id: string) {
    if (isLocked) return;
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] as { id: string }[]).filter((e) => e.id !== id),
    }));
  }

  function updateEntry(
    key: "manpower" | "equipmentLog" | "workPerformed" | "delays" | "materialDeliveries" | "visitors",
    id: string,
    updates: Record<string, unknown>
  ) {
    if (isLocked) return;
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] as { id: string }[]).map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    }));
  }

  const project = projects.find((p) => p.id === form.projectId);
  const author = employees.find((e) => e.id === form.authorId);

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next && !confirmClose()) return;
      onOpenChange(next);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                Daily Report #{form.reportNumber}
                <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[form.status]}`}>
                  {form.status}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {project?.number} — {project?.name} · {format(parseISO(form.date), "EEEE, MMMM d, yyyy")}
                {author && ` · By ${author.name}`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* ─── Section 1: Weather ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Cloud className="h-4 w-4 text-blue-500" />
                Weather Conditions
              </h3>
              <div className="space-y-3">
                {/* Conditions chips */}
                <div>
                  <Label className="text-xs text-muted-foreground">Conditions</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(Object.keys(weatherLabels) as WeatherCondition[]).map((cond) => {
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
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Temperature</Label>
                    <Input
                      value={form.weather.temperature}
                      onChange={(e) => updateWeather("temperature", e.target.value)}
                      placeholder="28°F / 38°F"
                      className="h-8 text-xs mt-1"
                      disabled={isLocked}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Wind</Label>
                    <Input
                      value={form.weather.windSpeed}
                      onChange={(e) => updateWeather("windSpeed", e.target.value)}
                      placeholder="15 mph NW"
                      className="h-8 text-xs mt-1"
                      disabled={isLocked}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Precipitation</Label>
                    <Input
                      value={form.weather.precipitation}
                      onChange={(e) => updateWeather("precipitation", e.target.value)}
                      placeholder="None"
                      className="h-8 text-xs mt-1"
                      disabled={isLocked}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ground Conditions</Label>
                    <Select
                      value={form.weather.groundConditions}
                      onValueChange={(v) => updateWeather("groundConditions", v as GroundCondition)}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1 cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {(Object.entries(groundLabels) as [GroundCondition, string][]).map(([val, lbl]) => (
                          <SelectItem key={val} value={val} className="text-xs">{lbl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={form.weather.weatherDelay}
                      onCheckedChange={(v) => updateWeather("weatherDelay", !!v)}
                      disabled={isLocked}
                      className="h-3.5 w-3.5"
                    />
                    <span>Weather delay?</span>
                  </label>
                  {form.weather.weatherDelay && (
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Hours lost:</Label>
                      <Input
                        type="number"
                        value={form.weather.delayHours}
                        onChange={(e) => updateWeather("delayHours", parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs w-16"
                        disabled={isLocked}
                        min={0}
                        step={0.5}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Weather Notes</Label>
                  <Textarea
                    value={form.weather.notes}
                    onChange={(e) => updateWeather("notes", e.target.value)}
                    placeholder="Additional weather observations…"
                    className="text-xs mt-1 min-h-[48px]"
                    disabled={isLocked}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ─── Section 2: Manpower ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  Manpower ({form.manpower.length})
                </h3>
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer gap-1 h-7"
                    onClick={() =>
                      addEntry<ManpowerEntry>("manpower", {
                        id: nextEntryId("mp"),
                        company: "Norskk",
                        trade: "",
                        headcount: 1,
                        hoursWorked: 8,
                        overtimeHours: 0,
                        foremanName: "",
                        workDescription: "",
                      })
                    }
                  >
                    <Plus className="h-3 w-3" /> Add Crew
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {form.manpower.map((mp, idx) => (
                  <div key={mp.id} className="rounded-lg border p-3 space-y-2 relative group">
                    {!isLocked && (
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => removeEntry("manpower", mp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Company</Label>
                        <Input
                          value={mp.company}
                          onChange={(e) => updateEntry("manpower", mp.id, { company: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Trade</Label>
                        <Input
                          value={mp.trade}
                          onChange={(e) => updateEntry("manpower", mp.id, { trade: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          placeholder="Carpenter, Electrician…"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Headcount</Label>
                        <Input
                          type="number"
                          value={mp.headcount}
                          onChange={(e) => updateEntry("manpower", mp.id, { headcount: parseInt(e.target.value) || 0 })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          min={0}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Hours</Label>
                          <Input
                            type="number"
                            value={mp.hoursWorked}
                            onChange={(e) => updateEntry("manpower", mp.id, { hoursWorked: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs mt-0.5"
                            disabled={isLocked}
                            min={0}
                            step={0.5}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">OT</Label>
                          <Input
                            type="number"
                            value={mp.overtimeHours}
                            onChange={(e) => updateEntry("manpower", mp.id, { overtimeHours: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs mt-0.5"
                            disabled={isLocked}
                            min={0}
                            step={0.5}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Foreman</Label>
                        <Input
                          value={mp.foremanName}
                          onChange={(e) => updateEntry("manpower", mp.id, { foremanName: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Work Description</Label>
                        <Input
                          value={mp.workDescription}
                          onChange={(e) => updateEntry("manpower", mp.id, { workDescription: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {form.manpower.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                    No crews logged. Click "Add Crew" to start.
                  </p>
                )}
                {/* Summary row */}
                {form.manpower.length > 0 && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    <span>Total: <strong className="text-foreground">{form.manpower.reduce((s, m) => s + m.headcount, 0)} workers</strong></span>
                    <span><strong className="text-foreground">{form.manpower.reduce((s, m) => s + m.hoursWorked, 0)}</strong> reg hrs</span>
                    <span><strong className="text-foreground">{form.manpower.reduce((s, m) => s + m.overtimeHours, 0)}</strong> OT hrs</span>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* ─── Section 3: Equipment Log ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  Equipment Log ({form.equipmentLog.length})
                </h3>
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer gap-1 h-7"
                    onClick={() =>
                      addEntry<EquipmentLogEntry>("equipmentLog", {
                        id: nextEntryId("el"),
                        equipmentId: "",
                        hoursUsed: 0,
                        idleHours: 0,
                        operatorName: "",
                        notes: "",
                      })
                    }
                  >
                    <Plus className="h-3 w-3" /> Add Equipment
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {form.equipmentLog.map((el) => (
                  <div key={el.id} className="rounded-lg border p-3 relative group">
                    {!isLocked && (
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => removeEntry("equipmentLog", el.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="col-span-2 md:col-span-1">
                        <Label className="text-[10px] text-muted-foreground">Equipment</Label>
                        <Select
                          value={el.equipmentId}
                          onValueChange={(v) => updateEntry("equipmentLog", el.id, { equipmentId: v })}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-7 text-xs mt-0.5 cursor-pointer">
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {equipment.filter((e) => e.id !== "eq-none").map((eq) => (
                              <SelectItem key={eq.id} value={eq.id} className="text-xs">
                                {eq.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Hrs Used</Label>
                        <Input
                          type="number"
                          value={el.hoursUsed}
                          onChange={(e) => updateEntry("equipmentLog", el.id, { hoursUsed: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          min={0}
                          step={0.5}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Idle Hrs</Label>
                        <Input
                          type="number"
                          value={el.idleHours}
                          onChange={(e) => updateEntry("equipmentLog", el.id, { idleHours: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          min={0}
                          step={0.5}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Operator</Label>
                        <Input
                          value={el.operatorName}
                          onChange={(e) => updateEntry("equipmentLog", el.id, { operatorName: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="col-span-2 md:col-span-5">
                        <Label className="text-[10px] text-muted-foreground">Notes</Label>
                        <Input
                          value={el.notes}
                          onChange={(e) => updateEntry("equipmentLog", el.id, { notes: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {form.equipmentLog.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                    No equipment logged.
                  </p>
                )}
              </div>
            </section>

            <Separator />

            {/* ─── Section 4: Work Performed ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <HardHat className="h-4 w-4 text-amber-500" />
                  Work Performed ({form.workPerformed.length})
                </h3>
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer gap-1 h-7"
                    onClick={() =>
                      addEntry<WorkPerformedEntry>("workPerformed", {
                        id: nextEntryId("wp"),
                        description: "",
                        location: "",
                        trade: "",
                        status: "in-progress",
                        percentComplete: 0,
                        photoUrls: [],
                        notes: "",
                      })
                    }
                  >
                    <Plus className="h-3 w-3" /> Add Activity
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {form.workPerformed.map((wp) => (
                  <div key={wp.id} className="rounded-lg border p-3 space-y-2 relative group">
                    {!isLocked && (
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => removeEntry("workPerformed", wp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Description</Label>
                      <Textarea
                        value={wp.description}
                        onChange={(e) => updateEntry("workPerformed", wp.id, { description: e.target.value })}
                        className="text-xs mt-0.5 min-h-[60px]"
                        disabled={isLocked}
                        placeholder="Describe work performed…"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Location</Label>
                        <Input
                          value={wp.location}
                          onChange={(e) => updateEntry("workPerformed", wp.id, { location: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          placeholder="Building, floor, area…"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Trade</Label>
                        <Input
                          value={wp.trade}
                          onChange={(e) => updateEntry("workPerformed", wp.id, { trade: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Status</Label>
                        <Select
                          value={wp.status}
                          onValueChange={(v) => updateEntry("workPerformed", wp.id, { status: v as "in-progress" | "completed" | "on-hold" })}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-7 text-xs mt-0.5 cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="in-progress" className="text-xs">In Progress</SelectItem>
                            <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                            <SelectItem value="on-hold" className="text-xs">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">% Complete</Label>
                        <Input
                          type="number"
                          value={wp.percentComplete}
                          onChange={(e) => updateEntry("workPerformed", wp.id, { percentComplete: parseInt(e.target.value) || 0 })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>
                    {/* Work-performed photos */}
                    <PhotoUpload
                      photos={wp.photoUrls}
                      onChange={(urls) => updateEntry("workPerformed", wp.id, { photoUrls: urls })}
                      storagePath={`daily-reports/${form.id}/work/${wp.id}`}
                      disabled={isLocked}
                      maxPhotos={5}
                    />
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Notes</Label>
                      <Input
                        value={wp.notes}
                        onChange={(e) => updateEntry("workPerformed", wp.id, { notes: e.target.value })}
                        className="h-7 text-xs mt-0.5"
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                ))}
                {form.workPerformed.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                    No activities logged.
                  </p>
                )}
              </div>
            </section>

            <Separator />

            {/* ─── Section 5: Delays ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-500" />
                  Delays ({form.delays.length})
                </h3>
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer gap-1 h-7"
                    onClick={() =>
                      addEntry<DelayEntry>("delays", {
                        id: nextEntryId("d"),
                        delayType: "other",
                        description: "",
                        durationHours: 0,
                        responsibleParty: "",
                        schedulImpact: false,
                      })
                    }
                  >
                    <Plus className="h-3 w-3" /> Add Delay
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {form.delays.map((d) => (
                  <div key={d.id} className="rounded-lg border p-3 relative group">
                    {!isLocked && (
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => removeEntry("delays", d.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Type</Label>
                        <Select
                          value={d.delayType}
                          onValueChange={(v) => updateEntry("delays", d.id, { delayType: v as DelayEntry["delayType"] })}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-7 text-xs mt-0.5 cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {Object.entries(delayTypeLabels).map(([val, lbl]) => (
                              <SelectItem key={val} value={val} className="text-xs">{lbl}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Duration (hrs)</Label>
                        <Input
                          type="number"
                          value={d.durationHours}
                          onChange={(e) => updateEntry("delays", d.id, { durationHours: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          min={0}
                          step={0.5}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Responsible Party</Label>
                        <Input
                          value={d.responsibleParty}
                          onChange={(e) => updateEntry("delays", d.id, { responsibleParty: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="flex items-end pb-0.5">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={d.schedulImpact}
                            onCheckedChange={(v) => updateEntry("delays", d.id, { schedulImpact: !!v })}
                            disabled={isLocked}
                            className="h-3.5 w-3.5"
                          />
                          Schedule impact?
                        </label>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="text-[10px] text-muted-foreground">Description</Label>
                      <Input
                        value={d.description}
                        onChange={(e) => updateEntry("delays", d.id, { description: e.target.value })}
                        className="h-7 text-xs mt-0.5"
                        disabled={isLocked}
                        placeholder="Describe the delay…"
                      />
                    </div>
                  </div>
                ))}
                {form.delays.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg border-dashed">
                    No delays — great day!
                  </p>
                )}
              </div>
            </section>

            <Separator />

            {/* ─── Section 6: Material Deliveries ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-600" />
                  Material Deliveries ({form.materialDeliveries.length})
                </h3>
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer gap-1 h-7"
                    onClick={() =>
                      addEntry<MaterialDelivery>("materialDeliveries", {
                        id: nextEntryId("md"),
                        description: "",
                        supplier: "",
                        quantity: "",
                        poNumber: "",
                        deliveryTicket: "",
                        receivedBy: "",
                        condition: "good",
                        notes: "",
                      })
                    }
                  >
                    <Plus className="h-3 w-3" /> Add Delivery
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {form.materialDeliveries.map((md) => (
                  <div key={md.id} className="rounded-lg border p-3 space-y-2 relative group">
                    {!isLocked && (
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => removeEntry("materialDeliveries", md.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[10px] text-muted-foreground">Description</Label>
                        <Input
                          value={md.description}
                          onChange={(e) => updateEntry("materialDeliveries", md.id, { description: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          placeholder="Material description…"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Supplier</Label>
                        <Input
                          value={md.supplier}
                          onChange={(e) => updateEntry("materialDeliveries", md.id, { supplier: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Quantity</Label>
                        <Input
                          value={md.quantity}
                          onChange={(e) => updateEntry("materialDeliveries", md.id, { quantity: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">PO #</Label>
                        <Input
                          value={md.poNumber}
                          onChange={(e) => updateEntry("materialDeliveries", md.id, { poNumber: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Delivery Ticket #</Label>
                        <Input
                          value={md.deliveryTicket}
                          onChange={(e) => updateEntry("materialDeliveries", md.id, { deliveryTicket: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Received By</Label>
                        <Input
                          value={md.receivedBy}
                          onChange={(e) => updateEntry("materialDeliveries", md.id, { receivedBy: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Condition</Label>
                        <Select
                          value={md.condition}
                          onValueChange={(v) => updateEntry("materialDeliveries", md.id, { condition: v as DeliveryCondition })}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-7 text-xs mt-0.5 cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {(Object.entries(deliveryConditionLabels) as [DeliveryCondition, string][]).map(([val, lbl]) => (
                              <SelectItem key={val} value={val} className="text-xs">{lbl}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                {form.materialDeliveries.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg border-dashed">
                    No deliveries today.
                  </p>
                )}
              </div>
            </section>

            <Separator />

            {/* ─── Section 7: Visitors ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-violet-500" />
                  Visitors ({form.visitors.length})
                </h3>
                {!isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer gap-1 h-7"
                    onClick={() =>
                      addEntry<VisitorEntry>("visitors", {
                        id: nextEntryId("v"),
                        name: "",
                        company: "",
                        purpose: "",
                        timeIn: "",
                        timeOut: "",
                      })
                    }
                  >
                    <Plus className="h-3 w-3" /> Add Visitor
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {form.visitors.map((v) => (
                  <div key={v.id} className="rounded-lg border p-3 relative group">
                    {!isLocked && (
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => removeEntry("visitors", v.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Name</Label>
                        <Input
                          value={v.name}
                          onChange={(e) => updateEntry("visitors", v.id, { name: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Company</Label>
                        <Input
                          value={v.company}
                          onChange={(e) => updateEntry("visitors", v.id, { company: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Purpose</Label>
                        <Input
                          value={v.purpose}
                          onChange={(e) => updateEntry("visitors", v.id, { purpose: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Time In</Label>
                        <Input
                          value={v.timeIn}
                          onChange={(e) => updateEntry("visitors", v.id, { timeIn: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          placeholder="9:00 AM"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Time Out</Label>
                        <Input
                          value={v.timeOut}
                          onChange={(e) => updateEntry("visitors", v.id, { timeOut: e.target.value })}
                          className="h-7 text-xs mt-0.5"
                          disabled={isLocked}
                          placeholder="11:00 AM"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {form.visitors.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg border-dashed">
                    No visitors today.
                  </p>
                )}
              </div>
            </section>

            <Separator />

            {/* ─── Section 8: Safety, Notes & Next Day ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Safety Notes
              </h3>
              <Textarea
                value={form.safetyNotes}
                onChange={(e) => update("safetyNotes", e.target.value)}
                placeholder="Toolbox talks, incidents, PPE compliance, hazards observed…"
                className="text-xs min-h-[60px]"
                disabled={isLocked}
              />
            </section>

            <Separator />

            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <StickyNote className="h-4 w-4 text-gray-500" />
                General Notes
              </h3>
              <Textarea
                value={form.generalNotes}
                onChange={(e) => update("generalNotes", e.target.value)}
                placeholder="General observations, progress summary, correspondence…"
                className="text-xs min-h-[60px]"
                disabled={isLocked}
              />
            </section>

            <Separator />

            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <CalendarPlus className="h-4 w-4 text-indigo-500" />
                Next Day Plan
              </h3>
              <Textarea
                value={form.nextDayPlan}
                onChange={(e) => update("nextDayPlan", e.target.value)}
                placeholder="Planned activities for tomorrow…"
                className="text-xs min-h-[60px]"
                disabled={isLocked}
              />
            </section>

            <Separator />

            {/* ─── Section 9: Photos ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Camera className="h-4 w-4 text-sky-500" />
                Report Photos ({form.photoUrls.length})
              </h3>
              <PhotoUpload
                photos={form.photoUrls}
                onChange={(urls) => update("photoUrls", urls)}
                storagePath={`daily-reports/${form.id}/photos`}
                disabled={isLocked}
              />
            </section>

            <Separator />

            {/* ─── Section 10: Signatures ─── */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Signatures</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SignaturePad
                  label={`Author — ${author?.name ?? "Unknown"}`}
                  value={form.authorSignature}
                  onChange={(sig) => update("authorSignature", sig)}
                  disabled={isLocked}
                  storagePath={`daily-reports/${form.id}/author-sig.png`}
                />
                <SignaturePad
                  label="Approver"
                  value={form.approverSignature}
                  onChange={(sig) => update("approverSignature", sig)}
                  disabled={isLocked}
                  storagePath={`daily-reports/${form.id}/approver-sig.png`}
                />
              </div>
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
                  <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                  <SelectItem value="submitted" className="text-xs">Submitted</SelectItem>
                  <SelectItem value="approved" className="text-xs">Approved</SelectItem>
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
