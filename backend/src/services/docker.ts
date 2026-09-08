import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logError } from "../lib/logger.js";

const execFileAsync = promisify(execFile);

export type Container = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  uptime: string;
  cpuPercent: number | null;
  memoryUsageBytes: number | null;
  memoryLimitBytes: number | null;
  memoryPercent: number | null;
  terminalCommand: string;
};

type DockerPs = { ID: string; Names: string; Image: string; State: string; Status: string };
type DockerStats = { Name: string; CPUPerc: string; MemUsage: string; MemPerc: string };

function parseSize(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([\d.]+)\s*(B|KiB|MiB|GiB|TiB|kB|MB|GB|TB)?$/i);
  if (!match) return null;
  const units: Record<string, number> = { B: 1, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4, KB: 1000, MB: 1000 ** 2, GB: 1000 ** 3, TB: 1000 ** 4 };
  return Number(match[1]) * (units[(match[2] ?? "B").toUpperCase()] ?? 1);
}

function parsePercent(value: string | undefined): number | null {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJsonLines<T>(value: string): T[] {
  return value.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}

function safeContainerName(name: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) throw new Error("Invalid container name");
  return name;
}

export async function getContainers(): Promise<Container[]> {
  let ps: { stdout: string };
  let stats: { stdout: string };
  try {
    [ps, stats] = await Promise.all([
      execFileAsync("docker", ["ps", "-a", "--format", "{{json .}}"]),
      execFileAsync("docker", ["stats", "--no-stream", "--format", "{{json .}}"]),
    ]);
  } catch (error) {
    logError("Docker fleet query failed", error);
    throw new Error("Docker is unavailable. Confirm the backend service user can run docker ps without sudo.");
  }
  const statByName = new Map(parseJsonLines<DockerStats>(stats.stdout).map((stat) => [stat.Name, stat]));
  return parseJsonLines<DockerPs>(ps.stdout).map((container) => {
    const stat = statByName.get(container.Names);
    const [used, limit] = (stat?.MemUsage ?? "").split(" / ");
    return {
      id: container.ID,
      name: container.Names,
      image: container.Image,
      state: container.State,
      status: container.Status,
      uptime: container.Status.replace(/^[A-Za-z]+\s+/, ""),
      cpuPercent: parsePercent(stat?.CPUPerc),
      memoryUsageBytes: parseSize(used),
      memoryLimitBytes: parseSize(limit),
      memoryPercent: parsePercent(stat?.MemPerc),
      terminalCommand: `docker exec -it ${safeContainerName(container.Names)} /bin/sh`,
    };
  });
}

export async function getContainerLogs(name: string, tail = 250): Promise<string> {
  const safeName = safeContainerName(name);
  const safeTail = Math.max(1, Math.min(1_000, Math.floor(tail)));
  try {
    const { stdout, stderr } = await execFileAsync("docker", ["logs", "--timestamps", "--tail", String(safeTail), safeName]);
    return [stdout, stderr].filter(Boolean).join("\n");
  } catch (error) {
    logError("Docker log query failed", error, { container: safeName });
    throw new Error("Could not read this container's logs.");
  }
}
