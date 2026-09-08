import { Router } from "express";
import { getHostOverview } from "../services/host.js";

export const hostRouter = Router();

hostRouter.get("/", async (_req, res, next) => {
  try { res.json(await getHostOverview()); } catch (error) { next(error); }
});
