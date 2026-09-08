# Home Server Dashboard

CasaOS-style dashboard for a Linux homeserver: Netdata metrics (CPU / RAM / disk / NVIDIA GPU), Pi-hole stats, active downloads from qBittorrent + Sonarr + Radarr, app quick links, and an OS update action that requires your sudo password each time.

## Layout

- `backend/` — Express API (proxies integrations + sudo updates)
- `frontend/` — Next.js App Router UI (simple panels + polling)

## Quick start (dev)

1. Copy env file and fill URLs/keys:

```bash
cp .env.example .env
```

Set `NEXT_PUBLIC_API_URL=http://localhost:4000` in `frontend/.env.local`. Load integration URLs, passwords, and API keys into `.env` in the repo root (or `backend/.env`). Do **not** copy passwords or API keys into `frontend/.env.local`.

2. Install and run:

```bash
make install
make dev        # both services in one terminal; Ctrl+C stops both
```

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Liveness |
| GET | `/api/system` | Netdata CPU/RAM/disk/GPU |
| GET | `/api/pihole` | Pi-hole summary |
| GET | `/api/downloads` | Unified qBit + Sonarr + Radarr |
| GET | `/api/apps` | Quick-link tiles from `APP_*_URL` |
| POST | `/api/updates` | Body `{ "password": "..." }` — runs allowlisted apt upgrade |

Polling intervals in the UI: system 5s, downloads 15s, Pi-hole 30s, apps 60s.

## Deploy on the homeserver

### Recommended: backend via systemd (required for OS updates)

Docker cannot cleanly accept an interactive sudo password against the host. Run the **backend on the host** with systemd; optionally run the frontend in Docker or also on the host.

1. Clone the repo on the server, copy `.env.example` → `.env`, fill values.
2. Install Node 22+, then:

```bash
cd backend && npm install && npm run build
```

3. Install the unit (edit paths/user first):

```bash
sudo cp deploy/homeserver-dashboard-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now homeserver-dashboard-backend
```

4. Frontend (host):

```bash
cd frontend
npm install
# This value is baked into the browser bundle during the build.
NEXT_PUBLIC_API_URL=http://<server-lan-or-tailscale-ip>:4000 npm run build
npm start
```

To start the frontend after reboots too, copy `deploy/homeserver-dashboard-frontend.service` to `/etc/systemd/system/`, edit the user/path placeholders, then enable it in the same way as the backend service.

Or use Compose for the frontend only after the backend is up on the host.

### Docker Compose (metrics/apps only)

```bash
cp .env.example .env
# set NEXT_PUBLIC_API_URL to the URL browsers will use, e.g. http://192.168.x.x:4000
make docker-up
```

`/api/updates` will **not** work inside the backend container. Use systemd for updates.

### LAN / Tailscale

- Open ports `3000` (UI) and `4000` (API) on the host firewall if needed.
- Set `FRONTEND_ORIGIN` to your UI origin(s), comma-separated if both LAN and Tailscale URLs are used.
- Set `NEXT_PUBLIC_API_URL` to an address reachable from the **browser** (LAN IP or Tailscale IP), not `localhost`, when accessing from other devices.

## Smoke test

With both services running:

```bash
make test-smoke
```

Manual checks:

1. `GET /api/health` returns `{ ok: true }`
2. System panel populates from Netdata
3. Pi-hole panel returns stats (password/token configured)
4. Start a torrent or *arr grab — downloads panel lists it
5. Apps tiles open the correct URLs
6. Update modal rejects empty password; with correct sudo password, apt runs and output appears (host backend only)

## Troubleshooting on the server

The backend logs startup configuration (without secrets), failed integration calls, failed API requests, and update results. With systemd, watch those logs live:

```bash
sudo journalctl -u homeserver-dashboard-backend -f
```

The System endpoint discovers NVIDIA-related Netdata chart IDs and tries common collector names. If a GPU value is still blank, the journal lists the chart IDs it tried and the Netdata response that prevented it from reading the metric.

## Security notes

- Sudo password is never logged or persisted; it is only piped to `sudo -S` for one allowlisted script.
- Prefer Tailscale (or VPN) over exposing ports to the public internet.
- Keep API keys in `.env` on the server only; do not commit them.

## Makefile targets

- `make install` / `make backend` / `make frontend` / `make build`
- `make docker-build` / `make docker-up` / `make docker-down`
- `make typecheck` / `make test-smoke`
