"use client";

import * as React from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { WeatherCondition } from "@/lib/types/time-tracking";
import { fetchWeatherForProject } from "@/lib/utils/weather";
import { WEATHER_CONDITIONS, type WeatherValue } from "./form-utils";

export function WeatherField({
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
