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
} from "lucide-react";

import type {
  WeatherCondition,
  GroundCondition,
  DeliveryCondition,
} from "@/lib/types/daily-reports";

// ── Weather ──
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

// ── Ground conditions ──
export const groundLabels: Record<GroundCondition, string> = {
  dry: "Dry",
  wet: "Wet",
  muddy: "Muddy",
  frozen: "Frozen",
  flooded: "Flooded",
};

// ── Delivery conditions ──
export const deliveryConditionLabels: Record<DeliveryCondition, string> = {
  good: "Good",
  damaged: "Damaged",
  partial: "Partial",
  rejected: "Rejected",
};

// ── Delay types ──
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
