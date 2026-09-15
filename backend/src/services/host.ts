import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

export type StorageMount = {
  mount: string;
  usedBytes: number;
  totalBytes: number;
  percent: number;
};

export type HostOverview = {
  hostname: string;
  platform: string;
  uptimeSeconds: number;
  loadAverage: number[];
  storage: StorageMount[];
  network: { receivedBytesPerSecond: number | null; sentBytesPerSecond: number | null };
};

let previousNetwork: { received: number; sent: number; at: number } | null = null;

async function storage(): Promise<StorageMount[]> {
  if (process.platform !== "linux") return [];
  const { stdout } = await execFileAsync("df", ["-B1", "--output=target,size,used,pcent"]);
  return stdout
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 4)
    .map(([mount, total, used, percent]) => ({
      mount,
      totalBytes: Number(total),
      usedBytes: Number(used),
      percent: Number(percent.replace("%", "")),
    }))
    .filter((mount) => Number.isFinite(mount.totalBytes) && mount.totalBytes > 0)
    // Runtime filesystems make a storage dashboard noisy and are not useful
    // when deciding whether a disk is filling up.
    .filter((mount) => !["/dev", "/proc", "/sys", "/run", "/tmp"].some((prefix) => mount.mount === prefix || mount.mount.startsWith(`${prefix}/`)))
    .sort((a, b) => b.totalBytes - a.totalBytes)
    .slice(0, 6);
}

async function networkRate(): Promise<HostOverview["network"]> {
  if (process.platform !== "linux") {
    return { receivedBytesPerSecond: null, sentBytesPerSecond: null };
  }

  const contents = await readFile("/proc/net/dev", "utf8");
  const totals = contents
    .split("\n")
    .slice(2)
    .map((line) => line.trim().split(/[:\s]+/))
    .filter((parts) => parts.length >= 10 && parts[0] !== "lo")
    .reduce(
      (sum, parts) => ({ received: sum.received + Number(parts[1]), sent: sum.sent + Number(parts[9]) }),
      { received: 0, sent: 0 },
    );
  const now = Date.now();
  const last = previousNetwork;
  previousNetwork = { ...totals, at: now };
  if (!last || now <= last.at) return { receivedBytesPerSecond: null, sentBytesPerSecond: null };
  const elapsedSeconds = (now - last.at) / 1000;
  return {
    receivedBytesPerSecond: Math.max(0, (totals.received - last.received) / elapsedSeconds),
    sentBytesPerSecond: Math.max(0, (totals.sent - last.sent) / elapsedSeconds),
  };
}

export async function getHostOverview(): Promise<HostOverview> {
  const [mounts, network] = await Promise.all([storage().catch(() => []), networkRate().catch(() => ({ receivedBytesPerSecond: null, sentBytesPerSecond: null }))]);
  return {
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.release()}`,
    uptimeSeconds: os.uptime(),
    loadAverage: os.loadavg(),
    storage: mounts,
    network,
  };
}
