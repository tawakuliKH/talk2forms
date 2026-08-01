import { Router } from "express";
import { transcribeAudio } from "../services/speech.js";

export const speechRouter = Router();

// Receives a base64-encoded audio clip recorded by the extension, forwards
// it to Groq's hosted Whisper model, returns the transcribed text.
speechRouter.post("/transcribe", async (req, res) => {
  const { audioBase64, mimeType } = req.body as { audioBase64?: string; mimeType?: string };
  if (!audioBase64) {
    return res.status(400).json({ error: "audioBase64 is required" });
  }

  try {
    const buffer = Buffer.from(audioBase64, "base64");
    const text = await transcribeAudio(buffer, mimeType || "audio/webm");
    res.json({ text });
  } catch (err) {
    console.error("[speech] transcription failed:", err);
    res.status(503).json({ error: "Could not transcribe audio. Please try again." });
  }
});
