"use client";

import { apiGet } from "../lib/api";
import type { SystemMetrics } from "../lib/types";
import { usePolling } from "../lib/usePolling";


function formatNull(value: number | null, suffix = ""): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
}


export function MetricPanel() {
  const { data, error, loading } = usePolling<SystemMetrics>(
    (signal) => apiGet<SystemMetrics>("/api/system", signal),
    5000,
  );

  return (
    <section className="panel">
      <h2>System</h2>
      {loading && !data ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {data ? (
        <div className="metric-grid">
          <div>
            <div className="label">CPU</div>
            <div className="value">{formatNull(data.cpuPercent, "%")}</div>
          </div>
          <div>
            <div className="label">RAM</div>
            <div className="value">{formatNull(data.ram.percent, "%")}</div>
            <div className="muted">
              {formatNull(data.ram.usedMb)} / {formatNull(data.ram.totalMb)} MB
            </div>
          </div>
          <div>
            <div className="label">Disk</div>
            <div className="value">{formatNull(data.disk.percent, "%")}</div>
            <div className="muted">
              {formatNull(data.disk.usedGb)} / {formatNull(data.disk.totalGb)} GB
            </div>
          </div>
          <div>
            <div className="label">GPU</div>
            <div className="value">
              {formatNull(data.gpu.utilizationPercent, "%")}
            </div>
            <div className="muted">
              {formatNull(data.gpu.memoryUsedMb)} /{" "}
              {formatNull(data.gpu.memoryTotalMb)} MB
              {data.gpu.temperatureC !== null
                ? ` · ${data.gpu.temperatureC}°C`
                : ""}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
