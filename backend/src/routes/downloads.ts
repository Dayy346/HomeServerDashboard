import { Router } from "express";
import { getAllDownloads, getDownloadLogs } from "../services/downloads.js";


export const downloadsRouter = Router();


downloadsRouter.get("/", async (_req, res, next) => {
  try {
    const downloads = await getAllDownloads();
    res.json(downloads);
  } catch (error) {
    next(error);
  }
});

downloadsRouter.get("/logs", async (_req, res, next) => {
  try { res.json({ logs: await getDownloadLogs() }); } catch (error) { next(error); }
});
