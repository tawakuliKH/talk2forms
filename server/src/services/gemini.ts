import { GoogleGenerativeAI } from "@google/generative-ai";

interface ProfileInput {
  name: string;
  lastname: string;
  email: string;
  whatsapp?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
  github?: string | null;
  cvText?: string | null;
}

/**
 * Generates a short, summarized resume from the user's submitted profile.
 * Uses the user's OWN Gemini API key when they've provided one (step 6),
 * falling back to a shared server key only if configured — keeps costs on
 * each user rather than on you.
 */
export async function generateResumeSummary(
  profile: ProfileInput,
  apiKey?: string | null
): Promise<string> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "No Gemini API key available: user has not provided one and no server fallback key is configured."
    );
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are summarizing a job candidate's profile into a short resume.
Keep it under 200 words, professional tone, third person, plain text (no markdown).

Name: ${profile.name} ${profile.lastname}
Email: ${profile.email}
WhatsApp: ${profile.whatsapp ?? "N/A"}
LinkedIn: ${profile.linkedin ?? "N/A"}
Portfolio: ${profile.portfolio ?? "N/A"}
GitHub: ${profile.github ?? "N/A"}

Raw CV text pasted by the candidate:
"""
${profile.cvText ?? "(none provided)"}
"""

Write the summarized resume now.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
