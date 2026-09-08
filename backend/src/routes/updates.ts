import { Router } from "express";
import { runOsUpdate } from "../services/updates.js";


export const updatesRouter = Router();


updatesRouter.post("/", async (req, res, next) => {
  try {
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!password) {
      res.status(400).json({ error: "sudo password is required" });
      return;
    }

    // Do not log password or echo it back
    const result = await runOsUpdate(password);
    res.status(result.ok ? 200 : 500).json({
      ok: result.ok,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    next(error);
  }
});
