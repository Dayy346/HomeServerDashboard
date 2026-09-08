export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };


export async function settle<T>(
  promise: Promise<T>,
  label: string,
): Promise<ServiceResult<T>> {
  try {
    const data = await promise;
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError("integration request failed", error, { integration: label });
    return { ok: false, error: `${label}: ${message}` };
  }
}
import { logError } from "./logger.js";
