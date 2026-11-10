#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project_dir="$PWD"
if [[ "$EUID" -ne 0 ]]; then
  echo 'Run this script with sudo, or from a root shell.' >&2
  exit 1
fi
service_user="${SUDO_USER:-}"
if [[ -z "$service_user" || "$service_user" == root ]]; then
  echo 'Run with sudo from the account that owns the project (not root).' >&2
  exit 1
fi
command -v node >/dev/null
command -v npm >/dev/null
test -f .env
apt-get update
apt-get install -y sudo
sudo -u "$service_user" bash -c 'cd "$1/backend" && npm ci && npm run build' bash "$project_dir"
node_path="$(command -v node)"
cat > /etc/systemd/system/homeserver-dashboard-backend.service <<EOF
[Unit]
Description=Home Server Dashboard Backend
After=network.target
[Service]
Type=simple
User=$service_user
WorkingDirectory="$project_dir/backend"
EnvironmentFile="$project_dir/.env"
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$node_path dist/index.js
Restart=on-failure
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
# Release port 4000 before starting the host service.
docker compose stop backend
systemctl daemon-reload
systemctl enable homeserver-dashboard-backend
systemctl restart homeserver-dashboard-backend
systemctl is-active --quiet homeserver-dashboard-backend
echo 'Host backend started. Run: docker compose -f deploy/compose-host-backend.yml up -d --build'
