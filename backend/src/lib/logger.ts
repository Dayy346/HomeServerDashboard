type LogFields = Record<string, unknown>;

const lastWarningAt = new Map<string, number>();

function write(level: "INFO" | "WARN" | "ERROR", message: string, fields: LogFields = {}): void {
  const details = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ");
  console.log(`${new Date().toISOString()} ${level} ${message}${details ? ` ${details}` : ""}`);
}

export function logInfo(message: string, fields?: LogFields): void {
  write("INFO", message, fields);
}

export function logError(message: string, error: unknown, fields?: LogFields): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  write("ERROR", message, { ...fields, error: errorMessage });
}

// Dashboard polling retries often. Emit a repeated warning at most once a minute.
export function logWarningThrottled(key: string, message: string, fields?: LogFields): void {
  const now = Date.now();
  if (now - (lastWarningAt.get(key) ?? 0) < 60_000) return;
  lastWarningAt.set(key, now);
  write("WARN", message, fields);
}
