import { settle } from "../lib/result.js";
import { getQbittorrentDownloads } from "./qbittorrent.js";
import { getRadarrDownloads, getSonarrDownloads } from "./arr.js";


export type DownloadItem = {
  id: string;
  source: "qbittorrent" | "sonarr" | "radarr";
  name: string;
  progress: number;
  state: string;
  downloadSpeedBps: number | null;
  uploadSpeedBps: number | null;
  etaSeconds: number | null;
  sizeBytes: number | null;
  downloadedBytes: number | null;
};


export type DownloadsResponse = {
  items: DownloadItem[];
  errors: string[];
};


export async function getAllDownloads(): Promise<DownloadsResponse> {
  const [qb, sonarr, radarr] = await Promise.all([
    settle(getQbittorrentDownloads(), "qbittorrent"),
    settle(getSonarrDownloads(), "sonarr"),
    settle(getRadarrDownloads(), "radarr"),
  ]);

  const items: DownloadItem[] = [];
  const errors: string[] = [];

  if (qb.ok) items.push(...qb.data);
  else errors.push(qb.error);

  if (sonarr.ok) items.push(...sonarr.data);
  else errors.push(sonarr.error);

  if (radarr.ok) items.push(...radarr.data);
  else errors.push(radarr.error);

  items.sort((a, b) => a.name.localeCompare(b.name));
  return { items, errors };
}
