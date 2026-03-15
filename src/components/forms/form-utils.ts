import type {
  FormField,
  FormSection,
  WeatherCondition,
} from "@/lib/types/time-tracking";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudOff,
  CloudRain,
  CloudSnow,
  CloudFog,
  Wind,
  CloudLightning,
} from "lucide-react";

// ── Conditional visibility check ──
export function isFieldVisible(
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

// ── Weather helpers ──
export const WEATHER_CONDITIONS: {
  key: WeatherCondition;
  label: string;
  Icon: React.ElementType;
}[] = [
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

export interface WeatherValue {
  conditions: WeatherCondition[];
  temperature: string;
  windSpeed: string;
  precipitation: string;
}

/** Extract linked entity IDs from form values based on data-source fields */
export function extractLinkedIds(
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
