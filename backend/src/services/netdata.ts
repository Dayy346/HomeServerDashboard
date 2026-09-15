import { env } from "../lib/env.js";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fetchJson, stripTrailingSlash } from "../lib/http.js";
import { logWarningThrottled } from "../lib/logger.js";

const execFileAsync = promisify(execFile);


export type SystemMetrics = {
  cpuPercent: number | null;
  ram: {
    usedMb: number | null;
    totalMb: number | null;
    percent: number | null;
  };
  disk: {
    usedGb: number | null;
    totalGb: number | null;
    percent: number | null;
  };
  gpu: {
    utilizationPercent: number | null;
    memoryUsedMb: number | null;
    memoryTotalMb: number | null;
    temperatureC: number | null;
    powerWatts: number | null;
    coreClockMhz: number | null;
    memoryClockMhz: number | null;
  };
  source: "netdata";
};

type NvidiaSmi = {
  utilizationPercent: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
  temperatureC: number | null;
  powerWatts: number | null;
  coreClockMhz: number | null;
  memoryClockMhz: number | null;
};


type NetdataData = {
  labels?: string[];
  data?: Array<Array<number | null>>;
  view_update_every?: number;
  result?: {
    labels?: string[];
    data?: Array<Array<number | null>>;
  };
};

type NetdataChartsResponse = {
  charts?: Record<string, unknown>;
};

type NvidiaCharts = {
  utilization: string[];
  memory: string[];
  temperature: string[];
};

let cachedNvidiaCharts: NvidiaCharts | undefined;
let nvidiaChartsCheckedAt = 0;
let previousCpuSample: { total: number; idle: number } | undefined;

async function getHostCpuPercent(): Promise<number | null> {
  if (process.platform !== "linux") return null;

  try {
    const firstLine = (await readFile("/proc/stat", "utf8")).split("\n")[0];
    const fields = firstLine?.trim().split(/\s+/).slice(1).map(Number) ?? [];
    if (fields.length < 5 || fields.some((value) => !Number.isFinite(value))) return null;

    const idle = fields[3] + fields[4]; // idle + iowait
    const total = fields.reduce((sum, value) => sum + value, 0);
    const previous = previousCpuSample;
    previousCpuSample = { total, idle };
    if (!previous) return null;

    const totalDelta = total - previous.total;
    const idleDelta = idle - previous.idle;
    if (totalDelta <= 0) return null;
    return Math.max(0, Math.min(100, ((totalDelta - idleDelta) / totalDelta) * 100));
  } catch {
    return null;
  }
}

async function getHostRam(): Promise<{ usedMb: number; totalMb: number; percent: number } | null> {
  if (process.platform !== "linux") return null;

  try {
    const values = new Map<string, number>();
    for (const line of (await readFile("/proc/meminfo", "utf8")).split("\n")) {
      const match = line.match(/^(\w+):\s+(\d+)\s+kB$/);
      if (match) values.set(match[1], Number(match[2]));
    }
    const totalKb = values.get("MemTotal");
    const availableKb = values.get("MemAvailable");
    if (!totalKb || availableKb === undefined) return null;
    const usedMb = (totalKb - availableKb) / 1024;
    const totalMb = totalKb / 1024;
    return { usedMb, totalMb, percent: (usedMb / totalMb) * 100 };
  } catch {
    return null;
  }
}


function latestPoint(payload: NetdataData): Record<string, number | null> {
  const labels = payload.labels ?? payload.result?.labels ?? [];
  const rows = payload.data ?? payload.result?.data ?? [];
  const last = rows.at(-1);
  if (!last || labels.length === 0) {
    return {};
  }

  const point: Record<string, number | null> = {};
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    if (!label || label === "time") continue;
    const value = last[i];
    point[label] = typeof value === "number" ? value : null;
  }
  return point;
}


async function fetchChart(chart: string, after = -2): Promise<Record<string, number | null>> {
  const base = stripTrailingSlash(env.netdataUrl);
  const url =
    `${base}/api/v1/data?chart=${encodeURIComponent(chart)}` +
    `&after=${after}&points=2&format=json&options=absolute`;

  try {
    const payload = await fetchJson<NetdataData>(url);
    return latestPoint(payload);
  } catch {
    // Some Netdata builds prefer the v2 path for newer charts
    const v2 =
      `${base}/api/v2/data?contexts=${encodeURIComponent(chart)}` +
      `&after=${after}&points=2&format=json`;
    const payload = await fetchJson<NetdataData>(v2);
    return latestPoint(payload);
  }
}

async function fetchFirstAvailableChart(
  metric: string,
  charts: string[],
): Promise<Record<string, number | null>> {
  const failures: string[] = [];

  for (const chart of charts) {
    try {
      const point = await fetchChart(chart);
      if (Object.keys(point).length > 0) return point;
      failures.push(`${chart}: no dimensions returned`);
    } catch (error) {
      failures.push(`${chart}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  logWarningThrottled(`netdata-${metric}`, "Netdata metric unavailable", {
    metric,
    triedCharts: charts,
    details: failures.join(" | ").slice(0, 1_000),
  });
  return {};
}

async function discoverNvidiaCharts(): Promise<NvidiaCharts> {
  // Chart IDs only change when Netdata or its NVIDIA collector restarts.
  if (cachedNvidiaCharts !== undefined && Date.now() - nvidiaChartsCheckedAt < 10 * 60_000) {
    return cachedNvidiaCharts;
  }
  nvidiaChartsCheckedAt = Date.now();

  const base = stripTrailingSlash(env.netdataUrl);
  try {
    const payload = await fetchJson<NetdataChartsResponse>(`${base}/api/v1/charts`);
    const names = Object.keys(payload.charts ?? {}).filter((name) => /nvidia|gpu/i.test(name));
    const matching = (pattern: RegExp) => names.filter((name) => pattern.test(name));
    cachedNvidiaCharts = {
      utilization: matching(/utili[sz]ation|gpu_util/i),
      memory: matching(/memory|mem_usage|mem_/i),
      temperature: matching(/temperature|temp/i),
    };
    return cachedNvidiaCharts;
  } catch (error) {
    logWarningThrottled("netdata-nvidia-discovery", "Could not discover NVIDIA charts", {
      error: error instanceof Error ? error.message : String(error),
    });
    cachedNvidiaCharts = { utilization: [], memory: [], temperature: [] };
    return cachedNvidiaCharts;
  }
}


function sumValues(point: Record<string, number | null>, exclude: string[] = []): number | null {
  const values = Object.entries(point)
    .filter(([key, value]) => !exclude.includes(key) && typeof value === "number")
    .map(([, value]) => value as number);

  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0);
}


function firstNumber(
  point: Record<string, number | null>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = point[key];
    if (typeof value === "number") return value;
  }
  const values = Object.values(point).filter((v): v is number => typeof v === "number");
  return values[0] ?? null;
}

async function getNvidiaSmi(): Promise<NvidiaSmi | null> {
  if (process.platform !== "linux") return null;
  try {
    const { stdout } = await execFileAsync("nvidia-smi", [
      "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,clocks.current.graphics,clocks.current.memory",
      "--format=csv,noheader,nounits",
    ]);
    const values = stdout.trim().split("\n")[0]?.split(",").map((value) => Number.parseFloat(value.trim())) ?? [];
    if (values.length < 7 || values.some((value) => Number.isNaN(value))) return null;
    return {
      utilizationPercent: values[0], memoryUsedMb: values[1], memoryTotalMb: values[2],
      temperatureC: values[3], powerWatts: values[4], coreClockMhz: values[5], memoryClockMhz: values[6],
    };
  } catch (error) {
    logWarningThrottled("nvidia-smi", "Could not read NVIDIA GPU via nvidia-smi", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}


export async function getSystemMetrics(): Promise<SystemMetrics> {
  const discoveredNvidia = await discoverNvidiaCharts();
  const [cpuPoint, ramPoint, diskPoint, gpuUtil, gpuMem, gpuTemp, nvidiaSmi, hostCpuPercent, hostRam] = await Promise.all([
    fetchFirstAvailableChart("CPU", ["system.cpu"]),
    fetchFirstAvailableChart("RAM", ["system.ram"]),
    fetchFirstAvailableChart("root disk", ["disk_space./", "disk.space"]),
    fetchFirstAvailableChart("NVIDIA GPU utilization", [
      "nvidia_smi.gpu_utilization_gpu0",
      "nvidia_smi.gpu_utilization",
      "nvidia_smi.gpu0_utilization",
      ...discoveredNvidia.utilization,
    ]),
    fetchFirstAvailableChart("NVIDIA GPU memory", [
      "nvidia_smi.mem_usage_gpu0",
      "nvidia_smi.mem_usage",
      "nvidia_smi.gpu0_mem_usage",
      "nvidia_smi.gpu0_memory",
      ...discoveredNvidia.memory,
    ]),
    fetchFirstAvailableChart("NVIDIA GPU temperature", [
      "nvidia_smi.temperature_gpu0",
      "nvidia_smi.temperature",
      "nvidia_smi.gpu0_temperature",
      ...discoveredNvidia.temperature,
    ]),
    getNvidiaSmi(),
    getHostCpuPercent(),
    getHostRam(),
  ]);

  const idle = firstNumber(cpuPoint, ["idle"]);
  const cpuBusy =
    idle !== null
      ? Math.max(0, Math.min(100, 100 - idle))
      : sumValues(cpuPoint, ["idle", "guest", "guest_nice"]);

  const ramUsed = firstNumber(ramPoint, ["used", "Used"]);
  const ramCached = firstNumber(ramPoint, ["cached", "Cached"]) ?? 0;
  const ramBuffers = firstNumber(ramPoint, ["buffers", "Buffers"]) ?? 0;
  const ramFree = firstNumber(ramPoint, ["free", "Free"]) ?? 0;
  const ramTotal =
    ramUsed !== null
      ? ramUsed + ramCached + ramBuffers + ramFree
      : null;
  const ramPercent =
    ramUsed !== null && ramTotal && ramTotal > 0
      ? (ramUsed / ramTotal) * 100
      : null;

  const diskAvail = firstNumber(diskPoint, ["avail", "available", "Available"]);
  const diskUsed = firstNumber(diskPoint, ["used", "Used"]);
  const diskTotal =
    diskUsed !== null && diskAvail !== null ? diskUsed + diskAvail : null;
  const diskPercent =
    diskUsed !== null && diskTotal && diskTotal > 0
      ? (diskUsed / diskTotal) * 100
      : null;

  // Netdata disk_space is often MiB; normalize to GiB when values look like MiB
  const toGb = (mib: number | null): number | null =>
    mib === null ? null : mib / 1024;

  return {
    cpuPercent: hostCpuPercent === null ? (cpuBusy === null ? null : Number(cpuBusy.toFixed(1))) : Number(hostCpuPercent.toFixed(1)),
    ram: {
      usedMb: hostRam ? Number(hostRam.usedMb.toFixed(0)) : (ramUsed === null ? null : Number(ramUsed.toFixed(0))),
      totalMb: hostRam ? Number(hostRam.totalMb.toFixed(0)) : (ramTotal === null ? null : Number(ramTotal.toFixed(0))),
      percent: hostRam ? Number(hostRam.percent.toFixed(1)) : (ramPercent === null ? null : Number(ramPercent.toFixed(1))),
    },
    disk: {
      usedGb: toGb(diskUsed) === null ? null : Number(toGb(diskUsed)!.toFixed(1)),
      totalGb: toGb(diskTotal) === null ? null : Number(toGb(diskTotal)!.toFixed(1)),
      percent: diskPercent === null ? null : Number(diskPercent.toFixed(1)),
    },
    gpu: {
      utilizationPercent: (() => {
        const v = nvidiaSmi?.utilizationPercent ?? firstNumber(gpuUtil, ["utilization", "gpu", "gpu0"]);
        return v === null ? null : Number(v.toFixed(1));
      })(),
      memoryUsedMb: (() => {
        const v = nvidiaSmi?.memoryUsedMb ?? firstNumber(gpuMem, ["used", "memory", "fb"]);
        return v === null ? null : Number(v.toFixed(0));
      })(),
      memoryTotalMb: (() => {
        if (nvidiaSmi?.memoryTotalMb !== null && nvidiaSmi?.memoryTotalMb !== undefined) return Number(nvidiaSmi.memoryTotalMb.toFixed(0));
        const used = firstNumber(gpuMem, ["used", "memory", "fb"]);
        const free = firstNumber(gpuMem, ["free"]);
        if (used !== null && free !== null) return Number((used + free).toFixed(0));
        return null;
      })(),
      temperatureC: (() => {
        const v = nvidiaSmi?.temperatureC ?? firstNumber(gpuTemp, ["temperature", "temp", "gpu"]);
        return v === null ? null : Number(v.toFixed(0));
      })(),
      powerWatts: nvidiaSmi?.powerWatts === null || nvidiaSmi?.powerWatts === undefined ? null : Number(nvidiaSmi.powerWatts.toFixed(0)),
      coreClockMhz: nvidiaSmi?.coreClockMhz === null || nvidiaSmi?.coreClockMhz === undefined ? null : Number(nvidiaSmi.coreClockMhz.toFixed(0)),
      memoryClockMhz: nvidiaSmi?.memoryClockMhz === null || nvidiaSmi?.memoryClockMhz === undefined ? null : Number(nvidiaSmi.memoryClockMhz.toFixed(0)),
    },
    source: "netdata",
  };
}
