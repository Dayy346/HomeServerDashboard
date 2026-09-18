import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ProcessConsumer = {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryMb: number;
};

export type ProcessConsumers = {
  cpu: ProcessConsumer[];
  memory: ProcessConsumer[];
};

function parseProcesses(output: string): ProcessConsumer[] {
  return output
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/, 4))
    .map(([pid, name, cpuPercent, rss]) => ({
      pid: Number(pid),
      name,
      cpuPercent: Number(cpuPercent),
      memoryMb: Number(rss) / 1024,
    }))
    .filter((process) => Number.isFinite(process.pid) && Boolean(process.name) && Number.isFinite(process.cpuPercent) && Number.isFinite(process.memoryMb));
}

async function topProcesses(sort: "-pcpu" | "-rss"): Promise<ProcessConsumer[]> {
  if (process.platform !== "linux") return [];
  const { stdout } = await execFileAsync("ps", ["-eo", "pid=,comm=,%cpu=,rss=", `--sort=${sort}`], { timeout: 3_000 });
  return parseProcesses(stdout).slice(0, 5);
}

export async function getProcessConsumers(): Promise<ProcessConsumers> {
  const [cpu, memory] = await Promise.all([topProcesses("-pcpu"), topProcesses("-rss")]);
  return { cpu, memory };
}
