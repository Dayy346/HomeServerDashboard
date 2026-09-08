import { Router } from "express";
import { getAllDownloads } from "../services/downloads.js";


export const downloadsRouter = Router();


downloadsRouter.get("/", async (_req, res, next) => {
  try {
    const downloads = await getAllDownloads();
    res.json(downloads);
  } catch (error) {
    next(error);
  }
});
