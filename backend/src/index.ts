import cors from "cors";
import express from "express";
import { assertRuntimeConfig, env } from "./lib/env.js";
import { HttpError } from "./lib/http.js";
import { appsRouter } from "./routes/apps.js";
import { downloadsRouter } from "./routes/downloads.js";
import { piholeRouter } from "./routes/pihole.js";
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


app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "homeserver-dashboard-backend" });
});


app.use("/api/system", systemRouter);
app.use("/api/pihole", piholeRouter);
app.use("/api/downloads", downloadsRouter);
app.use("/api/apps", appsRouter);
app.use("/api/updates", updatesRouter);


app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(status).json({ error: message });
  },
);


app.listen(env.port, "0.0.0.0", () => {
  console.log(`backend listening on http://0.0.0.0:${env.port}`);
});
