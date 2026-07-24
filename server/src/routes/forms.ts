import { Router } from "express";
import { prisma } from "../lib/prisma";
import { consumeTrial } from "../lib/trial";
import { analyzeFormWithGemini, refineFieldAnswer } from "../services/gemini";

export const formsRouter = Router();

interface IncomingField {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
}

async function resolveApiKey(email: string, geminiApiKey: string | null) {
  if (geminiApiKey) return geminiApiKey;
  const trial = await consumeTrial({ email });
  if (!trial.allowed) return null;
  return process.env.GEMINI_API_KEY || null;
}

/**
 * POST /api/forms/analyze
 * Body: { email, pageText, fields: [{id, label, placeholder, type}] }
 * One Gemini call analyzes the whole page against the user's profile.
 */
formsRouter.post("/analyze", async (req, res) => {
  const { email, pageText, fields } = req.body as {
    email?: string;
    pageText?: string;
    fields?: IncomingField[];
  };
  if (!email || !Array.isArray(fields)) {
    return res.status(400).json({ error: "email and fields[] are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "No profile found for this account." });

    // Never send password fields to the AI at all — hard safety rule.
    const safeFields = fields.filter((f) => f.type !== "password");

    const apiKey = await resolveApiKey(email, user.geminiApiKey);
    if (!apiKey) {
      return res.status(403).json({ error: "No Gemini key available and trial already used." });
    }

    const analysis = await analyzeFormWithGemini({
      apiKey,
      pageText: pageText || "",
      fields: safeFields,
      profile: {
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        whatsapp: user.whatsapp,
        linkedin: user.linkedin,
        portfolio: user.portfolio,
        github: user.github,
        cvText: user.cvText,
      },
    });

    // Re-add excluded password fields as "skip" so the popup's field count matches the page.
    const passwordSkips = fields
      .filter((f) => f.type === "password")
      .map((f) => ({ id: f.id, label: f.label, status: "skip" as const, value: null }));

    res.json({ topic: analysis.topic, intro: analysis.intro, results: [...analysis.results, ...passwordSkips] });
  } catch (err) {
    console.error("[forms] analyze failed:", err);
    res.status(503).json({ error: "Could not analyze this page. Please try again." });
  }
});

/**
 * POST /api/forms/interview-answer
 * Body: { email, fieldLabel, rawAnswer }
 * Cleans up one spoken answer into a final value for a specific field.
 */
formsRouter.post("/interview-answer", async (req, res) => {
  const { email, fieldLabel, fieldType, options, pageContext, rawAnswer } = req.body as {
    email?: string;
    fieldLabel?: string;
    fieldType?: string;
    options?: string[];
    pageContext?: string;
    rawAnswer?: string;
  };
  if (!email || !fieldLabel || !rawAnswer) {
    return res.status(400).json({ error: "email, fieldLabel, and rawAnswer are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "No profile found for this account." });

    const apiKey = await resolveApiKey(email, user.geminiApiKey);
    if (!apiKey) return res.status(403).json({ error: "No Gemini key available and trial already used." });

    const answer = await refineFieldAnswer({
      apiKey,
      fieldLabel,
      fieldType,
      options,
      pageContext,
      rawAnswer,
      cvText: user.cvText,
    });
    res.json({ answer });
  } catch (err) {
    console.error("[forms] interview-answer failed:", err);
    res.status(503).json({ error: "Could not process your answer. Please try again." });
  }
});
