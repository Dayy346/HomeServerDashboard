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
    powerWatts: number | null;
    coreClockMhz: number | null;
    memoryClockMhz: number | null;
  };
  source: "netdata";
};

export type StorageMount = {
  mount: string;
  usedBytes: number;
  totalBytes: number;
  percent: number;
};

export type HostOverview = {
  hostname: string;
  platform: string;
  uptimeSeconds: number;
  startedAt: string;
  loadAverage: number[];
  storage: StorageMount[];
  network: { receivedBytesPerSecond: number | null; sentBytesPerSecond: number | null };
};

export type Container = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  uptime: string;
  cpuPercent: number | null;
  memoryUsageBytes: number | null;
  memoryLimitBytes: number | null;
  memoryPercent: number | null;
  terminalCommand: string;
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

export type DiagnosticsReport = {
  generatedAt: string;
  uptimeSeconds: number;
  memory: { availableMb: number | null; totalMb: number | null; swapFreeMb: number | null };
  pressure: string;
  recentReboots: string;
  previousBootEvents: string;
  currentKernelEvents: string;
  note: string;
};


export type UpdateResult = {
  ok: boolean;
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
};
