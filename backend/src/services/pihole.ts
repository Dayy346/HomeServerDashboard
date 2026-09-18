import { env } from "../lib/env.js";
import { fetchJson, stripTrailingSlash } from "../lib/http.js";


export type PiholeStats = {
  status: string | null;
  queriesToday: number | null;
  blockedToday: number | null;
  blockedPercent: number | null;
  uniqueClients: number | null;
  domainsBeingBlocked: number | null;
  topBlockedDomains: Array<{ domain: string; count: number }>;
};


type SessionResponse = {
  session?: {
    valid?: boolean;
    sid?: string;
    csrf?: string;
  };
};


type SummaryResponse = {
  queries?: {
    total?: number;
    blocked?: number;
    percent_blocked?: number;
    unique_clients?: number;
  };
  gravity?: {
    domains_being_blocked?: number;
  };
  // legacy / mixed shapes
  dns_queries_today?: number;
  ads_blocked_today?: number;
  ads_percentage_today?: number;
  unique_clients?: number;
  domains_being_blocked?: number;
  status?: string;
};

type TopDomainsResponse = {
  domains?: Array<{ domain?: string; count?: number }>;
};


let cachedSid: string | null = null;


async function authenticate(): Promise<string | null> {
  if (cachedSid) return cachedSid;

  const base = stripTrailingSlash(env.piholeUrl);
  if (env.piholeApiToken) {
    return null;
  }

  if (!env.piholePassword) {
    return null;
  }

  const response = await fetchJson<SessionResponse>(`${base}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: env.piholePassword }),
  });

  const sid = response.session?.sid ?? null;
  cachedSid = sid;
  return sid;
}


function clearSession(): void {
  cachedSid = null;
}


export async function getPiholeStats(): Promise<PiholeStats> {
  const base = stripTrailingSlash(env.piholeUrl);

  // Prefer Pi-hole v6 session API; fall back to token/query style
  try {
    const sid = await authenticate();
    const headers: Record<string, string> = {};
    if (sid) headers["X-FTL-SID"] = sid;

    const summary = await fetchJson<SummaryResponse>(`${base}/api/stats/summary`, { headers });
    const topDomains = await fetchJson<TopDomainsResponse>(`${base}/api/stats/top_domains?blocked=true&count=5`, { headers }).catch(() => ({ domains: [] }));

    return normalize(summary, topDomains);
  } catch {
    clearSession();
  }

  if (env.piholeApiToken) {
    const url =
      `${base}/admin/api.php?summaryRaw&auth=${encodeURIComponent(env.piholeApiToken)}`;
    const summary = await fetchJson<SummaryResponse>(url);
    return normalize(summary);
  }

  // Unauthenticated attempt (LAN setups sometimes allow it)
  const summary = await fetchJson<SummaryResponse>(`${base}/api/stats/summary`);
  return normalize(summary);
}


function normalize(summary: SummaryResponse, topDomains: TopDomainsResponse = {}): PiholeStats {
  const queriesToday =
    summary.queries?.total ?? summary.dns_queries_today ?? null;
  const blockedToday =
    summary.queries?.blocked ?? summary.ads_blocked_today ?? null;
  const blockedPercent =
    summary.queries?.percent_blocked ?? summary.ads_percentage_today ?? null;
  const uniqueClients =
    summary.queries?.unique_clients ?? summary.unique_clients ?? null;
  const domainsBeingBlocked =
    summary.gravity?.domains_being_blocked ??
    summary.domains_being_blocked ??
    null;

  return {
    status: summary.status ?? "enabled",
    queriesToday,
    blockedToday,
    blockedPercent:
      blockedPercent === null ? null : Number(Number(blockedPercent).toFixed(1)),
    uniqueClients,
    domainsBeingBlocked,
    topBlockedDomains: (topDomains.domains ?? [])
      .filter((entry): entry is { domain: string; count: number } => typeof entry.domain === "string" && typeof entry.count === "number")
      .slice(0, 5),
  };
}
