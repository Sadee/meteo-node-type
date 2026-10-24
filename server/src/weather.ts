// Current conditions from Open-Meteo (https://open-meteo.com): free, no API key needed.
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 5000;
const CURRENT_VARIABLES = ["temperature_2m", "relative_humidity_2m", "is_day", "precipitation", "rain", "snowfall"];

// A value with the unit Open-Meteo reported it in (from `current_units`); null when Open-Meteo left it out.
export type Reading = { value: number; unit: string } | null;

export type Weather = {
  temperature: Reading;
  humidity: Reading;
  precipitation: Reading;
  rain: Reading;
  snowfall: Reading;
  isDay: boolean | null;
};

export class WeatherUnavailableError extends Error {}

type Fields = Record<string, unknown>;

function reading(current: Fields, units: Fields, key: string): Reading {
  const value = current[key];
  if (typeof value !== "number") return null;
  const unit = units[key];
  return { value, unit: typeof unit === "string" ? unit : "" };
}

export async function fetchCurrentWeather(latitude: number, longitude: number): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: CURRENT_VARIABLES.join(","),
  });
  let res: Response;
  try {
    res = await fetch(`${OPEN_METEO_URL}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new WeatherUnavailableError(`Open-Meteo request failed: ${(err as Error).message}`);
  }
  if (!res.ok) throw new WeatherUnavailableError(`Open-Meteo responded ${res.status}`);

  const body = (await res.json().catch(() => null)) as { current?: Fields; current_units?: Fields } | null;
  const c = body?.current;
  if (!c || typeof c !== "object") throw new WeatherUnavailableError("Open-Meteo returned no current weather");
  const units = body.current_units ?? {};
  return {
    temperature: reading(c, units, "temperature_2m"),
    humidity: reading(c, units, "relative_humidity_2m"),
    precipitation: reading(c, units, "precipitation"),
    rain: reading(c, units, "rain"),
    snowfall: reading(c, units, "snowfall"),
    isDay: typeof c.is_day === "number" ? c.is_day === 1 : null,
  };
}
