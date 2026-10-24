import { FormEvent, useEffect, useState } from "react";
import { isUnauthorized } from "../../shared/api";
import { sitesApi } from "./api";
import { SITE_STATUSES, type SiteStatus } from "./types";
import "./sites.css";

// Number inputs are kept as text while editing so they can be empty or half-typed ("-").
type Fields = {
  name: string;
  description: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  status: SiteStatus;
};

const EMPTY: Fields = {
  name: "",
  description: "",
  city: "",
  country: "",
  latitude: "",
  longitude: "",
  status: "planned",
};

// Blank becomes NaN (sent as null) so the API rejects it instead of reading it as 0.
const toNumber = (value: string) => (value.trim() === "" ? NaN : Number(value));

type Props = { siteId?: number; onSignedOut: () => void };

// Create a site, or edit one when siteId is given. Directors only.
export function SiteFormPage({ siteId, onSignedOut }: Props) {
  const editing = siteId !== undefined;
  const [fields, setFields] = useState<Fields | null>(editing ? null : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleError(err: unknown) {
    if (isUnauthorized(err)) onSignedOut();
    else setError((err as Error).message);
  }

  useEffect(() => {
    if (siteId === undefined) return;
    sitesApi
      .get(siteId)
      .then((s) => setFields({ ...s, latitude: String(s.latitude), longitude: String(s.longitude) }))
      .catch(handleError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!fields) return;
    setSubmitting(true);
    setError(null);
    const body = { ...fields, latitude: toNumber(fields.latitude), longitude: toNumber(fields.longitude) };
    try {
      const site = editing ? await sitesApi.update(siteId, body) : await sitesApi.create(body);
      window.location.hash = `#/sites/${site.id}`;
    } catch (err) {
      handleError(err);
      setSubmitting(false);
    }
  }

  const cancelHref = editing ? `#/sites/${siteId}` : "#/sites";

  return (
    <>
      <a href={cancelHref} className="back">
        ← {editing ? "Site" : "Sites"}
      </a>
      <h1>{editing ? "Edit site" : "New site"}</h1>
      <p className="muted">Coordinates are decimal degrees, e.g. 48.7758, 9.1829.</p>

      {!fields && error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {fields && (
        <form className="panel form" onSubmit={submit}>
          <label>
            Name
            <input value={fields.name} onChange={(e) => set("name", e.target.value)} required />
          </label>
          <label>
            Description
            <textarea value={fields.description} onChange={(e) => set("description", e.target.value)} rows={3} />
          </label>
          <div className="row">
            <label>
              City
              <input value={fields.city} onChange={(e) => set("city", e.target.value)} required />
            </label>
            <label>
              Country
              <input value={fields.country} onChange={(e) => set("country", e.target.value)} required />
            </label>
          </div>
          <div className="row">
            <label>
              Latitude
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                value={fields.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                required
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                value={fields.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                required
              />
            </label>
          </div>
          <label>
            Status
            <select value={fields.status} onChange={(e) => set("status", e.target.value as SiteStatus)}>
              {SITE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Create site"}
            </button>
            <a href={cancelHref} className="button">
              Cancel
            </a>
          </div>
        </form>
      )}
    </>
  );
}
