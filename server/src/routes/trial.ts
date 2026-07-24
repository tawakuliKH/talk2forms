import { Router } from "express";
import { consumeTrial } from "../lib/trial";

export const trialRouter = Router();

trialRouter.post("/check-and-use", async (req, res) => {
  const { deviceId, email } = req.body as { deviceId?: string; email?: string };
  const result = await consumeTrial({ email, deviceId });
  res.status(result.allowed ? 200 : 403).json(result);
});