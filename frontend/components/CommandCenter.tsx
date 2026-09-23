"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ThinkingOrb } from "thinking-orbs";
import {
  ActivityIcon, ChartLineUp, Clock, Copy, Cube, Database, DownloadSimple,
  CaretDown, HardDrives, Lightning, List, Monitor, Network, SquaresFour, Terminal, WarningCircle, X,
} from "@phosphor-icons/react";
import { CartesianGrid, Line, LineChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiGet } from "../lib/api";
import type { AppTile, Container, DiagnosticsReport, DownloadsResponse, HostOverview, PiholeStats, ProcessConsumers, SystemMetrics } from "../lib/types";
import { usePolling } from "../lib/usePolling";
import { UpdateButton } from "./UpdateButton";
import { InferenceLab } from "./InferenceLab";

type ContainersResponse = { containers: Container[] };
type AppsResponse = { apps: AppTile[] };
type LogsResponse = { name: string; logs: string };
type DownloadLogsResponse = { logs: string };
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

function easternDateTime(value: string | undefined): string {
  if (!value) return "Calculating start time…";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(value));
}

const iconNames: Record<string, string> = { files: "files", "actual-budget": "actual-budget", ollama: "ollama", searxng: "searxng", sonarr: "sonarr", dozzle: "dozzle", "open-webui": "open-webui", pihole: "pi-hole", plex: "plex", immich: "immich", radarr: "radarr", qbittorrent: "qbittorrent", netdata: "netdata", syncthing: "syncthing", turbodiffusion: "turbodiffusion", casaos: "casaos" };

function appIconUrl(id: string): string {
  return `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/${iconNames[id] ?? id}.svg`;
}

const subscribeToHydration = () => () => {};

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

function UsageGauge({ label, percent, detail, tone, expanded, onToggle, processes }: { label: string; percent: number | null | undefined; detail: string; tone: "cpu" | "ram"; expanded: boolean; onToggle: () => void; processes: ProcessConsumers | undefined }) {
  const safePercent = Math.min(100, Math.max(0, percent ?? 0));
  const color = tone === "cpu"
    ? safePercent > 80 ? "#fb7185" : safePercent > 55 ? "#fbbf24" : "#a78bfa"
    : safePercent > 85 ? "#fb7185" : safePercent > 65 ? "#fb923c" : "#38bdf8";

  return (
    <section className={`usage-gauge ${tone} ${expanded ? "expanded" : ""}`}>
      <div className="gauge-visual" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="73%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={[{ value: safePercent, fill: color }]} barSize={12}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar dataKey="value" background={{ fill: "#222b35" }} cornerRadius={8} isAnimationActive={false} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <button className="gauge-copy" type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={`${tone}-consumers`}><span>{label}</span><strong>{percent === null || percent === undefined ? "—" : `${Math.round(percent)}%`}</strong><small>{detail} <CaretDown size={12} weight="bold" /></small></button>
      {expanded ? <div className="consumer-breakdown" id={`${tone}-consumers`}><span>Top {tone === "cpu" ? "CPU" : "memory"} consumers</span>{processes?.[tone === "cpu" ? "cpu" : "memory"]?.length ? <ol>{processes[tone === "cpu" ? "cpu" : "memory"].map((process) => <li key={`${tone}-${process.pid}`}><span title={`${process.name} (PID ${process.pid})`}>{process.name}<small>PID {process.pid}</small></span><strong>{tone === "cpu" ? `${process.cpuPercent.toFixed(1)}%` : `${process.memoryMb.toFixed(0)} MB`}</strong></li>)}</ol> : <p>Reading live processes…</p>}</div> : null}
    </section>
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
  const [showAllContainers, setShowAllContainers] = useState(false);
  const [showDownloadLogs, setShowDownloadLogs] = useState(false);
  const [logModal, setLogModal] = useState<Container | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedGauges, setExpandedGauges] = useState<Record<"cpu" | "ram", boolean>>({ cpu: false, ram: false });
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
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
  const { data: processes } = usePolling<ProcessConsumers>((signal) => apiGet<ProcessConsumers>("/api/processes", signal), expandedGauges.cpu || expandedGauges.ram ? 4_000 : 60_000);
  const { data: downloads } = usePolling<DownloadsResponse>((signal) => apiGet<DownloadsResponse>("/api/downloads", signal), 15_000);
  const { data: apps } = usePolling<AppsResponse>((signal) => apiGet<AppsResponse>("/api/apps", signal), 60_000);
  const { data: diagnostics } = usePolling<DiagnosticsReport>((signal) => apiGet<DiagnosticsReport>("/api/diagnostics", signal), 60_000);
  const { data: downloadLogs } = usePolling<DownloadLogsResponse>(
    (signal) => showDownloadLogs ? apiGet<DownloadLogsResponse>("/api/downloads/logs", signal) : Promise.resolve({ logs: "Open this while a download runs to watch qBittorrent activity." }),
    5_000,
  );
  const containers = useMemo(() => containerData?.containers ?? [], [containerData]);
  const visibleContainers = showAllContainers ? containers : containers.slice(0, 6);
  const attentionContainers = containers.filter((container) => container.state !== "running");
  const activeName = selectedContainer ?? containers.find((container) => container.state === "running")?.name ?? null;
  const { data: logsData, error: logsError } = usePolling<LogsResponse>(
    (signal) => activeName ? apiGet<LogsResponse>(`/api/containers/${encodeURIComponent(activeName)}/logs?tail=180`, signal) : Promise.resolve({ name: "", logs: "No container selected." }),
    2_500,
  );
  const { data: modalLogs, error: modalLogsError } = usePolling<LogsResponse>(
    (signal) => logModal ? apiGet<LogsResponse>(`/api/containers/${encodeURIComponent(logModal.name)}/logs?tail=280`, signal) : Promise.resolve({ name: "", logs: "" }),
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
          <NavItem icon={WarningCircle} label="Diagnostics" target="diagnostics" />
          <NavItem icon={Lightning} label="AI Lab" target="ai-inference" />
        </nav>
        <div className="sidebar-foot"><span className="connection-mark" aria-hidden="true" /> <span>Live connection</span><small>{host?.hostname ?? "homelab"}</small></div>
      </aside>

      <section className="workspace" id="now">
        <header className="topbar">
          <div><h1>Dayyan&apos;s HomeLab</h1></div>
          <div className="top-status"><span className="connection-state online">Online</span><span className="top-separator" /> <span>Updated {metricsFreshness}</span></div>
        </header>

        <section className="status-strip" id="host-status">
          <div className="status-stat"><Clock size={23} weight="light" /><div><span>Uptime</span><strong>{duration(host?.uptimeSeconds)}</strong><small>On since {easternDateTime(host?.startedAt)}</small></div></div>
          <div className="status-stat"><Network size={23} weight="light" /><div><span>Network</span><strong>↓ {formatBytes(host?.network.receivedBytesPerSecond)}/s <em>↑ {formatBytes(host?.network.sentBytesPerSecond)}/s</em></strong><small>Live host traffic</small></div></div>
          <div className="status-stat" id="storage"><Database size={23} weight="light" /><div><span>Storage</span><strong>{host?.storage[0] ? `${formatBytes(host.storage[0].usedBytes)} / ${formatBytes(host.storage[0].totalBytes)}` : "—"}</strong><small>{host?.storage[0] ? host.storage[0].mount === "/" ? "System volume" : host.storage[0].mount : "No mount data"}</small><i className="stat-meter storage-meter"><b style={{ width: `${host?.storage[0]?.percent ?? 0}%` }} /></i></div></div>
          <div className="status-stat"><ActivityIcon size={23} weight="light" /><div><span>System load</span><strong>CPU {value(system?.cpuPercent, "%")} <em>RAM {value(system?.ram.percent, "%")}</em></strong><small>{host?.loadAverage[0]?.toFixed(2) ?? "—"} load average</small></div></div>
        </section>

        <div className="dashboard-grid">
          <section className="gpu-panel" id="gpu">
            <div className="panel-title"><div><h2>NVIDIA GPU</h2><span>Live telemetry</span></div><div className="gpu-meta">{system?.source === "netdata" ? "Netdata + NVIDIA SMI" : <><ThinkingOrb state="connecting" size={20} theme="dark" aria-label="Connecting to GPU telemetry" />Connecting</>}</div></div>
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
            <div className="panel-title"><div><h2>Container fleet</h2><span>{running.length} / {containers.length} running</span></div><button className="quiet-button" onClick={() => setShowAllContainers((current) => !current)}>{showAllContainers ? "Show less" : `View all ${containers.length}`}</button></div>
            {containersError ? <p className="panel-error">Docker unavailable: {containersError}</p> : null}
            <div className="container-table" role="table">
              <div className="container-head" role="row"><span>Status</span><span>Name</span><span>CPU</span><span>RAM</span><span>Actions</span></div>
              {visibleContainers.map((container) => <div className={`container-row ${activeName === container.name ? "selected" : ""}`} key={container.id} role="row">
                <button className="container-name" onClick={() => { setSelectedContainer(container.name); setLogModal(container); }}><i className={container.state === "running" ? "container-state running" : "container-state stopped"} aria-label={container.state === "running" ? "Running" : "Stopped"} /><span>{container.name}<small>{container.image}</small></span></button>
                <span>{value(container.cpuPercent, "%")}</span><span>{formatBytes(container.memoryUsageBytes)}</span>
                <div className="row-actions"><button aria-label={`View ${container.name} logs`} onClick={() => { setSelectedContainer(container.name); setLogModal(container); }}><List size={16} />Logs</button><button aria-label={`Open ${container.name} terminal command`} onClick={() => void copyCommand(container)}><Terminal size={16} />Terminal</button></div>
              </div>)}
              {!containers.length && !containersError ? <p className="empty-state">Reading Docker containers…</p> : null}
            </div>
          </section>

          <section className="storage-panel"><div className="panel-title"><div><h2>Storage mounts</h2><span>{host?.storage.length ?? 0} persistent disks</span></div><HardDrives size={21} weight="light" /></div>{host?.storage.length ? <div className="mount-grid">{host.storage.map((mount) => <div className="mount-card" key={mount.mount}><div><HardDrives size={19} weight="duotone" /><span>{mount.mount === "/" ? "System" : mount.mount.split("/").filter(Boolean).at(-1)}</span><strong>{mount.percent}%</strong></div><small>{formatBytes(mount.usedBytes)} of {formatBytes(mount.totalBytes)}</small><i><b style={{ width: `${mount.percent}%` }} /></i></div>)}</div> : <p>Mount details appear when the dashboard runs on Linux.</p>}</section>
          <section className="cpu-panel capacity-panel"><div className="panel-title"><div><h2>Host capacity</h2><span>Select a gauge for its top consumers</span></div><ActivityIcon size={22} weight="light" /></div><div className="gauge-grid"><UsageGauge label="CPU usage" percent={system?.cpuPercent} detail={`${host?.loadAverage[0]?.toFixed(2) ?? "—"} load average`} tone="cpu" expanded={expandedGauges.cpu} onToggle={() => setExpandedGauges((current) => ({ ...current, cpu: !current.cpu }))} processes={processes ?? undefined} /><UsageGauge label="Memory" percent={system?.ram.percent} detail={`${formatBytes(system?.ram.usedMb ? system.ram.usedMb * 1024 * 1024 : null)} of ${formatBytes(system?.ram.totalMb ? system.ram.totalMb * 1024 * 1024 : null)}`} tone="ram" expanded={expandedGauges.ram} onToggle={() => setExpandedGauges((current) => ({ ...current, ram: !current.ram }))} processes={processes ?? undefined} /></div></section>
          <section className="services-panel"><div className="panel-title"><div><h2>Needs attention</h2><span>{attentionContainers.length ? `${attentionContainers.length} container${attentionContainers.length === 1 ? "" : "s"} stopped` : "No stopped containers"}</span></div><ChartLineUp size={22} weight="light" /></div><div className="service-list">{attentionContainers.length ? attentionContainers.map((container) => <button key={container.id} onClick={() => setSelectedContainer(container.name)}><span><i className="status-off" />{container.name}</span><small>{container.status}</small></button>) : <p className="healthy-state">No action needed — every container is running.</p>}</div></section>
        </div>

        <section className="operations-grid" id="operations">
          <article className="operation-card pihole-card"><div className="panel-title"><div><h2>Pi-hole</h2><span>DNS protection</span></div><span className="service-state">Live</span></div><strong className="operation-number">{pihole?.blockedPercent === null || pihole?.blockedPercent === undefined ? "—" : `${pihole.blockedPercent}%`}</strong><p>Blocked today: {pihole?.blockedToday?.toLocaleString() ?? "—"} · {pihole?.uniqueClients ?? "—"} clients</p><div className="blocked-domains"><span>Top blocked domains</span>{pihole?.topBlockedDomains?.length ? <ol>{pihole.topBlockedDomains.map((entry) => <li key={entry.domain}><span title={entry.domain}>{entry.domain}</span><strong>{entry.count.toLocaleString()}</strong></li>)}</ol> : <p>Waiting for Pi-hole domain data…</p>}</div></article>
          <article className="operation-card download-card"><div className="panel-title"><div><h2>Active downloads</h2><span>{downloads?.items.length ?? 0} in progress</span></div><button className="quiet-button" onClick={() => setShowDownloadLogs((current) => !current)}>{showDownloadLogs ? "Hide log" : "View log"}</button></div>{downloads?.items.length ? <ul className="download-list">{downloads.items.map((item) => <li key={item.id}><div><span>{item.name}</span><small>{item.source} · {item.state} · ↓ {formatBytes(item.downloadSpeedBps)}/s</small></div><strong>{item.progress}%</strong><i><b style={{ width: `${item.progress}%` }} /></i></li>)}</ul> : <p>No active downloads.</p>}{showDownloadLogs ? <pre className="download-log">{downloadLogs?.logs ?? "Loading qBittorrent log…"}</pre> : null}</article>
          <article className="operation-card network-card"><div className="panel-title"><div><h2>Network trend</h2><span>Live host traffic</span></div><Network size={21} weight="light" /></div><NetworkChart data={networkHistory} /></article>
          <article className="operation-card links-card"><div className="panel-title"><div><h2>Quick links</h2><span>{apps?.apps.length ?? 0} services</span></div><Monitor size={21} weight="light" /></div><div className="quick-links">{apps?.apps.map((app) => <a key={app.id} href={app.url} target="_blank" rel="noreferrer"><span className="app-thumb"><img src={appIconUrl(app.id)} alt="" /></span><small>{app.name}</small></a>)}{!apps?.apps.length ? <p>Set APP_*_URL values to add links.</p> : null}</div></article>
        </section>

        <section className="log-panel log-panel-bottom" aria-live="polite">
          <div className="log-toolbar"><div><h2>Live container log</h2><span>{selected?.name ?? "Select a container"}</span></div><div><button className="quiet-button" onClick={() => activeName && setSelectedContainer(activeName)}><Monitor size={16} />Live</button><button className="quiet-button" onClick={() => selected && void copyCommand(selected)} disabled={mounted ? selected === null : undefined}><Terminal size={16} />Terminal</button></div></div>
          {logsError ? <p className="panel-error">Log stream unavailable: {logsError}</p> : <pre className="log-output">{logsData?.logs || "Waiting for container output…"}</pre>}
        </section>

        <section className="diagnostics-panel" id="diagnostics">
          <div className="panel-title"><div><h2>Crash diagnostics</h2><span>Evidence from the current and previous server boot</span></div><WarningCircle size={22} weight="light" /></div>
          <p className="diagnostic-note">{diagnostics?.note ?? "Loading diagnostics…"}</p>
          <div className="diagnostic-summary"><div><span>Available RAM</span><strong>{diagnostics?.memory.availableMb ?? "—"} MB</strong></div><div><span>Swap free</span><strong>{diagnostics?.memory.swapFreeMb ?? "—"} MB</strong></div><div><span>Server uptime</span><strong>{duration(diagnostics?.uptimeSeconds)}</strong></div></div>
          <details><summary>Previous boot — kernel events to inspect after a crash</summary><pre>{diagnostics?.previousBootEvents ?? "Loading previous-boot events…"}</pre></details>
          <details><summary>Current boot — kernel events</summary><pre>{diagnostics?.currentKernelEvents ?? "Loading current-boot events…"}</pre></details>
          <details><summary>Recent reboot / shutdown record</summary><pre>{diagnostics?.recentReboots ?? "Loading reboot record…"}</pre></details>
          <details><summary>Memory pressure</summary><pre>{diagnostics?.pressure ?? "Loading memory pressure…"}</pre></details>
        </section>
        <UpdateButton />
        <InferenceLab system={system} host={host} history={history} apps={apps?.apps} />
      </section>

      {logModal ? <div className="terminal-modal" role="presentation"><div className="log-dialog" role="dialog" aria-modal="true" aria-labelledby="container-log-title"><button className="dialog-close" onClick={() => setLogModal(null)} aria-label="Close container logs"><X size={20} /></button><div className="log-toolbar"><div><h2 id="container-log-title">{logModal.name} logs</h2><span>Live refresh every 2.5 seconds</span></div><button className="quiet-button" onClick={() => void copyCommand(logModal)}><Terminal size={16} />Terminal</button></div>{modalLogsError ? <p className="panel-error">Log stream unavailable: {modalLogsError}</p> : <pre className="log-output">{modalLogs?.logs || "Loading container logs…"}</pre>}</div></div> : null}
      {showTerminal ? <div className="terminal-modal" role="presentation"><div className="terminal-dialog" role="dialog" aria-modal="true" aria-labelledby="terminal-title"><button className="dialog-close" onClick={() => setShowTerminal(null)} aria-label="Close terminal instructions"><X size={20} /></button><Terminal size={26} weight="light" /><h2 id="terminal-title">Open {showTerminal.name}</h2><p>A browser cannot safely host a privileged Docker shell. This command has been copied so you can paste it into your server terminal.</p><code>{showTerminal.terminalCommand}</code><div><button onClick={() => void copyCommand(showTerminal)}><Copy size={17} />{copied ? "Copied" : "Copy command"}</button><button className="quiet-button" onClick={() => setShowTerminal(null)}>Close</button></div></div></div> : null}
    </main>
  );
}
