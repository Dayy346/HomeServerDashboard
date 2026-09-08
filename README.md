# Home Server Dashboard

CasaOS-style dashboard for a Linux homeserver: Netdata metrics (CPU / RAM / disk / NVIDIA GPU), Pi-hole stats, active downloads from qBittorrent + Sonarr + Radarr, app quick links, and an OS update action that requires your sudo password each time.

## Layout

- `backend/` — Express API (proxies integrations + sudo updates)
- `frontend/` — Next.js App Router UI (simple panels + polling)

## Quick start (dev)

1. Copy env file and fill URLs/keys:

```bash
cp .env.example .env
cp .env.example frontend/.env.local
```

Set at least `NEXT_PUBLIC_API_URL=http://localhost:4000` in `frontend/.env.local`. Load the same integration vars into the backend via `.env` in the repo root (or `backend/.env`).

2. Install and run:

```bash
make install
make backend    # terminal 1 — http://0.0.0.0:4000
make frontend   # terminal 2 — http://localhost:3000
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
# set NEXT_PUBLIC_API_URL to http://<server-lan-or-tailscale-ip>:4000
npm install && npm run build && npm start -- -H 0.0.0.0 -p 3000
```

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

## Security notes

- Sudo password is never logged or persisted; it is only piped to `sudo -S` for one allowlisted script.
- Prefer Tailscale (or VPN) over exposing ports to the public internet.
- Keep API keys in `.env` on the server only; do not commit them.

## Makefile targets

- `make install` / `make backend` / `make frontend` / `make build`
- `make docker-build` / `make docker-up` / `make docker-down`
- `make typecheck` / `make test-smoke`
