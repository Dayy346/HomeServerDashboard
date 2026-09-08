import { Router } from "express";
import { getAppTiles } from "../services/apps.js";


export const appsRouter = Router();


appsRouter.get("/", (_req, res) => {
  res.json({ apps: getAppTiles() });
});
