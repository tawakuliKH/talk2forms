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
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash"});

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

export interface AnalyzedField {
  id: string;
  label: string;
  status: "ready" | "missing" | "skip";
  value: string | null;
}

export async function analyzeFormWithGemini({
  apiKey,
  pageText,
  fields,
  profile,
}: {
  apiKey: string;
  pageText: string;
  fields: { id: string; label: string; placeholder?: string; type?: string; options?: string[] }[];
  profile: {
    name: string;
    lastname: string;
    email: string;
    whatsapp?: string | null;
    linkedin?: string | null;
    portfolio?: string | null;
    github?: string | null;
    cvText?: string | null;
  };
}): Promise<{ topic: string; intro: string; results: AnalyzedField[] }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

  const prompt = `You are an intelligent, careful form-filling assistant embedded in a
browser extension. You receive the full text of a webpage, every fillable field on
it, and the logged-in user's saved profile. Your job is to decide, field by field,
what (if anything) should go into it.

PAGE TEXT (context for what this page/form is actually for):
${pageText.slice(0, 1200)}

FORM FIELDS (id, label, placeholder, input type, and options if it's a
select/radio/checkbox group):
${JSON.stringify(fields, null, 2)}

USER'S PROFILE:
Name: ${profile.name} ${profile.lastname}
Email: ${profile.email}
WhatsApp: ${profile.whatsapp || "(not provided)"}
LinkedIn: ${profile.linkedin || "(not provided)"}
Portfolio: ${profile.portfolio || "(not provided)"}
GitHub: ${profile.github || "(not provided)"}
CV / background:
${(profile.cvText || "(not provided)").slice(0, 1200)}

DECISION RULES:
1. A field belongs to the user ONLY if it is asking about the user themself.
   If it's clearly asking about someone else (e.g. "Recipient name", "Emergency
   contact", "Referee email", "Employer phone") or about something that isn't a
   personal attribute of the user at all (e.g. package weight, shipping country,
   product SKU), mark it "skip" with value null. Do not guess or fabricate data
   for these.
2. If the user's profile clearly answers a personal field, mark it "ready" and
   put the best value in "value":
   - Plain text/email/tel/url fields: the exact value to insert.
   - textarea fields: write a genuine multi-sentence answer (not just a copied
     fact) drawing on the CV/background, in professional language, tailored to
     what the page/field is asking. Aim for 2-4 sentences of real substance,
     not filler.
   - select/radio/checkbox fields: choose from the given "options" array only —
     return the exact option text that best matches, never invent an option
     that isn't listed.
   - date/range/color/file fields: only mark "ready" if there's a clear,
     specific answer available; otherwise mark "missing". For file fields,
     value should be a short suggested filename only (e.g. "khadim-cv.pdf"),
     never fabricated file content.
3. If a field is genuinely about the user but the profile has no matching
   information, mark it "missing" with value null — this is what the voice
   interview will ask about.
4. Never process password fields; if one appears, mark it "skip".
5. Be conservative: when uncertain whether a field is about the user, prefer
   "missing" over guessing, and prefer "skip" over misassigning someone else's
   field.

Return ONLY valid JSON, no markdown fencing, no commentary, in exactly this shape:
{
  "topic": "short plain-language description of what this page/form is for",
  "intro": "one warm spoken sentence greeting the user by first name, naming the
            page's purpose, and saying roughly how many fields need their input",
  "results": [
    { "id": "field-id", "label": "field label", "status": "ready"|"missing"|"skip", "value": "string or null" }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
  return JSON.parse(text);
}

export async function refineFieldAnswer({
  apiKey,
  fieldLabel,
  fieldType,
  options,
  pageContext,
  rawAnswer,
  cvText,
}: {
  apiKey: string;
  fieldLabel: string;
  fieldType?: string;
  options?: string[];
  pageContext?: string;
  rawAnswer: string;
  cvText?: string | null;
}): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

  const isLongForm = fieldType === "textarea";
  const isChoice = fieldType && ["select", "radio", "checkbox"].includes(fieldType) && options?.length;

  const prompt = `You are turning a user's spoken answer into the final text for one
form field.

Field label: "${fieldLabel}"
Field type: ${fieldType || "text"}
${isChoice ? `Available options (you MUST pick from these exactly, verbatim): ${JSON.stringify(options)}` : ""}
${pageContext ? `Page context: ${pageContext.slice(0, 500)}` : ""}
${cvText ? `User's CV/background for extra context:\n${cvText.slice(0, 1000)}` : ""}

They just spoke this answer out loud (may be casual, rambling, with filler
words or false starts): "${rawAnswer}"

${
  isChoice
    ? "Return ONLY the single best-matching option text, exactly as it appears in the options list above. No other text."
    : isLongForm
    ? "Rewrite this into a well-structured, professional 2-4 sentence answer suitable for a textarea field. Keep their real facts and meaning intact — do not invent new information not implied by what they said or their CV. Return ONLY the final text."
    : "Rewrite this into a clean, concise, professional value suitable to paste directly into that single-line field. Keep their actual facts intact. Return ONLY the final text, no quotes, no preamble."
}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim().replace(/^["']|["']$/g, "");
}

export async function classifyFieldsWithGemini({
  apiKey,
  unmatchedLabels,
  profileKeys,
}: {
  apiKey: string;
  unmatchedLabels: string[];
  profileKeys: string[];
}): Promise<Record<string, string | null>> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  const prompt = `You are matching form field labels to a user's saved profile fields.
Available profile fields: ${profileKeys.join(", ")}
Form field labels to classify: ${JSON.stringify(unmatchedLabels)}

For each label, decide which profile field (if any) it most likely corresponds to.
Return ONLY a JSON object mapping each exact label to either one of the profile
field names above, or null if none apply. No explanation, no markdown, just JSON.
Example: {"Company website": "portfolio", "Random unrelated question": null}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}