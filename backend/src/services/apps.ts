import { env } from "../lib/env.js";


export type AppTile = {
  id: string;
  name: string;
  url: string;
};


export function getAppTiles(): AppTile[] {
  const catalog: Array<{ id: string; name: string; url: string }> = [
    { id: "files", name: "Files", url: env.apps.files },
    { id: "actual-budget", name: "Actual Budget", url: env.apps.actualBudget },
    { id: "ollama", name: "Ollama", url: env.apps.ollama },
    { id: "searxng", name: "SearXNG", url: env.apps.searxng },
    { id: "sonarr", name: "Sonarr", url: env.apps.sonarr },
    { id: "dozzle", name: "Dozzle", url: env.apps.dozzle },
    { id: "open-webui", name: "Open WebUI", url: env.apps.openWebui },
    { id: "pihole", name: "Pi-hole", url: env.apps.pihole },
    { id: "plex", name: "Plex", url: env.apps.plex },
    { id: "immich", name: "Immich", url: env.apps.immich },
    { id: "radarr", name: "Radarr", url: env.apps.radarr },
    { id: "qbittorrent", name: "qBittorrent", url: env.apps.qbittorrent },
    { id: "netdata", name: "Netdata", url: env.apps.netdata },
    { id: "syncthing", name: "Syncthing", url: env.apps.syncthing },
    {
      id: "turbodiffusion",
      name: "TurboDiffusion",
      url: env.apps.turboDiffusion,
    },
  ];

  return catalog.filter((app) => Boolean(app.url));
}
