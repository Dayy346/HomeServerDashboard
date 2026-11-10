import { env } from "../lib/env.js";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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
  "export NEEDRESTART_MODE=a",
  "apt-get -o DPkg::Lock::Timeout=300 update",
  "apt-get -o DPkg::Lock::Timeout=300 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold upgrade -y",
].join(" && ");


export function runOsUpdate(password: string): Promise<UpdateResult> {
  const failure = (stderr: string): Promise<UpdateResult> => Promise.resolve({
    ok: false, exitCode: null, stdout: "", stderr, timedOut: false,
  });
  if (existsSync("/.dockerenv") || existsSync("/run/.containerenv")) {
    return failure("Host OS updates require the host backend. Run sudo bash deploy/install-host-backend.sh from the project folder on your server, then retry.");
  }
  const sudoPath = ["/usr/bin/sudo", "/bin/sudo"].find(existsSync);
  const isRoot = process.getuid?.() === 0;
  if (!isRoot && !sudoPath) {
    return failure("sudo is missing on the host. Run sudo bash deploy/install-host-backend.sh (or run it from a root shell) to install the host backend and its prerequisites.");
  }
  return new Promise((resolve) => {
    logInfo("OS update requested");
    const child = spawn(
      isRoot ? "/bin/bash" : sudoPath!,
      isRoot ? ["-c", ALLOWLISTED_SCRIPT] : ["-S", "-p", "", "--", "/bin/bash", "-c", ALLOWLISTED_SCRIPT],
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

    // sudo can exit before consuming stdin (for example when permission is denied).
    // Keep a closed pipe from becoming an unhandled error that crashes the API.
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "EPIPE" && error.code !== "ERR_STREAM_DESTROYED") {
        stderr += `\nUnable to send sudo credentials: ${error.message}`;
      }
    });
    if (!isRoot) child.stdin.write(`${password}\n`);
    child.stdin.end();
  });
}
