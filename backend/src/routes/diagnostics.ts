import { Router } from "express";
import { getDiagnostics } from "../services/diagnostics.js";

export const diagnosticsRouter = Router();

diagnosticsRouter.get("/", async (_req, res, next) => {
  try { res.json(await getDiagnostics()); } catch (error) { next(error); }
});
