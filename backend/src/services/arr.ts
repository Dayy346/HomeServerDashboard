import { env } from "../lib/env.js";
import { fetchJson, stripTrailingSlash } from "../lib/http.js";
import type { DownloadItem } from "./downloads.js";


type QueueResponse = {
  records?: Array<{
    id: number;
    title?: string;
    status?: string;
    trackedDownloadStatus?: string;
    trackedDownloadState?: string;
    size?: number;
    sizeleft?: number;
    timeleft?: string;
    episode?: { title?: string };
    series?: { title?: string };
    movie?: { title?: string };
  }>;
};


function parseTimeLeft(value?: string): number | null {
  if (!value || value === "00:00:00") return null;
  const parts = value.split(":").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [h, m, s] = parts;
  return h * 3600 + m * 60 + s;
}


async function fetchQueue(
  baseUrl: string,
  apiKey: string,
  source: "sonarr" | "radarr",
): Promise<DownloadItem[]> {
  if (!apiKey) return [];

  const base = stripTrailingSlash(baseUrl);
  const payload = await fetchJson<QueueResponse>(
    `${base}/api/v3/queue?page=1&pageSize=50&includeUnknownSeriesItems=true&includeUnknownMovieItems=true`,
    { headers: { "X-Api-Key": apiKey } },
  );

  return (payload.records ?? [])
    .filter((item) => {
      const state = (item.trackedDownloadState ?? item.status ?? "").toLowerCase();
      return state !== "completed" && state !== "idle";
    })
    .map((item) => {
      const size = item.size ?? 0;
      const left = item.sizeleft ?? 0;
      const downloaded = Math.max(0, size - left);
      const progress = size > 0 ? ((downloaded / size) * 100) : 0;
      const name =
        item.title ??
        item.movie?.title ??
        (item.series?.title
          ? `${item.series.title}${item.episode?.title ? ` - ${item.episode.title}` : ""}`
          : `Unknown ${source} item`);

      return {
        id: `${source}-${item.id}`,
        source,
        name,
        progress: Number(progress.toFixed(1)),
        state: item.trackedDownloadState ?? item.status ?? "unknown",
        downloadSpeedBps: null,
        uploadSpeedBps: null,
        etaSeconds: parseTimeLeft(item.timeleft),
        sizeBytes: size || null,
        downloadedBytes: downloaded || null,
      };
    });
}


export async function getSonarrDownloads(): Promise<DownloadItem[]> {
  return fetchQueue(env.sonarrUrl, env.sonarrApiKey, "sonarr");
}


export async function getRadarrDownloads(): Promise<DownloadItem[]> {
  return fetchQueue(env.radarrUrl, env.radarrApiKey, "radarr");
}
