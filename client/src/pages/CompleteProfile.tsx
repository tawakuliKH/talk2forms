import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { signOut } from "../lib/supabaseClient";

interface Props {
  session: Session;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

export default function CompleteProfile({ session }: Props) {
  const [form, setForm] = useState({
    name: "",
    lastname: "",
    whatsapp: "",
    linkedin: "",
    portfolio: "",
    github: "",
    cvText: "",
    geminiApiKey: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          ...form,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.formErrors?.join(", ") || "Could not save profile");
      }

      // The server responds right away and generates the AI resume summary
      // in the background — no need to wait for it here.
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Complete your profile</h1>
        <p className="subtitle">Signed in as {session.user.email}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">First name</label>
          <input id="name" type="text" required value={form.name} onChange={(e) => update("name", e.target.value)} />

          <label htmlFor="lastname">Last name</label>
          <input
            id="lastname"
            type="text"
            required
            value={form.lastname}
            onChange={(e) => update("lastname", e.target.value)}
          />

          <label htmlFor="whatsapp">WhatsApp number</label>
          <input id="whatsapp" type="text" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />

          <label htmlFor="linkedin">LinkedIn profile (optional)</label>
          <input
            id="linkedin"
            type="url"
            placeholder="https://linkedin.com/in/..."
            value={form.linkedin}
            onChange={(e) => update("linkedin", e.target.value)}
          />

          <label htmlFor="portfolio">Portfolio (optional)</label>
          <input
            id="portfolio"
            type="url"
            placeholder="https://..."
            value={form.portfolio}
            onChange={(e) => update("portfolio", e.target.value)}
          />

          <label htmlFor="github">GitHub profile (optional)</label>
          <input
            id="github"
            type="url"
            placeholder="https://github.com/..."
            value={form.github}
            onChange={(e) => update("github", e.target.value)}
          />

          <label htmlFor="cvText">Paste your CV</label>
          <textarea
            id="cvText"
            placeholder="Paste the full text of your CV here…"
            value={form.cvText}
            onChange={(e) => update("cvText", e.target.value)}
          />

          <label htmlFor="geminiApiKey">Your Gemini API key</label>
          <input
            id="geminiApiKey"
            type="text"
            placeholder="AIza…"
            value={form.geminiApiKey}
            onChange={(e) => update("geminiApiKey", e.target.value)}
          />
          <p className="hint">
            Needed so the AI features run on your own key, not ours.{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
              Get a free key here
            </a>{" "}
            — open the link, click "Create API key", and paste it above.
          </p>

          <button className="primary" type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Save profile"}
          </button>
        </form>

        {status === "saved" && (
          <div className="status success">
            Profile saved! We're generating your AI resume summary in the background.
          </div>
        )}
        {status === "error" && errorMsg && <div className="status error">{errorMsg}</div>}

        <p className="hint" style={{ marginTop: 24, textAlign: "center" }}>
          <a href="#" onClick={(e) => { e.preventDefault(); signOut(); }}>
            Sign out
          </a>
        </p>
      </div>
    </div>
  );
}
