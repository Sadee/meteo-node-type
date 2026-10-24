// Current conditions from Open-Meteo (https://open-meteo.com): free, no API key needed.
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 5000;

export type Weather = {
  temperature: number; // °C
};

export class WeatherUnavailableError extends Error {}

export async function fetchCurrentWeather(latitude: number, longitude: number): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m",
  });
  let res: Response;
  try {
    res = await fetch(`${OPEN_METEO_URL}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new WeatherUnavailableError(`Open-Meteo request failed: ${(err as Error).message}`);
  }
  if (!res.ok) throw new WeatherUnavailableError(`Open-Meteo responded ${res.status}`);

  const c = ((await res.json().catch(() => null)) as { current?: Record<string, unknown> } | null)?.current;
  if (!c || typeof c.temperature_2m !== "number") {
    throw new WeatherUnavailableError("Open-Meteo returned no current weather");
  }
  return { temperature: c.temperature_2m };
}
