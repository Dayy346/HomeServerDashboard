import { Router } from "express";
import { getSystemMetrics } from "../services/netdata.js";


export const systemRouter = Router();


systemRouter.get("/", async (_req, res, next) => {
  try {
    const metrics = await getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});
