import { Router } from "express";
import { getProcessConsumers } from "../services/processes.js";

export const processesRouter = Router();

processesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await getProcessConsumers());
  } catch (error) {
    next(error);
  }
});
