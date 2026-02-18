import { NextRequest, NextResponse } from "next/server";

// ── WMO Weather Code → WeatherCondition ──────────────────────────────────────
function wmoToConditions(code: number): string[] {
  if (code === 0) return ["sunny"];
  if (code <= 2) return ["partly-cloudy"];
  if (code === 3) return ["overcast"];
  if (code === 45 || code === 48) return ["fog"];
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return ["rain"];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ["snow"];
  if ([95, 96, 99].includes(code)) return ["thunderstorm"];
  return ["cloudy"];
}

function groundCondition(precip: number, minTempC: number): string {
  if (precip > 0) return minTempC < 0 ? "frozen" : "wet";
  return minTempC < -10 ? "frozen" : "dry";
}

const DAILY_VARS =
  "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max";

/** Try the forecast API (covers today ± ~92 days with past_days param) */
async function fetchForecast(lat: string, lon: string, date: string) {
  const today = new Date().toISOString().slice(0, 10);
  const diffDays = Math.round(
    (new Date(today).getTime() - new Date(date).getTime()) / 86_400_000
  );

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set("daily", DAILY_VARS);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);
  // Allow historical data up to 92 days back via past_days
  if (diffDays > 0) url.searchParams.set("past_days", String(Math.min(diffDays + 1, 92)));

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return res.json();
}

/** Fall back to the archive API for dates older than 92 days */
async function fetchArchive(lat: string, lon: string, date: string) {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set("daily", DAILY_VARS);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return res.json();
}

async function geocode(query: string): Promise<{ lat: string; lon: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "NorskApp/1.0", "Accept-Language": "en" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data: { lat: string; lon: string }[] = await res.json();
    return data[0] ?? null;
  } catch {
    return null;
  }
}

// ── GET /api/weather?city=...&province=...&date=YYYY-MM-DD ───────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city     = searchParams.get("city")     ?? "";
  const province = searchParams.get("province") ?? "";
  const date     = searchParams.get("date")     ?? "";

  if (!city || !date) {
    return NextResponse.json(
      { error: "Missing required params: city, date" },
      { status: 400 }
    );
  }

  try {
    // ── 1. Geocode city + province ─────────────────────────────────────────
    const query = province ? `${city}, ${province}` : city;
    const coords = await geocode(query);

    if (!coords) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const { lat, lon } = coords;

    // ── 2. Fetch weather (forecast first, archive fallback) ─────────────────
    let wxData = await fetchForecast(lat, lon, date);

    // Check if response has expected data; if not, try archive
    const hasData = (d: unknown) => {
      if (!d || typeof d !== "object") return false;
      const daily = (d as Record<string, unknown>).daily;
      if (!daily || typeof daily !== "object") return false;
      const wc = (daily as Record<string, unknown[]>).weather_code;
      return Array.isArray(wc) && wc.length > 0 && wc[0] !== null;
    };

    if (!hasData(wxData)) {
      wxData = await fetchArchive(lat, lon, date);
    }

    if (!hasData(wxData)) {
      return NextResponse.json(
        { error: "No weather data available for this date" },
        { status: 404 }
      );
    }

    // ── 3. Parse ────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daily = (wxData as any).daily;
    const wmoCode: number = daily.weather_code[0];
    const tMaxC: number = daily.temperature_2m_max[0];
    const tMinC: number = daily.temperature_2m_min[0];
    const precip: number = daily.precipitation_sum[0] ?? 0;
    const windKph: number = daily.wind_speed_10m_max[0] ?? 0;

    const tMaxF = Math.round(tMaxC * 9 / 5 + 32);
    const tMinF = Math.round(tMinC * 9 / 5 + 32);

    const conditions = wmoToConditions(wmoCode);
    if (windKph > 30 && !conditions.includes("windy")) {
      conditions.push("windy");
    }

    return NextResponse.json({
      conditions,
      temperature: `${Math.round(tMinC)}°C – ${Math.round(tMaxC)}°C  (${tMinF}°F – ${tMaxF}°F)`,
      windSpeed: `${Math.round(windKph)} km/h`,
      precipitation: precip > 0 ? `${precip.toFixed(1)} mm` : "None",
      groundConditions: groundCondition(precip, tMinC),
    });
  } catch (err) {
    console.error("[/api/weather]", err);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
