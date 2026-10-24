import { useEffect, useState } from "react";
import { isUnauthorized } from "../../shared/api";
import { sitesApi } from "./api";
import { StatusBadge } from "./StatusBadge";
import { SITE_STATUSES, type Site, type SiteStatus } from "./types";
import "./sites.css";

type Props = { canEdit: boolean; onSignedOut: () => void };

export function SitesPage({ canEdit, onSignedOut }: Props) {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SiteStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sitesApi
      .list()
      .then(setSites)
      .catch((err) => (isUnauthorized(err) ? onSignedOut() : setError((err as Error).message)));
    // Load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = search.trim().toLowerCase();
  const shown = (sites ?? []).filter(
    (s) =>
      (!status || s.status === status) &&
      (!query || [s.name, s.city, s.country].some((field) => field.toLowerCase().includes(query))),
  );

  return (
    <>
      <a href="#/" className="back">
        ← Dashboard
      </a>
      <div className="page-head">
        <div>
          <h1>Sites</h1>
          <p className="muted">{canEdit ? "All manufacturing sites." : "The sites you manage."}</p>
        </div>
        {canEdit && (
          <a href="#/sites/new" className="button primary">
            New site
          </a>
        )}
      </div>

      <div className="filters">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, city or country"
          aria-label="Search sites"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as SiteStatus | "")} aria-label="Status">
          <option value="">All statuses</option>
          {SITE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Status</th>
              <th>Managers</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.id}>
                <td>
                  <a href={`#/sites/${s.id}`}>{s.name}</a>
                </td>
                <td>
                  {s.city}, {s.country}
                </td>
                <td>
                  <StatusBadge status={s.status} />
                </td>
                <td>
                  {s.managers.length ? s.managers.map((m) => m.name).join(", ") : <span className="muted">—</span>}
                </td>
              </tr>
            ))}
            {sites && shown.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  {sites.length === 0 ? "No sites yet." : "No sites match the filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
