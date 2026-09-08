import { env } from "../lib/env.js";
import { fetchJson, stripTrailingSlash } from "../lib/http.js";
import type { DownloadItem } from "./downloads.js";


type Torrent = {
  hash: string;
  name: string;
  progress: number;
  dlspeed: number;
  upspeed: number;
  eta: number;
  state: string;
  size: number;
  downloaded: number;
};


let cookie: string | null = null;


async function login(): Promise<string> {
  if (cookie) return cookie;

  const base = stripTrailingSlash(env.qbittorrentUrl);
  const body = new URLSearchParams({
    username: env.qbittorrentUser,
    password: env.qbittorrentPass,
  });

  const response = await fetch(`${base}/api/v2/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`qBittorrent login failed: ${response.status}`);
  }

  const setCookie = response.headers.getSetCookie?.() ?? [];
  const joined = setCookie.length
    ? setCookie.map((c) => c.split(";")[0]).join("; ")
    : response.headers.get("set-cookie")?.split(";")[0] ?? "";

  if (!joined) {
    const text = await response.text();
    if (text.trim() === "Ok.") {
      // some builds omit Set-Cookie in fetch; still treat as logged in via redirect jar absence
      cookie = "SID=unknown";
      return cookie;
    }
    throw new Error("qBittorrent login did not return a session cookie");
  }

  cookie = joined;
  return cookie;
}


function clearSession(): void {
  cookie = null;
}


const ACTIVE_STATES = new Set([
  "downloading",
  "metaDL",
  "forcedDL",
  "allocating",
  "moving",
  "stalledDL",
  "queuedDL",
  "checkingDL",
]);


export async function getQbittorrentDownloads(): Promise<DownloadItem[]> {
  if (!env.qbittorrentPass) {
    return [];
  }

  const base = stripTrailingSlash(env.qbittorrentUrl);

  const fetchTorrents = async (): Promise<Torrent[]> => {
    const sid = await login();
    return fetchJson<Torrent[]>(`${base}/api/v2/torrents/info`, {
      headers: { Cookie: sid },
    });
  };

  let torrents: Torrent[];
  try {
    torrents = await fetchTorrents();
  } catch {
    clearSession();
    torrents = await fetchTorrents();
  }

  return torrents
    .filter((t) => ACTIVE_STATES.has(t.state) || (t.progress < 1 && !t.state.startsWith("paused")))
    .map((t) => ({
      id: `qb-${t.hash}`,
      source: "qbittorrent" as const,
      name: t.name,
      progress: Number((t.progress * 100).toFixed(1)),
      state: t.state,
      downloadSpeedBps: t.dlspeed,
      uploadSpeedBps: t.upspeed,
      etaSeconds: t.eta >= 8640000 ? null : t.eta,
      sizeBytes: t.size,
      downloadedBytes: t.downloaded,
    }));
}
