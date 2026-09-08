export type SystemMetrics = {
  cpuPercent: number | null;
  ram: {
    usedMb: number | null;
    totalMb: number | null;
    percent: number | null;
  };
  disk: {
    usedGb: number | null;
    totalGb: number | null;
    percent: number | null;
  };
  gpu: {
    utilizationPercent: number | null;
    memoryUsedMb: number | null;
    memoryTotalMb: number | null;
    temperatureC: number | null;
  };
  source: "netdata";
};


export type PiholeStats = {
  status: string | null;
  queriesToday: number | null;
  blockedToday: number | null;
  blockedPercent: number | null;
  uniqueClients: number | null;
  domainsBeingBlocked: number | null;
};


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


export type AppTile = {
  id: string;
  name: string;
  url: string;
};


export type UpdateResult = {
  ok: boolean;
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
};
