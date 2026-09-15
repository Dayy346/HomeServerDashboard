import os from "node:os";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type DiagnosticsReport = {
  generatedAt: string;
  uptimeSeconds: number;
  memory: { availableMb: number | null; totalMb: number | null; swapFreeMb: number | null };
  pressure: string;
  recentReboots: string;
  previousBootEvents: string;
  currentKernelEvents: string;
  note: string;
};

async function command(commandName: string, args: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(commandName, args, { timeout: 10_000, maxBuffer: 512 * 1024 });
    return [stdout, stderr].filter(Boolean).join("\n").trim() || "No entries found.";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Unavailable: ${message}`;
  }
}

async function memory(): Promise<DiagnosticsReport["memory"]> {
  try {
    const fields = new Map<string, number>();
    for (const line of (await readFile("/proc/meminfo", "utf8")).split("\n")) {
      const match = line.match(/^(\w+):\s+(\d+)\s+kB$/);
      if (match) fields.set(match[1], Number(match[2]));
    }
    const toMb = (value: number | undefined) => value === undefined ? null : Math.round(value / 1024);
    return { availableMb: toMb(fields.get("MemAvailable")), totalMb: toMb(fields.get("MemTotal")), swapFreeMb: toMb(fields.get("SwapFree")) };
  } catch {
    return { availableMb: null, totalMb: null, swapFreeMb: null };
  }
}

export async function getDiagnostics(): Promise<DiagnosticsReport> {
  const [memoryInfo, pressure, recentReboots, previousBootEvents, currentKernelEvents] = await Promise.all([
    memory(),
    readFile("/proc/pressure/memory", "utf8").catch(() => "Memory pressure is unavailable on this host."),
    command("last", ["-x", "-F", "-n", "8"]),
    command("journalctl", ["-k", "-b", "-1", "--no-pager", "-n", "220"]),
    command("journalctl", ["-k", "-b", "0", "--no-pager", "-n", "220"]),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    uptimeSeconds: os.uptime(),
    memory: memoryInfo,
    pressure: pressure.trim(),
    recentReboots,
    previousBootEvents,
    currentKernelEvents,
    note: "Look for 'Out of memory', 'Killed process', 'oom-killer', 'NVRM: Xid', 'panic', or 'watchdog'. A 14B model on an 8 GB GPU may spill into system RAM; this report helps distinguish that from a GPU driver, power, or Docker restart.",
  };
}
