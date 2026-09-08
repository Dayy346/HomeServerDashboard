import { Router } from "express";
import { getContainerLogs, getContainers } from "../services/docker.js";

export const containersRouter = Router();

containersRouter.get("/", async (_req, res, next) => {
  try { res.json({ containers: await getContainers() }); } catch (error) { next(error); }
});

containersRouter.get("/:name/logs", async (req, res, next) => {
  try {
    const tail = Number(req.query.tail ?? 250);
    res.json({ name: req.params.name, logs: await getContainerLogs(req.params.name, tail) });
  } catch (error) { next(error); }
});
