# Enable host OS updates

The Docker backend cannot update the host OS. From the project folder on the
Linux server, using the account that owns the project and can run sudo:

```bash
git pull --ff-only origin main
sudo bash deploy/install-host-backend.sh
docker compose -f deploy/compose-host-backend.yml up -d --build
```

Node.js, npm, Docker Compose, and the project `.env` must already be installed.
The installer installs sudo, builds the backend as your account, stops the old
backend container, and starts the backend through systemd. The frontend keeps
running in Docker and forwards API requests to the host. Continue using the
compose file above for future frontend deployments.

Open OS updates in the dashboard and retry using your account's sudo password.
Inspect backend startup problems with:

```bash
sudo journalctl -u homeserver-dashboard-backend -n 50 --no-pager
```
