"use client";

import * as React from "react";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
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
  Plus,
  Trash2,
  Users,
  Wrench,
  HardHat,
  Clock,
  Package,
  UserCheck,
  Camera,
  Sunrise,
  Hammer,
  Moon,
  DollarSign,
  FileText,
  Truck,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/shared/photo-upload";

import type {
  WeatherCondition,
  GroundCondition,
  DeliveryCondition,
  ManpowerEntry,
  EquipmentLogEntry,
  WorkPerformedEntry,
  DelayEntry,
  MaterialDelivery,
  VisitorEntry,
  DailyReport,
  Equipment,
} from "@/lib/types/time-tracking";

// ── Helpers ──
export function nextEntryId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export const weatherIcons: Record<WeatherCondition, React.ElementType> = {
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

export const weatherLabels: Record<WeatherCondition, string> = {
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

export const groundLabels: Record<GroundCondition, string> = {
  dry: "Dry",
  wet: "Wet",
  muddy: "Muddy",
  frozen: "Frozen",
  flooded: "Flooded",
};

export const delayTypeLabels: Record<string, string> = {
  weather: "Weather",
  material: "Material",
  labor: "Labor",
  equipment: "Equipment",
  owner: "Owner",
  inspection: "Inspection",
  design: "Design",
  other: "Other",
};

export const deliveryConditionLabels: Record<DeliveryCondition, string> = {
  good: "Good",
  damaged: "Damaged",
  partial: "Partial",
  rejected: "Rejected",
};

// ── Common types ──
interface ListSectionCallbacks {
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}

// ────────────────────────────────────────────────────────
// Section 1: Weather
// ────────────────────────────────────────────────────────
interface WeatherSectionProps {
  weather: DailyReport["weather"];
  isLocked: boolean;
  onUpdateWeather: <K extends keyof DailyReport["weather"]>(
    key: K,
    value: DailyReport["weather"][K]
  ) => void;
  onToggleCondition: (cond: WeatherCondition) => void;
}

export function WeatherSection({
  weather,
  isLocked,
  onUpdateWeather,
  onToggleCondition,
}: WeatherSectionProps) {
  return (
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
              const active = weather.conditions.includes(cond);
              return (
                <button
                  key={cond}
                  type="button"
                  disabled={isLocked}
                  onClick={() => onToggleCondition(cond)}
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
              value={weather.temperature}
              onChange={(e) => onUpdateWeather("temperature", e.target.value)}
              placeholder="28°F / 38°F"
              className="h-8 text-xs mt-1"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Wind</Label>
            <Input
              value={weather.windSpeed}
              onChange={(e) => onUpdateWeather("windSpeed", e.target.value)}
              placeholder="15 mph NW"
              className="h-8 text-xs mt-1"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Precipitation</Label>
            <Input
              value={weather.precipitation}
              onChange={(e) => onUpdateWeather("precipitation", e.target.value)}
              placeholder="None"
              className="h-8 text-xs mt-1"
              disabled={isLocked}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ground Conditions</Label>
            <Select
              value={weather.groundConditions}
              onValueChange={(v) => onUpdateWeather("groundConditions", v as GroundCondition)}
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
              checked={weather.weatherDelay}
              onCheckedChange={(v) => onUpdateWeather("weatherDelay", !!v)}
              disabled={isLocked}
              className="h-3.5 w-3.5"
            />
            <span>Weather delay?</span>
          </label>
          {weather.weatherDelay && (
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">Hours lost:</Label>
              <Input
                type="number"
                value={weather.delayHours}
                onChange={(e) => onUpdateWeather("delayHours", parseFloat(e.target.value) || 0)}
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
            value={weather.notes}
            onChange={(e) => onUpdateWeather("notes", e.target.value)}
            placeholder="Additional weather observations…"
            className="text-xs mt-1 min-h-[48px]"
            disabled={isLocked}
          />
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────
// Section 2: Manpower
// ────────────────────────────────────────────────────────
interface ManpowerSectionProps extends ListSectionCallbacks {
  entries: ManpowerEntry[];
  isLocked: boolean;
  onAdd: () => void;
}

export function ManpowerSection({
  entries,
  isLocked,
  onAdd,
  onRemove,
  onUpdate,
}: ManpowerSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-orange-500" />
          Manpower ({entries.length})
        </h3>
        {!isLocked && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer gap-1 h-7"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3" /> Add Crew
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {entries.map((mp) => (
          <div key={mp.id} className="rounded-lg border p-3 space-y-2 relative group">
            {!isLocked && (
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => onRemove(mp.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Company</Label>
                <Input
                  value={mp.company}
                  onChange={(e) => onUpdate(mp.id, { company: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Trade</Label>
                <Input
                  value={mp.trade}
                  onChange={(e) => onUpdate(mp.id, { trade: e.target.value })}
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
                  onChange={(e) => onUpdate(mp.id, { headcount: parseInt(e.target.value) || 0 })}
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
                    onChange={(e) => onUpdate(mp.id, { hoursWorked: parseFloat(e.target.value) || 0 })}
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
                    onChange={(e) => onUpdate(mp.id, { overtimeHours: parseFloat(e.target.value) || 0 })}
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
                  onChange={(e) => onUpdate(mp.id, { foremanName: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Work Description</Label>
                <Input
                  value={mp.workDescription}
                  onChange={(e) => onUpdate(mp.id, { workDescription: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
            No crews logged. Click &quot;Add Crew&quot; to start.
          </p>
        )}
        {/* Summary row */}
        {entries.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <span>Total: <strong className="text-foreground">{entries.reduce((s, m) => s + m.headcount, 0)} workers</strong></span>
            <span><strong className="text-foreground">{entries.reduce((s, m) => s + m.hoursWorked, 0)}</strong> reg hrs</span>
            <span><strong className="text-foreground">{entries.reduce((s, m) => s + m.overtimeHours, 0)}</strong> OT hrs</span>
          </div>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────
// Section 3: Equipment Log
// ────────────────────────────────────────────────────────
interface EquipmentLogSectionProps extends ListSectionCallbacks {
  entries: EquipmentLogEntry[];
  equipment: Equipment[];
  isLocked: boolean;
  onAdd: () => void;
}

export function EquipmentLogSection({
  entries,
  equipment,
  isLocked,
  onAdd,
  onRemove,
  onUpdate,
}: EquipmentLogSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wrench className="h-4 w-4 text-blue-500" />
          Equipment Log ({entries.length})
        </h3>
        {!isLocked && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer gap-1 h-7"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3" /> Add Equipment
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {entries.map((el) => (
          <div key={el.id} className="rounded-lg border p-3 relative group">
            {!isLocked && (
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => onRemove(el.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            )}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="col-span-2 md:col-span-1">
                <Label className="text-[10px] text-muted-foreground">Equipment</Label>
                <Select
                  value={el.equipmentId}
                  onValueChange={(v) => onUpdate(el.id, { equipmentId: v })}
                  disabled={isLocked}
                >
                  <SelectTrigger className="h-7 text-xs mt-0.5 cursor-pointer">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {equipment.filter((e) => e.id !== EQUIPMENT_NONE_ID).map((eq) => (
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
                  onChange={(e) => onUpdate(el.id, { hoursUsed: parseFloat(e.target.value) || 0 })}
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
                  onChange={(e) => onUpdate(el.id, { idleHours: parseFloat(e.target.value) || 0 })}
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
                  onChange={(e) => onUpdate(el.id, { operatorName: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div className="col-span-2 md:col-span-5">
                <Label className="text-[10px] text-muted-foreground">Notes</Label>
                <Input
                  value={el.notes}
                  onChange={(e) => onUpdate(el.id, { notes: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
            No equipment logged.
          </p>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────
// Section 4: Work Performed
// ────────────────────────────────────────────────────────
interface WorkPerformedSectionProps extends ListSectionCallbacks {
  entries: WorkPerformedEntry[];
  reportId: string;
  isLocked: boolean;
  onAdd: () => void;
}

export function WorkPerformedSection({
  entries,
  reportId,
  isLocked,
  onAdd,
  onRemove,
  onUpdate,
}: WorkPerformedSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <HardHat className="h-4 w-4 text-amber-500" />
          Work Performed ({entries.length})
        </h3>
        {!isLocked && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer gap-1 h-7"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3" /> Add Activity
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {entries.map((wp) => (
          <div key={wp.id} className="rounded-lg border p-3 space-y-2 relative group">
            {!isLocked && (
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => onRemove(wp.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            )}
            <div>
              <Label className="text-[10px] text-muted-foreground">Description</Label>
              <Textarea
                value={wp.description}
                onChange={(e) => onUpdate(wp.id, { description: e.target.value })}
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
                  onChange={(e) => onUpdate(wp.id, { location: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                  placeholder="Building, floor, area…"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Trade</Label>
                <Input
                  value={wp.trade}
                  onChange={(e) => onUpdate(wp.id, { trade: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Status</Label>
                <Select
                  value={wp.status}
                  onValueChange={(v) => onUpdate(wp.id, { status: v as "in-progress" | "completed" | "on-hold" })}
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
                  onChange={(e) => onUpdate(wp.id, { percentComplete: parseInt(e.target.value) || 0 })}
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
              onChange={(urls) => onUpdate(wp.id, { photoUrls: urls })}
              storagePath={`daily-reports/${reportId}/work/${wp.id}`}
              disabled={isLocked}
              maxPhotos={5}
            />
            <div>
              <Label className="text-[10px] text-muted-foreground">Notes</Label>
              <Input
                value={wp.notes}
                onChange={(e) => onUpdate(wp.id, { notes: e.target.value })}
                className="h-7 text-xs mt-0.5"
                disabled={isLocked}
              />
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
            No activities logged.
          </p>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────
// Section 5: Delays
// ────────────────────────────────────────────────────────
interface DelaysSectionProps extends ListSectionCallbacks {
  entries: DelayEntry[];
  isLocked: boolean;
  onAdd: () => void;
}

export function DelaysSection({
  entries,
  isLocked,
  onAdd,
  onRemove,
  onUpdate,
}: DelaysSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-red-500" />
          Delays ({entries.length})
        </h3>
        {!isLocked && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer gap-1 h-7"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3" /> Add Delay
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {entries.map((d) => (
          <div key={d.id} className="rounded-lg border p-3 relative group">
            {!isLocked && (
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => onRemove(d.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Type</Label>
                <Select
                  value={d.delayType}
                  onValueChange={(v) => onUpdate(d.id, { delayType: v as DelayEntry["delayType"] })}
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
                  onChange={(e) => onUpdate(d.id, { durationHours: parseFloat(e.target.value) || 0 })}
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
                  onChange={(e) => onUpdate(d.id, { responsibleParty: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={d.scheduleImpact}
                    onCheckedChange={(v) => onUpdate(d.id, { scheduleImpact: !!v })}
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
                onChange={(e) => onUpdate(d.id, { description: e.target.value })}
                className="h-7 text-xs mt-0.5"
                disabled={isLocked}
                placeholder="Describe the delay…"
              />
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg border-dashed">
            No delays — great day!
          </p>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────
// Section 6: Material Deliveries
// ────────────────────────────────────────────────────────
interface MaterialDeliveriesSectionProps extends ListSectionCallbacks {
  entries: MaterialDelivery[];
  isLocked: boolean;
  onAdd: () => void;
}

export function MaterialDeliveriesSection({
  entries,
  isLocked,
  onAdd,
  onRemove,
  onUpdate,
}: MaterialDeliveriesSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-green-600" />
          Material Deliveries ({entries.length})
        </h3>
        {!isLocked && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer gap-1 h-7"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3" /> Add Delivery
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {entries.map((md) => (
          <div key={md.id} className="rounded-lg border p-3 space-y-2 relative group">
            {!isLocked && (
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => onRemove(md.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="col-span-2">
                <Label className="text-[10px] text-muted-foreground">Description</Label>
                <Input
                  value={md.description}
                  onChange={(e) => onUpdate(md.id, { description: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                  placeholder="Material description…"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Supplier</Label>
                <Input
                  value={md.supplier}
                  onChange={(e) => onUpdate(md.id, { supplier: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Quantity</Label>
                <Input
                  value={md.quantity}
                  onChange={(e) => onUpdate(md.id, { quantity: e.target.value })}
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
                  onChange={(e) => onUpdate(md.id, { poNumber: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Delivery Ticket #</Label>
                <Input
                  value={md.deliveryTicket}
                  onChange={(e) => onUpdate(md.id, { deliveryTicket: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Received By</Label>
                <Input
                  value={md.receivedBy}
                  onChange={(e) => onUpdate(md.id, { receivedBy: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Condition</Label>
                <Select
                  value={md.condition}
                  onValueChange={(v) => onUpdate(md.id, { condition: v as DeliveryCondition })}
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
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg border-dashed">
            No deliveries today.
          </p>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────
// Section 7: Visitors
// ────────────────────────────────────────────────────────
interface VisitorsSectionProps extends ListSectionCallbacks {
  entries: VisitorEntry[];
  isLocked: boolean;
  onAdd: () => void;
}

export function VisitorsSection({
  entries,
  isLocked,
  onAdd,
  onRemove,
  onUpdate,
}: VisitorsSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-violet-500" />
          Visitors ({entries.length})
        </h3>
        {!isLocked && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs cursor-pointer gap-1 h-7"
            onClick={onAdd}
          >
            <Plus className="h-3 w-3" /> Add Visitor
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {entries.map((v) => (
          <div key={v.id} className="rounded-lg border p-3 relative group">
            {!isLocked && (
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => onRemove(v.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            )}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Name</Label>
                <Input
                  value={v.name}
                  onChange={(e) => onUpdate(v.id, { name: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Company</Label>
                <Input
                  value={v.company}
                  onChange={(e) => onUpdate(v.id, { company: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Purpose</Label>
                <Input
                  value={v.purpose}
                  onChange={(e) => onUpdate(v.id, { purpose: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Time In</Label>
                <Input
                  value={v.timeIn}
                  onChange={(e) => onUpdate(v.id, { timeIn: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                  placeholder="9:00 AM"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Time Out</Label>
                <Input
                  value={v.timeOut}
                  onChange={(e) => onUpdate(v.id, { timeOut: e.target.value })}
                  className="h-7 text-xs mt-0.5"
                  disabled={isLocked}
                  placeholder="11:00 AM"
                />
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 border rounded-lg border-dashed">
            No visitors today.
          </p>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────
// Section: Information (Work Description + Third Party Rentals)
// ────────────────────────────────────────────────────────
interface InformationSectionProps {
  workDescription: string;
  thirdPartyRentals: string;
  isLocked: boolean;
  onUpdateWorkDescription: (v: string) => void;
  onUpdateThirdPartyRentals: (v: string) => void;
}

export function InformationSection({
  workDescription,
  thirdPartyRentals,
  isLocked,
  onUpdateWorkDescription,
  onUpdateThirdPartyRentals,
}: InformationSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-blue-600" />
        Information
      </h3>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Work Description</Label>
          <Textarea
            value={workDescription}
            onChange={(e) => onUpdateWorkDescription(e.target.value)}
            placeholder="Describe the main work performed today…"
            className="text-xs mt-1 min-h-[60px]"
            disabled={isLocked}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Third Party Rental Description (In/Out)</Label>
          <Textarea
            value={thirdPartyRentals}
            onChange={(e) => onUpdateThirdPartyRentals(e.target.value)}
            placeholder="e.g. 50T crane — IN at 7 AM, OUT at 4 PM…"
            className="text-xs mt-1 min-h-[48px]"
            disabled={isLocked}
          />
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────
// Section: Site Photos (Morning / Work Hours / End of Day)
// ────────────────────────────────────────────────────────
interface SitePhotosSectionProps {
  morningPhotoUrls: string[];
  workPhotoUrls: string[];
  endOfDayPhotoUrls: string[];
  reportId: string;
  isLocked: boolean;
  onUpdateMorning: (urls: string[]) => void;
  onUpdateWork: (urls: string[]) => void;
  onUpdateEndOfDay: (urls: string[]) => void;
}

export function SitePhotosSection({
  morningPhotoUrls,
  workPhotoUrls,
  endOfDayPhotoUrls,
  reportId,
  isLocked,
  onUpdateMorning,
  onUpdateWork,
  onUpdateEndOfDay,
}: SitePhotosSectionProps) {
  const totalPhotos =
    morningPhotoUrls.length + workPhotoUrls.length + endOfDayPhotoUrls.length;

  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Camera className="h-4 w-4 text-sky-500" />
        Site Photos ({totalPhotos})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Morning */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Sunrise className="h-3.5 w-3.5 text-amber-500" />
            Morning ({morningPhotoUrls.length})
          </div>
          <PhotoUpload
            photos={morningPhotoUrls}
            onChange={onUpdateMorning}
            storagePath={`daily-reports/${reportId}/morning`}
            disabled={isLocked}
            maxPhotos={10}
          />
        </div>

        {/* Work Hours */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Hammer className="h-3.5 w-3.5 text-orange-500" />
            Work Hours ({workPhotoUrls.length})
          </div>
          <PhotoUpload
            photos={workPhotoUrls}
            onChange={onUpdateWork}
            storagePath={`daily-reports/${reportId}/work`}
            disabled={isLocked}
            maxPhotos={10}
          />
        </div>

        {/* End of Day */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Moon className="h-3.5 w-3.5 text-indigo-500" />
            End of Day ({endOfDayPhotoUrls.length})
          </div>
          <PhotoUpload
            photos={endOfDayPhotoUrls}
            onChange={onUpdateEndOfDay}
            storagePath={`daily-reports/${reportId}/eod`}
            disabled={isLocked}
            maxPhotos={10}
          />
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────
// Section: T&M Information (Time & Materials)
// ────────────────────────────────────────────────────────
interface TMInformationSectionProps {
  tmWork: boolean;
  tmWorkDescription: string;
  tmDailyRentals: string;
  isLocked: boolean;
  onUpdateTmWork: (v: boolean) => void;
  onUpdateTmWorkDescription: (v: string) => void;
  onUpdateTmDailyRentals: (v: string) => void;
}

export function TMInformationSection({
  tmWork,
  tmWorkDescription,
  tmDailyRentals,
  isLocked,
  onUpdateTmWork,
  onUpdateTmWorkDescription,
  onUpdateTmDailyRentals,
}: TMInformationSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <DollarSign className="h-4 w-4 text-emerald-600" />
        T&M Information
      </h3>
      <div className="space-y-3">
        <div className="flex items-center gap-6">
          <p className="text-xs text-muted-foreground">Was there any T&M work today?</p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={tmWork}
                onCheckedChange={() => { if (!isLocked) onUpdateTmWork(true); }}
                disabled={isLocked}
                className="h-3.5 w-3.5"
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={!tmWork}
                onCheckedChange={() => { if (!isLocked) onUpdateTmWork(false); }}
                disabled={isLocked}
                className="h-3.5 w-3.5"
              />
              No
            </label>
          </div>
        </div>

        {tmWork && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">T&M Work Explained</Label>
              <Textarea
                value={tmWorkDescription}
                onChange={(e) => onUpdateTmWorkDescription(e.target.value)}
                placeholder="Describe the T&M work…"
                className="text-xs mt-1 min-h-[60px]"
                disabled={isLocked}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">T&M Daily Rentals</Label>
              <Textarea
                value={tmDailyRentals}
                onChange={(e) => onUpdateTmDailyRentals(e.target.value)}
                placeholder="List any T&M rentals used today…"
                className="text-xs mt-1 min-h-[60px]"
                disabled={isLocked}
              />
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic border-t pt-2">
          Please review all daily tasks with Project Foreman or Manager to verify if any tasks were T&M or Lump Sum.
        </p>
      </div>
    </section>
  );
}
