export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of ["auth", "token", "apikey", "api_key", "password"]) {
      if (parsed.searchParams.has(key)) parsed.searchParams.set(key, "[redacted]");
    }
    return parsed.toString();
  } catch {
    return "[invalid URL]";
  }
}


export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new HttpError(
        response.status,
        `Request failed ${response.status} for ${safeUrl(url)}: ${body.slice(0, 200)}`,
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}


export async function fetchText(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<{ status: number; text: string; headers: Headers }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, text, headers: response.headers };
  } finally {
    clearTimeout(timer);
  }
}


export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
