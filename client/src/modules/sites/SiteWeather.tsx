import { useEffect, useState } from "react";
import { isUnauthorized } from "../../shared/api";
import { sitesApi } from "./api";
import type { Weather } from "./types";

type Props = { siteId: number; onSignedOut: () => void };

// Current temperature at a site. A failure only affects this panel, not the rest of the page.
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
    <section className="panel weather" aria-label="Current temperature">
      {weather ? (
        <>
          <p className="temperature">{Math.round(weather.temperature)}°C</p>
          <p className="hint">
            Data by{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
          </p>
        </>
      ) : (
        <p className="muted">{failed ? "Temperature is unavailable right now." : "Loading temperature…"}</p>
      )}
    </section>
  );
}
