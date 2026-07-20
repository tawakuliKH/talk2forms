import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { generateResumeSummary } from "../services/gemini.js";

export const usersRouter = Router();

const profileSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  lastname: z.string().min(1),
  whatsapp: z.string().optional().nullable(),
  linkedin: z.string().url().optional().or(z.literal("")).nullable(),
  portfolio: z.string().url().optional().or(z.literal("")).nullable(),
  github: z.string().url().optional().or(z.literal("")).nullable(),
  cvText: z.string().optional().nullable(),
  geminiApiKey: z.string().optional().nullable(),
});

/**
 * POST /api/users/register
 * Step 1: creates/updates the user row immediately, responds right away,
 * then generates the AI resume summary in the background and writes it to
 * the aiResume table once it's ready. The client does not wait on Gemini.
 */
usersRouter.post("/register", async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data = parsed.data;

  try {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        name: data.name,
        lastname: data.lastname,
        whatsapp: data.whatsapp || null,
        linkedin: data.linkedin || null,
        portfolio: data.portfolio || null,
        github: data.github || null,
        cvText: data.cvText || null,
        geminiApiKey: data.geminiApiKey || null,
        profileComplete: true,
      },
      update: {
        name: data.name,
        lastname: data.lastname,
        whatsapp: data.whatsapp || null,
        linkedin: data.linkedin || null,
        portfolio: data.portfolio || null,
        github: data.github || null,
        cvText: data.cvText || null,
        geminiApiKey: data.geminiApiKey || null,
        profileComplete: true,
      },
    });

    // Respond to the client immediately — don't block on the AI call.
    res.status(201).json({ user: { id: user.id, email: user.email } });

    // Fire-and-forget background job (step 1).
    void (async () => {
      try {
        const resume = await generateResumeSummary(
          {
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            whatsapp: user.whatsapp,
            linkedin: user.linkedin,
            portfolio: user.portfolio,
            github: user.github,
            cvText: user.cvText,
          },
          user.geminiApiKey
        );

        await prisma.aiResume.upsert({
          where: { userId: user.id },
          create: { userId: user.id, resume },
          update: { resume },
        });
      } catch (err) {
        // In production, log this to a proper logger/monitoring service.
        console.error(`[gemini] background resume generation failed for user ${user.id}:`, err);
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

/** GET /api/users/:id — used by the client to poll/check profile + resume status. */
usersRouter.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { aiResume: true },
  });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ user });
});
