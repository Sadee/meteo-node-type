import { useEffect, useState } from "react";
import { isUnauthorized } from "../../shared/api";
import { sitesApi } from "./api";
import { SiteWeather } from "./SiteWeather";
import { StatusBadge } from "./StatusBadge";
import type { Site, SiteManager } from "./types";
import "./sites.css";

type Props = { siteId: number; canEdit: boolean; onSignedOut: () => void };

export function SiteDetailPage({ siteId, canEdit, onSignedOut }: Props) {
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set while the manager picker is open: all assignable managers and the ids ticked so far.
  const [picker, setPicker] = useState<{ options: SiteManager[]; selected: Set<number> } | null>(null);
  const [busy, setBusy] = useState(false);

  function handleError(err: unknown) {
    if (isUnauthorized(err)) onSignedOut();
    else setError((err as Error).message);
  }

  useEffect(() => {
    sitesApi.get(siteId).then(setSite).catch(handleError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function remove() {
    if (!site || !window.confirm(`Delete "${site.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await sitesApi.remove(site.id);
      window.location.hash = "#/sites";
    } catch (err) {
      handleError(err);
      setBusy(false);
    }
  }

  async function openPicker() {
    if (!site) return;
    setError(null);
    try {
      const options = await sitesApi.managers();
      setPicker({ options, selected: new Set(site.managers.map((m) => m.id)) });
    } catch (err) {
      handleError(err);
    }
  }

  function toggle(id: number) {
    setPicker((p) => {
      if (!p) return p;
      const selected = new Set(p.selected);
      if (!selected.delete(id)) selected.add(id);
      return { ...p, selected };
    });
  }

  async function saveManagers() {
    if (!site || !picker) return;
    setBusy(true);
    setError(null);
    try {
      setSite(await sitesApi.setManagers(site.id, [...picker.selected]));
      setPicker(null);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!site) {
    return (
      <>
        <a href="#/sites" className="back">
          ← Sites
        </a>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </>
    );
  }

  const mapUrl = `https://www.openstreetmap.org/?mlat=${site.latitude}&mlon=${site.longitude}#map=12/${site.latitude}/${site.longitude}`;

  return (
    <>
      <a href="#/sites" className="back">
        ← Sites
      </a>
      <div className="page-head">
        <div>
          <h1>{site.name}</h1>
          <p className="muted">
            {site.city}, {site.country}
          </p>
        </div>
        {canEdit && (
          <div className="actions">
            <a href={`#/sites/${site.id}/edit`} className="button">
              Edit
            </a>
            <button className="danger" onClick={remove} disabled={busy}>
              Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <dl className="panel details">
        <dt>Status</dt>
        <dd>
          <StatusBadge status={site.status} />
        </dd>
        <dt>Description</dt>
        <dd>{site.description || <span className="muted">—</span>}</dd>
        <dt>Coordinates</dt>
        <dd>
          {site.latitude}, {site.longitude}{" "}
          <a href={mapUrl} target="_blank" rel="noreferrer">
            View on map ↗
          </a>
        </dd>
      </dl>

      <div className="page-head section-title">
        <h2>Temperature</h2>
      </div>
      <SiteWeather key={site.id} siteId={site.id} onSignedOut={onSignedOut} />

      <div className="page-head section-title">
        <h2>Managers</h2>
        {canEdit && !picker && <button onClick={openPicker}>Assign managers</button>}
      </div>

      {picker ? (
        <div className="panel">
          {picker.options.length === 0 ? (
            <p className="muted">No managers yet. Create them on the Managers page first.</p>
          ) : (
            <fieldset className="picker">
              <legend className="hint">Tick the managers responsible for this site.</legend>
              {picker.options.map((m) => (
                <label key={m.id}>
                  <input type="checkbox" checked={picker.selected.has(m.id)} onChange={() => toggle(m.id)} />
                  {m.name} <span className="muted">{m.email}</span>
                </label>
              ))}
            </fieldset>
          )}
          <div className="actions">
            <button className="primary" onClick={saveManagers} disabled={busy}>
              {busy ? "Saving…" : "Save managers"}
            </button>
            <button onClick={() => setPicker(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <ul className="panel managers">
          {site.managers.map((m) => (
            <li key={m.id}>
              {m.name} <span className="muted">{m.email}</span>
            </li>
          ))}
          {site.managers.length === 0 && <li className="muted">No managers assigned.</li>}
        </ul>
      )}
    </>
  );
}
