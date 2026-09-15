import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";


const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config({ path: path.resolve(here, "../../.env") });


function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}


function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}


export const env = {
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: optional("FRONTEND_ORIGIN", "http://localhost:3000"),
  netdataUrl: optional("NETDATA_URL", "http://127.0.0.1:19999"),
  piholeUrl: optional("PIHOLE_URL", "http://127.0.0.1:8080"),
  piholePassword: optional("PIHOLE_PASSWORD"),
  piholeApiToken: optional("PIHOLE_API_TOKEN"),
  qbittorrentUrl: optional("QBITTORRENT_URL", "http://127.0.0.1:8181"),
  qbittorrentUser: optional("QBITTORRENT_USER", "admin"),
  qbittorrentPass: optional("QBITTORRENT_PASS"),
  sonarrUrl: optional("SONARR_URL", "http://127.0.0.1:8989"),
  sonarrApiKey: optional("SONARR_API_KEY"),
  radarrUrl: optional("RADARR_URL", "http://127.0.0.1:7878"),
  radarrApiKey: optional("RADARR_API_KEY"),
  updateTimeoutMs: Number(process.env.UPDATE_TIMEOUT_MS ?? 60 * 60 * 1000),
  apps: {
    files: optional("APP_FILES_URL"),
    actualBudget: optional("APP_ACTUAL_BUDGET_URL"),
    ollama: optional("APP_OLLAMA_URL"),
    searxng: optional("APP_SEARXNG_URL"),
    sonarr: optional("APP_SONARR_URL"),
    dozzle: optional("APP_DOZZLE_URL"),
    openWebui: optional("APP_OPEN_WEBUI_URL"),
    pihole: optional("APP_PIHOLE_URL"),
    plex: optional("APP_PLEX_URL"),
    immich: optional("APP_IMMICH_URL"),
    radarr: optional("APP_RADARR_URL"),
    qbittorrent: optional("APP_QBITTORRENT_URL"),
    netdata: optional("APP_NETDATA_URL"),
    syncthing: optional("APP_SYNCTHING_URL"),
    turboDiffusion: optional("APP_TURBODIFFUSION_URL"),
    casaosAppStore: optional("APP_CASAOS_APP_STORE_URL"),
  },
};


export function assertRuntimeConfig(): void {
  required("PORT", String(env.port));
}
