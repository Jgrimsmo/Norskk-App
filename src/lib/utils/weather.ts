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
 * Calls the server-side /api/weather endpoint, which geocodes the address and
 * returns daily weather from Open-Meteo. Returns null on any error so callers
 * can fail silently.
 *
 * @param address  Full street address of the project.
 * @param date     ISO date string (YYYY-MM-DD) for the report date.
 */
export async function fetchWeatherForAddress(
  address: string,
  date: string
): Promise<AutoWeatherResult | null> {
  try {
    const res = await fetch(
      `/api/weather?address=${encodeURIComponent(address)}&date=${encodeURIComponent(date)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data as AutoWeatherResult;
  } catch {
    return null;
  }
}
