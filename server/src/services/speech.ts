const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const form = new FormData();
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "m4a" : "wav";
  form.append("file", new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "en");
  form.append("response_format", "text");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq transcription failed: ${res.status} ${errText}`);
  }

  const text = await res.text();
  return text.trim();
}
