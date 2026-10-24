import { useEffect, useState } from "react";
import { isUnauthorized } from "../../shared/api";
import { sitesApi } from "./api";
import type { Reading, Weather } from "./types";

type Props = { siteId: number; onSignedOut: () => void };

// Units as Open-Meteo reports them; "°C" and "%" sit right after the number, others ("mm", "cm") after a space.
function format(reading: Reading, round = false) {
  if (!reading) return "—";
  const value = round ? Math.round(reading.value) : reading.value;
  const { unit } = reading;
  return unit === "" || unit === "%" || unit.startsWith("°") ? `${value}${unit}` : `${value} ${unit}`;
}

// Current weather at a site. A failure only affects this panel, not the rest of the page.
export function SiteWeather({ siteId, onSignedOut }: Props) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    sitesApi
      .weather(siteId)
      .then(setWeather)
      .catch((err) => {
        if (isUnauthorized(err)) onSignedOut();
        else setFailed(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  return (
    <section className="panel weather" aria-label="Current weather">
      {weather ? (
        <>
          <div className="now">
            <p className="temperature">{format(weather.temperature, true)}</p>
            {weather.isDay !== null && <p className="daylight">{weather.isDay ? "Day" : "Night"}</p>}
          </div>
          <dl className="conditions">
            <dt>Humidity</dt>
            <dd>{format(weather.humidity)}</dd>
            <dt>Precipitation</dt>
            <dd>{format(weather.precipitation)}</dd>
            <dt>Rain</dt>
            <dd>{format(weather.rain)}</dd>
            <dt>Snowfall</dt>
            <dd>{format(weather.snowfall)}</dd>
          </dl>
          <p className="hint">
            Data by{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
          </p>
        </>
      ) : (
        <p className="muted">{failed ? "Weather is unavailable right now." : "Loading weather…"}</p>
      )}
    </section>
  );
}
