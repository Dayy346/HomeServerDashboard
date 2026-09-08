import { Router } from "express";
import { getPiholeStats } from "../services/pihole.js";


export const piholeRouter = Router();


piholeRouter.get("/", async (_req, res, next) => {
  try {
    const stats = await getPiholeStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});
