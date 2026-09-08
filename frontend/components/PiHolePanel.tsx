"use client";

import { apiGet } from "../lib/api";
import type { PiholeStats } from "../lib/types";
import { usePolling } from "../lib/usePolling";


function formatNull(value: number | null, suffix = ""): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
}


export function PiHolePanel() {
  const { data, error, loading } = usePolling<PiholeStats>(
    (signal) => apiGet<PiholeStats>("/api/pihole", signal),
    30_000,
  );

  return (
    <section className="panel">
      <h2>Pi-hole</h2>
      {loading && !data ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {data ? (
        <div className="metric-grid">
          <div>
            <div className="label">Status</div>
            <div className="value">{data.status ?? "—"}</div>
          </div>
          <div>
            <div className="label">Queries today</div>
            <div className="value">{formatNull(data.queriesToday)}</div>
          </div>
          <div>
            <div className="label">Blocked</div>
            <div className="value">{formatNull(data.blockedToday)}</div>
            <div className="muted">{formatNull(data.blockedPercent, "%")}</div>
          </div>
          <div>
            <div className="label">Clients</div>
            <div className="value">{formatNull(data.uniqueClients)}</div>
            <div className="muted">
              Gravity: {formatNull(data.domainsBeingBlocked)}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
