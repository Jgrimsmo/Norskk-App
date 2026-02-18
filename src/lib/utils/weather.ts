import type { WeatherCondition, GroundCondition } from "@/lib/types/time-tracking";

/** Shape returned by /api/weather and used to patch a WeatherEntry. */
export interface AutoWeatherResult {
  conditions: WeatherCondition[];
  temperature: string;
  windSpeed: string;
  precipitation: string;
  groundConditions: GroundCondition;
}

/**
 * Fetches weather for a project location using city + province.
 * Returns null on any error so callers can fail silently.
 */
export async function fetchWeatherForProject(
  city: string,
  province: string,
  date: string
): Promise<AutoWeatherResult | null> {
  try {
    const params = new URLSearchParams({ city, province, date });
    const res = await fetch(`/api/weather?${params.toString()}`);
    if (!res.ok) return null;
    return await res.json() as AutoWeatherResult;
  } catch {
    return null;
  }
}
