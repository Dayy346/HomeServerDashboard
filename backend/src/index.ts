import cors from "cors";
import express from "express";
import { assertRuntimeConfig, env } from "./lib/env.js";
import { HttpError } from "./lib/http.js";
import { logError, logInfo } from "./lib/logger.js";
import { appsRouter } from "./routes/apps.js";
import { containersRouter } from "./routes/containers.js";
import { downloadsRouter } from "./routes/downloads.js";
import { piholeRouter } from "./routes/pihole.js";
import { hostRouter } from "./routes/host.js";
import { systemRouter } from "./routes/system.js";
import { updatesRouter } from "./routes/updates.js";


assertRuntimeConfig();


const app = express();


app.use(
  cors({
    origin: env.frontendOrigin.split(",").map((origin) => origin.trim()),
  }),
);
app.use(express.json({ limit: "32kb" }));

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      logInfo("API request completed with an error", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    }
  });
  next();
});


app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "homeserver-dashboard-backend" });
});


app.use("/api/system", systemRouter);
app.use("/api/pihole", piholeRouter);
app.use("/api/downloads", downloadsRouter);
app.use("/api/apps", appsRouter);
app.use("/api/host", hostRouter);
app.use("/api/containers", containersRouter);
app.use("/api/updates", updatesRouter);


app.use(
  (
    error: unknown,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    logError("API request failed", error, { method: req.method, path: req.path, status });
    res.status(status).json({ error: message });
  },
);


app.listen(env.port, "0.0.0.0", () => {
  logInfo("backend listening", {
    address: `http://0.0.0.0:${env.port}`,
    netdataUrl: env.netdataUrl,
    piholeConfigured: Boolean(env.piholePassword || env.piholeApiToken),
    qbittorrentConfigured: Boolean(env.qbittorrentPass),
    sonarrConfigured: Boolean(env.sonarrApiKey),
    radarrConfigured: Boolean(env.radarrApiKey),
  });
});
