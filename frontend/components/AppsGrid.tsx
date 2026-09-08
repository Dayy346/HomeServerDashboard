"use client";

import { apiGet } from "../lib/api";
import type { AppTile } from "../lib/types";
import { usePolling } from "../lib/usePolling";


type AppsResponse = { apps: AppTile[] };


export function AppsGrid() {
  const { data, error, loading } = usePolling<AppsResponse>(
    (signal) => apiGet<AppsResponse>("/api/apps", signal),
    60_000,
  );

  return (
    <section className="panel">
      <h2>Apps</h2>
      {loading && !data ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {data && data.apps.length === 0 ? (
        <p className="muted">Set APP_*_URL values in .env to show tiles</p>
      ) : null}
      {data ? (
        <div className="apps-grid">
          {data.apps.map((app) => (
            <a
              key={app.id}
              className="app-tile"
              href={app.url}
              target="_blank"
              rel="noreferrer"
            >
              {app.name}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}
