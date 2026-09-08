import { env } from "../lib/env.js";
import { spawn } from "node:child_process";
import { logError, logInfo } from "../lib/logger.js";


export type UpdateResult = {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};


const ALLOWLISTED_SCRIPT = [
  "export DEBIAN_FRONTEND=noninteractive",
  "apt-get update",
  "apt-get upgrade -y",
].join(" && ");


export function runOsUpdate(password: string): Promise<UpdateResult> {
  return new Promise((resolve) => {
    logInfo("OS update requested");
    const child = spawn(
      "sudo",
      ["-S", "-p", "", "bash", "-lc", ALLOWLISTED_SCRIPT],
      {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          DEBIAN_FRONTEND: "noninteractive",
        },
      },
    );

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, env.updateTimeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 200_000) stdout = stdout.slice(-200_000);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      // sudo may echo password prompts; keep raw but never log password separately
      stderr += chunk.toString("utf8");
      if (stderr.length > 200_000) stderr = stderr.slice(-200_000);
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      logError("OS update could not start", error);
      resolve({
        ok: false,
        exitCode: null,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
        timedOut,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      logInfo("OS update finished", { exitCode: code, timedOut });
      resolve({
        ok: code === 0 && !timedOut,
        exitCode: code,
        stdout,
        stderr,
        timedOut,
      });
    });

    child.stdin.write(`${password}\n`);
    child.stdin.end();
  });
}
