import { Lightning, RocketLaunch, Robot, Sparkle, WarningCircle } from "@phosphor-icons/react";
import type { AppTile, HostOverview, SystemMetrics } from "../lib/types";

type HistoryPoint = { time: string; gpu: number | null; vram: number | null; temperature: number | null };

function value(input: number | null | undefined, suffix = "") {
  return input === null || input === undefined ? "—" : `${input}${suffix}`;
}

export function InferenceLab({
  system,
  host,
  history,
  apps,
}: {
  system: SystemMetrics | null | undefined;
  host: HostOverview | null | undefined;
  history: HistoryPoint[];
  apps: AppTile[] | undefined;
}) {
  const gpuTotal = system?.gpu.memoryTotalMb ?? null;
  const gpuUsed = system?.gpu.memoryUsedMb ?? null;
  const vramPercent = gpuTotal && gpuUsed !== null ? Math.min(100, Math.round((gpuUsed / gpuTotal) * 100)) : null;
  const ollama = apps?.find((app) => app.id === "ollama");
  const openWebUi = apps?.find((app) => app.id === "open-webui");
  const latest = history.at(-1);

  return (
    <section className="inference-lab" id="ai-inference" aria-labelledby="inference-title">
      <header className="inference-heading">
        <div>
          <p className="section-kicker">Focused workspace</p>
          <h2 id="inference-title">AI / Inference lab</h2>
          <p>Observe local model capacity and launch your model tools without mixing them into day-to-day host operations.</p>
        </div>
        <div className="inference-actions">
          {ollama ? <a className="quiet-button" href={ollama.url} target="_blank" rel="noreferrer"><RocketLaunch size={16} />Open Ollama</a> : null}
          {openWebUi ? <a className="quiet-button" href={openWebUi.url} target="_blank" rel="noreferrer"><Robot size={16} />Open WebUI</a> : null}
          <button className="assistant-placeholder" type="button" disabled><Sparkle size={16} />Ask Lab Assistant <span>Coming next</span></button>
        </div>
      </header>

      <div className="inference-kpis" aria-label="Current inference capacity">
        <article><span>Ollama</span><strong>{ollama ? "Linked" : "Not linked"}</strong><small>{ollama ? "Ready to open from the dashboard" : "Set APP_OLLAMA_URL to connect"}</small></article>
        <article><span>GPU utilization</span><strong>{value(latest?.gpu, "%")}</strong><small>{system?.source === "netdata" ? "Live NVIDIA telemetry" : "Waiting for telemetry"}</small></article>
        <article className={vramPercent !== null && vramPercent >= 80 ? "is-warning" : ""}><span>VRAM headroom</span><strong>{gpuTotal && gpuUsed !== null ? `${Math.max(0, gpuTotal - gpuUsed)} MB` : "—"}</strong><small>{vramPercent === null ? "Waiting for NVIDIA SMI" : `${gpuUsed} / ${gpuTotal} MB used · ${vramPercent}%`}</small></article>
        <article><span>GPU temperature</span><strong>{value(system?.gpu.temperatureC, " °C")}</strong><small>{value(system?.gpu.powerWatts, " W")} power draw</small></article>
      </div>

      <div className="inference-grid">
        <article className="inference-panel capacity-readout">
          <div className="inference-panel-title"><div><h3>Capacity guardrail</h3><span>What the dashboard can safely say today</span></div><Lightning size={20} weight="light" /></div>
          <div className="vram-track" role="progressbar" aria-label="Current VRAM usage" aria-valuenow={vramPercent ?? undefined} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${vramPercent ?? 0}%` }} /></div>
          <div className="capacity-copy"><strong>{vramPercent === null ? "GPU telemetry is connecting" : `${vramPercent}% of VRAM in use`}</strong><p>{vramPercent !== null && vramPercent >= 80 ? "Limited headroom: review large model loads before starting them." : "There is currently room for a normal local inference workload."}</p></div>
          <dl className="capacity-details"><div><dt>System RAM</dt><dd>{value(system?.ram.percent, "%")}</dd></div><div><dt>Host load</dt><dd>{host?.loadAverage[0]?.toFixed(2) ?? "—"}</dd></div><div><dt>Temperature</dt><dd>{value(system?.gpu.temperatureC, " °C")}</dd></div></dl>
        </article>

        <article className="inference-panel model-placeholder">
          <div className="inference-panel-title"><div><h3>Model inventory</h3><span>Discovery connector is the next integration</span></div><Robot size={20} weight="light" /></div>
          <div className="empty-models"><WarningCircle size={23} weight="light" /><div><strong>No model list is shown yet</strong><p>The next pass will read Ollama&apos;s local model registry and show model size, quantization, context limit, warm/cold status, and fit estimate.</p></div></div>
          <div className="model-next">Planned: <span>installed models</span><span>active requests</span><span>tokens / sec</span><span>load failures</span></div>
        </article>
      </div>
    </section>
  );
}
