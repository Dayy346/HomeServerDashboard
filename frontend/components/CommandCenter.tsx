"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ActivityIcon, ChartLineUp, Clock, Copy, Cube, Database, DownloadSimple,
  Lightning, List, Monitor, Network, SquaresFour, Terminal, X,
} from "@phosphor-icons/react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiGet } from "../lib/api";
import type { AppTile, Container, DownloadsResponse, HostOverview, PiholeStats, SystemMetrics } from "../lib/types";
import { usePolling } from "../lib/usePolling";
import { UpdateButton } from "./UpdateButton";

type ContainersResponse = { containers: Container[] };
type AppsResponse = { apps: AppTile[] };
type LogsResponse = { name: string; logs: string };
type HistoryPoint = { time: string; gpu: number | null; vram: number | null; temperature: number | null; cpu: number | null; ram: number | null };
type NetworkPoint = { time: string; down: number | null; up: number | null };

function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  let size = value;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size.toFixed(index < 2 ? 0 : 1)} ${units[index]}`;
}

function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function value(value: number | null | undefined, suffix = ""): string {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${value}${suffix}`;
}

function TelemetryChart({ data, label, dataKey, unit, color }: { data: HistoryPoint[]; label: string; dataKey: "gpu" | "vram" | "temperature" | "cpu" | "ram"; unit: string; color: string }) {
  const height = dataKey === "cpu" || dataKey === "ram" ? 74 : dataKey === "temperature" ? 62 : 78;
  const percentageMetric = dataKey === "gpu" || dataKey === "cpu" || dataKey === "ram";
  return (
    <div className="telemetry-chart">
      <div className="chart-heading"><span>{label}</span><strong style={{ color }}>{data.at(-1)?.[dataKey] ?? "—"}{unit}</strong></div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 2, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="#202933" strokeDasharray="2 3" vertical={false} />
          <XAxis dataKey="time" minTickGap={44} tick={{ fill: "#6d7885", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis width={30} domain={percentageMetric ? [0, 100] : ["auto", "auto"]} tick={{ fill: "#6d7885", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#11171d", border: "1px solid #29333e", borderRadius: 6 }} labelStyle={{ color: "#cfd6df" }} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.25} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function NetworkChart({ data }: { data: NetworkPoint[] }) {
  return (
    <div className="network-chart">
      <ResponsiveContainer width="100%" height={92}>
        <LineChart data={data} margin={{ top: 8, right: 2, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="#202933" strokeDasharray="2 3" vertical={false} />
          <XAxis dataKey="time" minTickGap={42} tick={{ fill: "#6d7885", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis width={30} tick={{ fill: "#6d7885", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(entry) => formatBytes(Number(entry))} />
          <Tooltip contentStyle={{ background: "#11171d", border: "1px solid #29333e", borderRadius: 6 }} labelStyle={{ color: "#cfd6df" }} formatter={(entry) => formatBytes(Number(entry))} />
          <Line type="monotone" name="Download" dataKey="down" stroke="#a3e635" strokeWidth={2.25} dot={false} isAnimationActive={false} />
          <Line type="monotone" name="Upload" dataKey="up" stroke="#f472b6" strokeWidth={1.6} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <span className="chart-legend"><i /> Download <i /> Upload</span>
    </div>
  );
}

function NavItem({ icon: Icon, label, target }: { icon: typeof SquaresFour; label: string; target: string }) {
  return <button className="nav-item" onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" })}><Icon size={20} weight="duotone" /><span>{label}</span></button>;
}

export function CommandCenter() {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [networkHistory, setNetworkHistory] = useState<NetworkPoint[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState<Container | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: system, error: systemError } = usePolling<SystemMetrics>(
    (signal) => apiGet<SystemMetrics>("/api/system", signal),
    2_000,
    (next) => {
      const now = new Date();
      const point: HistoryPoint = { time: now.toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }), gpu: next.gpu.utilizationPercent, vram: next.gpu.memoryUsedMb, temperature: next.gpu.temperatureC, cpu: next.cpuPercent, ram: next.ram.percent };
      setHistory((current) => [...current.slice(-44), point]);
    },
  );
  const { data: host } = usePolling<HostOverview>(
    (signal) => apiGet<HostOverview>("/api/host", signal),
    8_000,
    (next) => {
      const now = new Date();
      setNetworkHistory((current) => [...current.slice(-44), { time: now.toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }), down: next.network.receivedBytesPerSecond, up: next.network.sentBytesPerSecond }]);
    },
  );
  const { data: containerData, error: containersError } = usePolling<ContainersResponse>((signal) => apiGet<ContainersResponse>("/api/containers", signal), 4_000);
  const { data: pihole } = usePolling<PiholeStats>((signal) => apiGet<PiholeStats>("/api/pihole", signal), 30_000);
  const { data: downloads } = usePolling<DownloadsResponse>((signal) => apiGet<DownloadsResponse>("/api/downloads", signal), 15_000);
  const { data: apps } = usePolling<AppsResponse>((signal) => apiGet<AppsResponse>("/api/apps", signal), 60_000);
  const containers = useMemo(() => containerData?.containers ?? [], [containerData]);
  const activeName = selectedContainer ?? containers.find((container) => container.state === "running")?.name ?? null;
  const { data: logsData, error: logsError } = usePolling<LogsResponse>(
    (signal) => activeName ? apiGet<LogsResponse>(`/api/containers/${encodeURIComponent(activeName)}/logs?tail=180`, signal) : Promise.resolve({ name: "", logs: "No container selected." }),
    2_500,
  );

  const running = useMemo(() => containers.filter((container) => container.state === "running"), [containers]);
  const selected = containers.find((container) => container.name === activeName) ?? null;
  const metricsFreshness = history.at(-1)?.time ?? "Connecting";

  async function copyCommand(container: Container) {
    setShowTerminal(container);
    try { await navigator.clipboard.writeText(container.terminalCommand); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <main className="command-center">
      <aside className="sidebar">
        <div className="mark"><Image src="/homelab-mark-v2.png" alt="Dayyan's HomeLab" width={72} height={72} priority /></div>
        <nav aria-label="Dashboard navigation">
          <NavItem icon={SquaresFour} label="Now" target="now" />
          <NavItem icon={Cube} label="Containers" target="containers" />
          <NavItem icon={Lightning} label="AI / Inference" target="gpu" />
          <NavItem icon={Database} label="Storage" target="storage" />
          <NavItem icon={Network} label="Network" target="host-status" />
          <NavItem icon={DownloadSimple} label="Downloads" target="operations" />
        </nav>
        <div className="sidebar-foot"><span className="status-dot" /> <span>Host online</span><small>{host?.hostname ?? "homelab"}</small></div>
      </aside>

      <section className="workspace" id="now">
        <header className="topbar">
          <div><h1>Dayyan&apos;s HomeLab</h1><p>AI workloads <span>•</span> containers <span>•</span> observe <span>•</span> control</p></div>
          <div className="top-status"><span className="status-dot" /> <span>All systems operational</span><span className="top-separator" /> <span>Updated {metricsFreshness}</span></div>
        </header>

        <section className="status-strip" id="host-status">
          <div className="status-stat"><Clock size={23} weight="light" /><div><span>Uptime</span><strong>{duration(host?.uptimeSeconds)}</strong><small>{host?.hostname ?? "Host"}</small></div></div>
          <div className="status-stat"><Network size={23} weight="light" /><div><span>Network</span><strong>↓ {formatBytes(host?.network.receivedBytesPerSecond)}/s <em>↑ {formatBytes(host?.network.sentBytesPerSecond)}/s</em></strong><small>Live host traffic</small></div></div>
          <div className="status-stat" id="storage"><Database size={23} weight="light" /><div><span>Storage</span><strong>{host?.storage[0] ? `${formatBytes(host.storage[0].usedBytes)} / ${formatBytes(host.storage[0].totalBytes)}` : "—"}</strong><small>{host?.storage[0]?.mount ?? "No mount data"}</small></div></div>
          <div className="status-stat"><ActivityIcon size={23} weight="light" /><div><span>System load</span><strong>CPU {value(system?.cpuPercent, "%")} <em>RAM {value(system?.ram.percent, "%")}</em></strong><small>{host?.loadAverage[0]?.toFixed(2) ?? "—"} load average</small></div></div>
        </section>

        <div className="dashboard-grid">
          <section className="gpu-panel" id="gpu">
            <div className="panel-title"><div><h2>NVIDIA GPU</h2><span>Live telemetry</span></div><div className="gpu-meta">{system?.source === "netdata" ? "Netdata + NVIDIA SMI" : "Connecting"}</div></div>
            {systemError ? <p className="panel-error">GPU telemetry unavailable: {systemError}</p> : null}
            <TelemetryChart data={history} label="GPU utilization" dataKey="gpu" unit="%" color="#a78bfa" />
            <TelemetryChart data={history} label="VRAM usage" dataKey="vram" unit=" MB" color="#2dd4bf" />
            <TelemetryChart data={history} label="GPU temperature" dataKey="temperature" unit=" °C" color="#fb923c" />
            <div className="gpu-details">
              <div><span>GPU temperature</span><strong>{value(system?.gpu.temperatureC, " °C")}</strong></div>
              <div><span>GPU power</span><strong>{value(system?.gpu.powerWatts, " W")}</strong></div>
              <div><span>Core clock</span><strong>{value(system?.gpu.coreClockMhz, " MHz")}</strong></div>
              <div><span>Memory clock</span><strong>{value(system?.gpu.memoryClockMhz, " MHz")}</strong></div>
            </div>
          </section>

          <section className="fleet-panel" id="containers">
            <div className="panel-title"><div><h2>Container fleet</h2><span>{running.length} / {containers.length} running</span></div><Cube size={23} weight="light" /></div>
            {containersError ? <p className="panel-error">Docker unavailable: {containersError}</p> : null}
            <div className="container-table" role="table">
              <div className="container-head" role="row"><span>Status</span><span>Name</span><span>CPU</span><span>RAM</span><span>Actions</span></div>
              {containers.map((container) => <div className={`container-row ${activeName === container.name ? "selected" : ""}`} key={container.id} role="row">
                <button className="container-name" onClick={() => setSelectedContainer(container.name)}><i className={container.state === "running" ? "status-dot" : "status-off"} /><span>{container.name}<small>{container.image}</small></span></button>
                <span>{value(container.cpuPercent, "%")}</span><span>{formatBytes(container.memoryUsageBytes)}</span>
                <div className="row-actions"><button aria-label={`View ${container.name} logs`} onClick={() => setSelectedContainer(container.name)}><List size={16} />Logs</button><button aria-label={`Open ${container.name} terminal command`} onClick={() => void copyCommand(container)}><Terminal size={16} />Terminal</button></div>
              </div>)}
              {!containers.length && !containersError ? <p className="empty-state">Reading Docker containers…</p> : null}
            </div>
          </section>

          <section className="cpu-panel"><TelemetryChart data={history} label="CPU utilization" dataKey="cpu" unit="%" color="#facc15" /><TelemetryChart data={history} label="RAM utilization" dataKey="ram" unit="%" color="#60a5fa" /><div className="cpu-extra"><span>RAM</span><strong>{formatBytes(system?.ram.usedMb ? system.ram.usedMb * 1024 * 1024 : null)} / {formatBytes(system?.ram.totalMb ? system.ram.totalMb * 1024 * 1024 : null)}</strong><span>{value(system?.ram.percent, "%")}</span></div></section>
          <section className="services-panel"><div className="panel-title"><div><h2>Service health</h2><span>{running.length} healthy containers</span></div><ChartLineUp size={22} weight="light" /></div><div className="service-list">{containers.slice(0, 5).map((container) => <button key={container.id} onClick={() => setSelectedContainer(container.name)}><span><i className={container.state === "running" ? "status-dot" : "status-off"} />{container.name}</span><small>{container.state}</small></button>)}</div></section>
        </div>

        <section className="log-panel" aria-live="polite">
          <div className="log-toolbar"><div><h2>Live container log</h2><span>{selected?.name ?? "Select a container"}</span></div><div><button className="quiet-button" onClick={() => activeName && setSelectedContainer(activeName)}><Monitor size={16} />Live</button><button className="quiet-button" onClick={() => selected && void copyCommand(selected)} disabled={!selected}><Terminal size={16} />Terminal</button></div></div>
          {logsError ? <p className="panel-error">Log stream unavailable: {logsError}</p> : <pre className="log-output">{logsData?.logs || "Waiting for container output…"}</pre>}
        </section>

        <section className="operations-grid" id="operations">
          <article className="operation-card"><div className="panel-title"><div><h2>Pi-hole</h2><span>DNS protection</span></div><i className="status-dot" /></div><strong className="operation-number">{pihole?.blockedPercent === null || pihole?.blockedPercent === undefined ? "—" : `${pihole.blockedPercent}%`}</strong><p>Blocked today: {pihole?.blockedToday?.toLocaleString() ?? "—"} · {pihole?.uniqueClients ?? "—"} clients</p></article>
          <article className="operation-card"><div className="panel-title"><div><h2>Active downloads</h2><span>{downloads?.items.length ?? 0} in progress</span></div><DownloadSimple size={21} weight="light" /></div>{downloads?.items.length ? <ul className="mini-list">{downloads.items.slice(0, 3).map((item) => <li key={item.id}><span>{item.name}</span><strong>{item.progress}%</strong></li>)}</ul> : <p>No active downloads.</p>}</article>
          <article className="operation-card mounts-card"><div className="panel-title"><div><h2>Storage mounts</h2><span>{host?.storage.length ?? 0} detected</span></div><Database size={21} weight="light" /></div>{host?.storage.length ? <ul className="mini-list">{host.storage.slice(0, 3).map((mount) => <li key={mount.mount}><span>{mount.mount} · {formatBytes(mount.usedBytes)} / {formatBytes(mount.totalBytes)}</span><strong>{mount.percent}%</strong></li>)}</ul> : <p>Mount details appear when the dashboard runs on Linux.</p>}</article>
          <article className="operation-card network-card"><div className="panel-title"><div><h2>Network trend</h2><span>Live host traffic</span></div><Network size={21} weight="light" /></div><NetworkChart data={networkHistory} /></article>
          <article className="operation-card"><div className="panel-title"><div><h2>Quick links</h2><span>{apps?.apps.length ?? 0} services</span></div><Monitor size={21} weight="light" /></div><div className="quick-links">{apps?.apps.slice(0, 5).map((app) => <a key={app.id} href={app.url} target="_blank" rel="noreferrer">{app.name}</a>)}{!apps?.apps.length ? <p>Set APP_*_URL values to add links.</p> : null}</div></article>
          <UpdateButton />
        </section>
      </section>

      {showTerminal ? <div className="terminal-modal" role="presentation"><div className="terminal-dialog" role="dialog" aria-modal="true" aria-labelledby="terminal-title"><button className="dialog-close" onClick={() => setShowTerminal(null)} aria-label="Close terminal instructions"><X size={20} /></button><Terminal size={26} weight="light" /><h2 id="terminal-title">Open {showTerminal.name}</h2><p>A browser cannot safely host a privileged Docker shell. This command has been copied so you can paste it into your server terminal.</p><code>{showTerminal.terminalCommand}</code><div><button onClick={() => void copyCommand(showTerminal)}><Copy size={17} />{copied ? "Copied" : "Copy command"}</button><button className="quiet-button" onClick={() => setShowTerminal(null)}>Close</button></div></div></div> : null}
    </main>
  );
}
