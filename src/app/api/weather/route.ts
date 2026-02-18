import { NextRequest, NextResponse } from "next/server";

// ── WMO Weather Code → WeatherCondition ──────────────────────────────────────
// https://open-meteo.com/en/docs#weathervariables
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

// ── GET /api/weather?address=...&date=YYYY-MM-DD ──────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const date = searchParams.get("date");

  if (!address || !date) {
    return NextResponse.json(
      { error: "Missing required params: address, date" },
      { status: 400 }
    );
  }

  try {
    // ── 1. Geocode the address using Nominatim ──────────────────────────────
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "NorskApp/1.0",
          "Accept-Language": "en",
        },
        // 5-second timeout via AbortSignal
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!geoRes.ok) {
      return NextResponse.json(
        { error: "Geocoding service unavailable" },
        { status: 503 }
      );
    }

    const geoData: { lat: string; lon: string }[] = await geoRes.json();
    if (!geoData.length) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    const { lat, lon } = geoData[0];

    // ── 2. Fetch daily weather from Open-Meteo ──────────────────────────────
    const wxUrl = new URL("https://api.open-meteo.com/v1/forecast");
    wxUrl.searchParams.set("latitude", lat);
    wxUrl.searchParams.set("longitude", lon);
    wxUrl.searchParams.set(
      "daily",
      "weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max"
    );
    wxUrl.searchParams.set("timezone", "auto");
    wxUrl.searchParams.set("start_date", date);
    wxUrl.searchParams.set("end_date", date);

    const wxRes = await fetch(wxUrl.toString(), {
      signal: AbortSignal.timeout(5000),
    });

    if (!wxRes.ok) {
      return NextResponse.json(
        { error: "Weather service unavailable" },
        { status: 503 }
      );
    }

    const wxData = await wxRes.json();

    if (!wxData?.daily?.weathercode?.length) {
      return NextResponse.json(
        { error: "No weather data returned for this date" },
        { status: 404 }
      );
    }

    // ── 3. Parse the response ───────────────────────────────────────────────
    const wmoCode: number = wxData.daily.weathercode[0];
    const tMaxC: number = wxData.daily.temperature_2m_max[0];
    const tMinC: number = wxData.daily.temperature_2m_min[0];
    const precip: number = wxData.daily.precipitation_sum[0] ?? 0;
    const windKph: number = wxData.daily.windspeed_10m_max[0] ?? 0;

    const tMaxF = Math.round(tMaxC * 9 / 5 + 32);
    const tMinF = Math.round(tMinC * 9 / 5 + 32);

    const conditions = wmoToConditions(wmoCode);
    // Mark windy if sustained wind > 30 km/h and not already classified as such
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
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
