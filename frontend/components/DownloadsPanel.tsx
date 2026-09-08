"use client";

import { apiGet } from "../lib/api";
import type { DownloadsResponse } from "../lib/types";
import { usePolling } from "../lib/usePolling";


function formatBytes(value: number | null): string {
  if (value === null) return "—";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value;
  let unit = -1;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}


function formatSpeed(bps: number | null): string {
  if (bps === null) return "—";
  return `${formatBytes(bps)}/s`;
}


function formatEta(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}


export function DownloadsPanel() {
  const { data, error, loading } = usePolling<DownloadsResponse>(
    (signal) => apiGet<DownloadsResponse>("/api/downloads", signal),
    15_000,
  );

  return (
    <section className="panel">
      <h2>Active downloads</h2>
      {loading && !data ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {data?.errors?.length ? (
        <p className="muted">Partial errors: {data.errors.join(" · ")}</p>
      ) : null}
      {data && data.items.length === 0 ? (
        <p className="muted">No active downloads</p>
      ) : null}
      {data && data.items.length > 0 ? (
        <ul className="download-list">
          {data.items.map((item) => (
            <li key={item.id}>
              <div className="download-head">
                <strong>{item.name}</strong>
                <span className="badge">{item.source}</span>
              </div>
              <div className="muted">
                {item.progress}% · {item.state} · ↓ {formatSpeed(item.downloadSpeedBps)} ·
                ETA {formatEta(item.etaSeconds)} · {formatBytes(item.downloadedBytes)} /{" "}
                {formatBytes(item.sizeBytes)}
              </div>
              <div className="progress">
                <div style={{ width: `${Math.min(100, item.progress)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
