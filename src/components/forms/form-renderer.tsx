"use client";

import * as React from "react";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Save, Camera, X, Plus, Trash2, Search, Eraser, Sun, CloudSun, Cloud, CloudOff, CloudRain, CloudSnow, CloudFog, Wind, CloudLightning, RefreshCw } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import type {
  FormTemplate,
  FormSection,
  FormField,
  FormFieldOption,
  FormFieldOptionsSource,
  FormSubmission,
  WeatherCondition,
} from "@/lib/types/time-tracking";
import { fetchWeatherForProject } from "@/lib/utils/weather";
import {
  useFormSubmissions,
  useProjects,
  useEmployees,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCurrentEmployee } from "@/hooks/use-current-employee";

// ── Conditional visibility check ──
function isFieldVisible(
  field: FormField,
  values: Record<string, unknown>
): boolean {
  if (!field.conditional) return true;
  const { fieldId, operator, value } = field.conditional;
  const actual = String(values[fieldId] ?? "");
  switch (operator) {
    case "equals":
      return actual === value;
    case "not-equals":
      return actual !== value;
    case "contains":
      return actual.toLowerCase().includes(value.toLowerCase());
    default:
      return true;
  }
}

// ── Data-source field (search-as-you-type + custom entry) ──
function DataSourceField({
  field,
  value,
  onChange,
  options,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  options: FormFieldOption[];
}) {
  const isMulti = field.type === "multiselect" || field.type === "checkbox";
  const [search, setSearch] = React.useState("");
  const [customInput, setCustomInput] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = isMulti
    ? (Array.isArray(value) ? (value as string[]) : [])
    : [];
  const singleValue = !isMulti ? String(value ?? "") : "";

  // Combine real options + any custom values already selected
  const allOptionValues = new Set(options.map((o) => o.value));
  const customSelected = isMulti
    ? selected.filter((v) => !allOptionValues.has(v))
    : singleValue && !allOptionValues.has(singleValue)
      ? [singleValue]
      : [];
  const customOptions: FormFieldOption[] = customSelected.map((v) => ({ value: v, label: v }));
  const allOptions = [...options, ...customOptions];

  const filtered = search.trim()
    ? allOptions.filter((o) =>
        o.label.toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  const toggleOption = (optValue: string) => {
    if (isMulti) {
      onChange(
        selected.includes(optValue)
          ? selected.filter((v) => v !== optValue)
          : [...selected, optValue]
      );
    } else {
      onChange(optValue);
    }
    setSearch("");
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    if (isMulti) {
      if (!selected.includes(name)) {
        onChange([...selected, name]);
      }
    } else {
      onChange(name);
    }
    setCustomInput("");
    setSearch("");
  };

  const resolveLabel = (v: string) => {
    const opt = allOptions.find((o) => o.value === v);
    return opt?.label || v;
  };

  return (
    <div ref={wrapperRef} className="space-y-2">
      {/* Selected chips (multi) */}
      {isMulti && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium"
            >
              {resolveLabel(v)}
              <button
                type="button"
                onClick={() => toggleOption(v)}
                className="hover:text-destructive cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Selected display (single) */}
      {!isMulti && singleValue && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="flex-1">{resolveLabel(singleValue)}</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search input + results + custom entry (hidden for single-select when value is set) */}
      {(isMulti || !singleValue) && (
        <>
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={field.placeholder || "Search…"}
              className="h-9 text-sm pl-8"
            />
          </div>

          {/* Search results dropdown */}
          {search.trim().length > 0 && (
            <div className="rounded-lg border bg-popover shadow-md max-h-[200px] overflow-y-auto">
              {filtered.length > 0 ? (
                <div className="p-1.5 space-y-0.5">
                  {filtered.map((opt) => {
                    const isChecked = isMulti
                      ? selected.includes(opt.value)
                      : singleValue === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        {isMulti ? (
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleOption(opt.value)}
                            className="h-3.5 w-3.5"
                          />
                        ) : (
                          <input
                            type="radio"
                            checked={isChecked}
                            onChange={() => toggleOption(opt.value)}
                            className="accent-primary h-3.5 w-3.5"
                          />
                        )}
                        <span className={isChecked ? "font-medium" : ""}>
                          {opt.label || opt.value}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No results found
                </p>
              )}
            </div>
          )}

          {/* Add custom name */}
          <div className="flex items-center gap-2">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Add a name not in the list…"
              className="h-8 text-xs flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 shrink-0 cursor-pointer"
              onClick={addCustom}
              disabled={!customInput.trim()}
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Signature field with explicit save button ──
function SignatureField({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const sigRef = React.useRef<SignatureCanvas>(null);
  const [hasStrokes, setHasStrokes] = React.useState(false);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      {value ? (
        <div className="text-center space-y-2">
          <img src={String(value)} alt="Signature" className="max-h-24 mx-auto" />
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => onChange("")}
          >
            <Eraser className="h-3.5 w-3.5" /> Clear & Re-sign
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground text-center">Draw your signature below</p>
          <div className="border rounded bg-white">
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              canvasProps={{ className: "w-full h-32" }}
              onEnd={() => setHasStrokes(true)}
            />
          </div>
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer gap-1.5 text-xs"
              onClick={() => {
                sigRef.current?.clear();
                setHasStrokes(false);
              }}
            >
              <Eraser className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button
              variant="default"
              size="sm"
              className="cursor-pointer gap-1.5 text-xs"
              disabled={!hasStrokes}
              onClick={() => {
                const dataUrl = sigRef.current?.getTrimmedCanvas().toDataURL("image/png");
                if (dataUrl) onChange(dataUrl);
              }}
            >
              <Save className="h-3.5 w-3.5" /> Save Signature
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Weather helpers ──
const WEATHER_CONDITIONS: { key: WeatherCondition; label: string; Icon: React.ElementType }[] = [
  { key: "sunny", label: "Sunny", Icon: Sun },
  { key: "partly-cloudy", label: "Partly Cloudy", Icon: CloudSun },
  { key: "cloudy", label: "Cloudy", Icon: Cloud },
  { key: "overcast", label: "Overcast", Icon: CloudOff },
  { key: "rain", label: "Rain", Icon: CloudRain },
  { key: "snow", label: "Snow", Icon: CloudSnow },
  { key: "fog", label: "Fog", Icon: CloudFog },
  { key: "windy", label: "Windy", Icon: Wind },
  { key: "thunderstorm", label: "Storm", Icon: CloudLightning },
];

interface WeatherValue {
  conditions: WeatherCondition[];
  temperature: string;
  windSpeed: string;
  precipitation: string;
}

// ── Weather field with auto-fill ──
function WeatherField({
  value,
  onChange,
  projectId,
  projects,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  projectId: string;
  projects: { id: string; city?: string; province?: string }[];
}) {
  const wx: WeatherValue = (value as WeatherValue) || {
    conditions: [],
    temperature: "",
    windSpeed: "",
    precipitation: "",
  };
  const [loading, setLoading] = React.useState(false);

  const update = (patch: Partial<WeatherValue>) => onChange({ ...wx, ...patch });

  const toggleCondition = (c: WeatherCondition) => {
    const next = wx.conditions.includes(c)
      ? wx.conditions.filter((x) => x !== c)
      : [...wx.conditions, c];
    update({ conditions: next });
  };

  const autoFill = async () => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj?.city) {
      toast.error("Select a project with a city to auto-fill weather");
      return;
    }
    setLoading(true);
    try {
      const result = await fetchWeatherForProject(
        proj.city,
        proj.province ?? "",
        format(new Date(), "yyyy-MM-dd")
      );
      if (result) {
        onChange({
          conditions: result.conditions,
          temperature: result.temperature,
          windSpeed: result.windSpeed,
          precipitation: result.precipitation,
        });
        toast.success("Weather auto-filled");
      } else {
        toast.error("Could not fetch weather data");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-3">
      {/* Auto-fill button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs cursor-pointer"
          disabled={loading || !projectId}
          onClick={autoFill}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Auto-fill Weather
        </Button>
      </div>

      {/* Condition buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        {WEATHER_CONDITIONS.map(({ key, label, Icon }) => {
          const active = wx.conditions.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleCondition(key)}
              className={`flex flex-col items-center gap-0.5 rounded-lg border p-2 text-xs transition-colors cursor-pointer ${
                active
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-muted hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Detail inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Temperature</Label>
          <Input
            value={wx.temperature}
            onChange={(e) => update({ temperature: e.target.value })}
            placeholder="-5°C – 3°C"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Wind Speed</Label>
          <Input
            value={wx.windSpeed}
            onChange={(e) => update({ windSpeed: e.target.value })}
            placeholder="15 km/h"
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground">Precipitation</Label>
          <Input
            value={wx.precipitation}
            onChange={(e) => update({ precipitation: e.target.value })}
            placeholder="None"
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ── Individual field renderer ──
function RenderField({
  field,
  value,
  onChange,
  resolvedOptions,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  resolvedOptions?: FormFieldOption[];
}) {
  const options = resolvedOptions || field.options || [];

  // Use search-based UI for data-sourced fields
  if (field.optionsSource && resolvedOptions) {
    return (
      <DataSourceField
        field={field}
        value={value}
        onChange={onChange}
        options={resolvedOptions}
      />
    );
  }

  switch (field.type) {
    case "text":
      return (
        <Input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
        />
      );

    case "textarea":
      return (
        <Textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          rows={3}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
        />
      );

    case "date":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs cursor-pointer"
            onClick={() => onChange(format(new Date(), "yyyy-MM-dd"))}
          >
            Today
          </Button>
        </div>
      );

    case "time":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs cursor-pointer"
            onClick={() => onChange(format(new Date(), "HH:mm"))}
          >
            Now
          </Button>
        </div>
      );

    case "select":
      return (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label || opt.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={(checked) => {
                  onChange(
                    checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value)
                  );
                }}
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      );
    }

    case "checkbox": {
      const checked = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checked.includes(opt.value)}
                onCheckedChange={(c) => {
                  onChange(
                    c
                      ? [...checked, opt.value]
                      : checked.filter((v) => v !== opt.value)
                  );
                }}
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      );
    }

    case "radio":
      return (
        <div className="space-y-1.5">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="accent-primary"
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      );

    case "toggle":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true || value === "true" || value === "yes"}
            onCheckedChange={(v: boolean) => onChange(v)}
          />
          <span className="text-sm text-muted-foreground">
            {value === true || value === "true" || value === "yes" ? "Yes" : "No"}
          </span>
        </div>
      );

    case "photo": {
      const photos = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <Camera className="h-3.5 w-3.5" />
            Take Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    onChange([...photos, reader.result]);
                  }
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      );
    }

    case "signature": {
      return <SignatureField value={value} onChange={onChange} />;
    }

    case "weather":
      return null; // rendered by WeatherField wrapper in form sections

    case "section-header":
      return null; // rendered separately

    case "label":
      return null; // rendered as text only

    default:
      return <p className="text-xs text-muted-foreground">Unsupported field type</p>;
  }
}

// ── Repeatable Section ──
function RepeatableSection({
  section,
  entries,
  onChange,
  getFieldOptions,
}: {
  section: FormSection;
  entries: Record<string, unknown>[];
  onChange: (entries: Record<string, unknown>[]) => void;
  getFieldOptions: (field: FormField) => FormFieldOption[] | undefined;
}) {
  const addEntry = () => onChange([...entries, {}]);
  const removeEntry = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : [{}]);
  };
  const updateEntry = (idx: number, fieldId: string, value: unknown) => {
    onChange(entries.map((e, i) => (i === idx ? { ...e, [fieldId]: value } : e)));
  };

  return (
    <div className="space-y-4">
      {section.title && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title} ({entries.length})
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1 cursor-pointer"
              onClick={addEntry}
            >
              <Plus className="h-3 w-3" /> Add Entry
            </Button>
          </div>
          <Separator />
        </>
      )}

      {entries.map((entry, eIdx) => (
        <div key={eIdx} className="rounded-lg border p-3 space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              #{eIdx + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive cursor-pointer"
              onClick={() => removeEntry(eIdx)}
              disabled={entries.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-3">
            {section.fields.map((field) => {
              if (!isFieldVisible(field, entry)) return null;

              if (field.type === "section-header") {
                return (
                  <div key={field.id} className="pt-1">
                    <h4 className="text-sm font-bold">{field.label}</h4>
                  </div>
                );
              }

              if (field.type === "label") {
                return (
                  <p key={field.id} className="text-sm text-muted-foreground">
                    {field.label}
                  </p>
                );
              }

              return (
                <div
                  key={field.id}
                  className={field.width === "half" ? "w-1/2 inline-block pr-2 align-top" : ""}
                >
                  <Label className="text-xs font-medium mb-1 block">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <RenderField
                    field={field}
                    value={entry[field.id]}
                    onChange={(v) => updateEntry(eIdx, field.id, v)}
                    resolvedOptions={getFieldOptions(field)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!section.title && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs gap-1 cursor-pointer"
          onClick={addEntry}
        >
          <Plus className="h-3 w-3" /> Add Entry
        </Button>
      )}
    </div>
  );
}

// ── Main Form Renderer ──

/** Extract linked entity IDs from form values based on data-source fields */
function extractLinkedIds(
  sections: FormSection[],
  values: Record<string, unknown>,
): {
  linkedProjectIds?: string[];
  linkedEquipmentIds?: string[];
  linkedEmployeeIds?: string[];
  linkedAttachmentIds?: string[];
  linkedToolIds?: string[];
} {
  const map: Record<string, Set<string>> = {
    projects: new Set<string>(),
    equipment: new Set<string>(),
    employees: new Set<string>(),
    attachments: new Set<string>(),
    tools: new Set<string>(),
  };

  const processField = (field: FormField, vals: Record<string, unknown>) => {
    if (!field.optionsSource) return;
    const raw = vals[field.id];
    if (!raw) return;
    const ids = Array.isArray(raw) ? raw : [raw];
    for (const id of ids) {
      const str = String(id).trim();
      if (str) map[field.optionsSource].add(str);
    }
  };

  for (const section of sections) {
    if (section.repeatable) {
      const entries = values[`__repeatable_${section.id}`];
      if (Array.isArray(entries)) {
        for (const entry of entries as Record<string, unknown>[]) {
          for (const field of section.fields) processField(field, entry);
        }
      }
    } else {
      for (const field of section.fields) processField(field, values);
    }
  }

  const toArr = (s: Set<string>) => [...s];
  const result: Record<string, string[]> = {};
  if (map.projects.size > 0) result.linkedProjectIds = toArr(map.projects);
  if (map.equipment.size > 0) result.linkedEquipmentIds = toArr(map.equipment);
  if (map.employees.size > 0) result.linkedEmployeeIds = toArr(map.employees);
  if (map.attachments.size > 0) result.linkedAttachmentIds = toArr(map.attachments);
  if (map.tools.size > 0) result.linkedToolIds = toArr(map.tools);
  return result;
}

interface FormRendererProps {
  template: FormTemplate;
  existingSubmission?: FormSubmission;
  onBack: () => void;
}

export function FormRenderer({ template, existingSubmission, onBack }: FormRendererProps) {
  const { user } = useAuth();
  const { employee } = useCurrentEmployee();
  const { data: projects } = useProjects();
  const { data: employees } = useEmployees();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();
  const { add, update } = useFormSubmissions();
  const [saving, setSaving] = React.useState(false);

  // Resolve data-source options for fields that use optionsSource
  const sourceOptions = React.useMemo<Record<FormFieldOptionsSource, FormFieldOption[]>>(() => ({
    employees: employees
      .filter((e) => e.status === "active")
      .map((e) => ({ value: e.id, label: e.name })),
    projects: projects
      .filter((p) => p.status === "active")
      .map((p) => ({ value: p.id, label: p.name })),
    equipment: equipment
      .filter((e) => e.status !== "retired" && e.id !== EQUIPMENT_NONE_ID)
      .map((e) => ({ value: e.id, label: e.number ? `${e.name} #${e.number}` : e.name })),
    attachments: attachments
      .filter((a) => a.status !== "retired")
      .map((a) => ({ value: a.id, label: a.number ? `${a.name} #${a.number}` : a.name })),
    tools: tools
      .filter((t) => t.status !== "retired" && t.status !== "lost")
      .map((t) => ({ value: t.id, label: t.number ? `${t.name} #${t.number}` : t.name })),
  }), [employees, projects, equipment, attachments, tools]);

  const getFieldOptions = (field: FormField): FormFieldOption[] | undefined => {
    if (field.optionsSource) return sourceOptions[field.optionsSource];
    return undefined;
  };

  const [values, setValues] = React.useState<Record<string, unknown>>(
    existingSubmission?.values || {}
  );
  const [projectId, setProjectId] = React.useState(existingSubmission?.projectId || "");
  const [equipmentId, setEquipmentId] = React.useState(existingSubmission?.equipmentId || "");

  const setValue = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validate = (): string | null => {
    if (template.requireProject && !projectId) {
      return "Please select a project.";
    }
    if (template.requireEquipment && !equipmentId) {
      return "Please select equipment.";
    }
    for (const section of template.sections) {
      if (section.repeatable) {
        const entries = (values[`__repeatable_${section.id}`] as Record<string, unknown>[] | undefined) ?? [{}];
        for (let eIdx = 0; eIdx < entries.length; eIdx++) {
          const entry = entries[eIdx];
          for (const field of section.fields) {
            if (!isFieldVisible(field, entry)) continue;
            if (!field.required) continue;
            const v = entry[field.id];
            if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
              return `"${field.label}" is required (entry #${eIdx + 1}).`;
            }
            if (field.type === "weather" && v && typeof v === "object" && (!("conditions" in v) || !(v as WeatherValue).conditions?.length)) {
              return `"${field.label}" requires at least one weather condition (entry #${eIdx + 1}).`;
            }
          }
        }
      } else {
        for (const field of section.fields) {
          if (!isFieldVisible(field, values)) continue;
          if (!field.required) continue;
          const v = values[field.id];
          if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
            return `"${field.label}" is required.`;
          }
          if (field.type === "weather" && v && typeof v === "object" && (!("conditions" in v) || !(v as WeatherValue).conditions?.length)) {
            return `"${field.label}" requires at least one weather condition.`;
          }
        }
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const linked = extractLinkedIds(template.sections, values);

      if (existingSubmission) {
        await update(existingSubmission.id, JSON.parse(JSON.stringify({
          values,
          projectId: projectId || undefined,
          equipmentId: equipmentId || undefined,
          status: "submitted",
          updatedAt: now,
          category: template.category,
          ...linked,
        })));
      } else {
        const submission = JSON.parse(JSON.stringify({
          id: `sub-${crypto.randomUUID().slice(0, 10)}`,
          templateId: template.id,
          templateName: template.name,
          projectId: projectId || undefined,
          equipmentId: equipmentId || undefined,
          submittedById: user?.uid || "",
          submittedByName: employee?.name || "Unknown",
          status: "submitted",
          values,
          date: now.slice(0, 10),
          createdAt: now,
          updatedAt: now,
          category: template.category,
          ...linked,
        })) as FormSubmission;
        await add(submission);
      }
      toast.success("Form saved!");
      onBack();
    } catch {
      toast.error("Failed to save form.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-36">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">{template.name}</h2>
          {template.description && (
            <p className="text-xs text-muted-foreground">{template.description}</p>
          )}
        </div>
      </div>

      {/* Project Selector */}
      {template.requireProject && (
        <div className="mb-4">
          <Label className="text-xs font-medium">Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select project…" />
            </SelectTrigger>
            <SelectContent>
              {projects
                .filter((p) => p.status === "active")
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Equipment Selector */}
      {template.requireEquipment && (
        <div className="mb-4">
          <Label className="text-xs font-medium">Equipment</Label>
          <Select value={equipmentId} onValueChange={setEquipmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select equipment…" />
            </SelectTrigger>
            <SelectContent>
              {equipment
                .filter((e) => e.status !== "retired" && e.id !== EQUIPMENT_NONE_ID)
                .map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.number ? `${e.name} #${e.number}` : e.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sections & Fields */}
      <div className="space-y-6">
        {template.sections.map((section) =>
          section.repeatable ? (
            <RepeatableSection
              key={section.id}
              section={section}
              entries={(values[`__repeatable_${section.id}`] as Record<string, unknown>[] | undefined) ?? [{}]}
              onChange={(entries) => setValue(`__repeatable_${section.id}`, entries)}
              getFieldOptions={getFieldOptions}
            />
          ) : (
            <div key={section.id} className="space-y-4">
              {section.title && (
                <>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </h3>
                  <Separator />
                </>
              )}

              <div className="space-y-4">
                {section.fields.map((field) => {
                  if (!isFieldVisible(field, values)) return null;

                  if (field.type === "section-header") {
                    return (
                      <div key={field.id} className="pt-2">
                        <h4 className="text-sm font-bold">{field.label}</h4>
                      </div>
                    );
                  }

                  if (field.type === "label") {
                    return (
                      <p key={field.id} className="text-sm text-muted-foreground">
                        {field.label}
                      </p>
                    );
                  }

                  if (field.type === "weather") {
                    return (
                      <div key={field.id}>
                        <Label className="text-xs font-medium mb-1 block">
                          {field.label}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        <WeatherField
                          value={values[field.id]}
                          onChange={(v) => setValue(field.id, v)}
                          projectId={projectId}
                          projects={projects}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={field.id}
                      className={field.width === "half" ? "w-1/2 inline-block pr-2 align-top" : ""}
                    >
                      <Label className="text-xs font-medium mb-1 block">
                        {field.label}
                        {field.required && <span className="text-destructive ml-0.5">*</span>}
                      </Label>
                      <RenderField
                        field={field}
                        value={values[field.id]}
                        onChange={(v) => setValue(field.id, v)}
                        resolvedOptions={getFieldOptions(field)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Submit Footer */}
      <div className="fixed bottom-20 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 py-3 safe-area-bottom z-40">
        <div className="max-w-md mx-auto">
          <Button
            className="w-full gap-1.5 cursor-pointer"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save Form"}
          </Button>
        </div>
      </div>
    </div>
  );
}
