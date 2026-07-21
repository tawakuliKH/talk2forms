import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

interface Props {
  session: Session;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

interface FormState {
  name: string;
  lastname: string;
  whatsapp: string;
  linkedin: string;
  portfolio: string;
  github: string;
  cvText: string;
  geminiApiKey: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  lastname: "",
  whatsapp: "",
  linkedin: "",
  portfolio: "",
  github: "",
  cvText: "",
  geminiApiKey: "",
};

export default function Profile({ session }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [touched, setTouched] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `${API_BASE}/api/users/by-email/${encodeURIComponent(session.user.email!)}`
        );
        if (res.ok) {
          const body = await res.json();
          if (!cancelled && body.user) {
            setForm({
              name: body.user.name || "",
              lastname: body.user.lastname || "",
              whatsapp: body.user.whatsapp || "",
              linkedin: body.user.linkedin || "",
              portfolio: body.user.portfolio || "",
              github: body.user.github || "",
              cvText: body.user.cvText || "",
              geminiApiKey: body.user.geminiApiKey || "",
            });
          }
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session.user.email]);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const nameValid = form.name.trim().length > 0;
  const lastnameValid = form.lastname.trim().length > 0;
  const canSubmit = nameValid && lastnameValid && saveStatus !== "saving";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nameValid || !lastnameValid) return;

    setSaveStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email, ...form }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.formErrors?.join(", ") || "Could not save profile");
      }
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (loadingProfile) return <p className="dash-save-status">Loading your profile…</p>;

  return (
    <div>
      <h1 className="dash-title">Your profile</h1>
      <p className="dash-subtitle">Signed in as {session.user.email}</p>

      <div className="dash-card">
        <form onSubmit={handleSubmit} noValidate>
          <p className="dash-section-label">Basic info</p>
          <div className="dash-row">
            <div className="auth-field">
              <label className="auth-label" htmlFor="name">
                First name <span className="auth-required-star">*</span>
              </label>
              <input
                id="name"
                type="text"
                className={`auth-input ${touched && !nameValid ? "auth-input-invalid" : ""}`}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
              {touched && !nameValid && <div className="auth-field-error">First name is required.</div>}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="lastname">
                Last name <span className="auth-required-star">*</span>
              </label>
              <input
                id="lastname"
                type="text"
                className={`auth-input ${touched && !lastnameValid ? "auth-input-invalid" : ""}`}
                value={form.lastname}
                onChange={(e) => update("lastname", e.target.value)}
              />
              {touched && !lastnameValid && <div className="auth-field-error">Last name is required.</div>}
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="whatsapp">WhatsApp number</label>
            <input id="whatsapp" type="text" className="auth-input" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
          </div>

          <p className="dash-section-label">Links (optional)</p>
          <div className="auth-field">
            <label className="auth-label" htmlFor="linkedin">LinkedIn</label>
            <input id="linkedin" type="url" placeholder="https://linkedin.com/in/..." className="auth-input" value={form.linkedin} onChange={(e) => update("linkedin", e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="portfolio">Portfolio</label>
            <input id="portfolio" type="url" placeholder="https://..." className="auth-input" value={form.portfolio} onChange={(e) => update("portfolio", e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="github">GitHub</label>
            <input id="github" type="url" placeholder="https://github.com/..." className="auth-input" value={form.github} onChange={(e) => update("github", e.target.value)} />
          </div>

          <p className="dash-section-label">CV</p>
          <div className="auth-field">
            <textarea className="dash-textarea" placeholder="Paste the full text of your CV here…" value={form.cvText} onChange={(e) => update("cvText", e.target.value)} />
          </div>

          <p className="dash-section-label">AI settings</p>
          <div className="auth-field">
            <label className="auth-label" htmlFor="geminiApiKey">Gemini API key</label>
            <input id="geminiApiKey" type="text" placeholder="AIza…" className="auth-input" value={form.geminiApiKey} onChange={(e) => update("geminiApiKey", e.target.value)} />
          </div>

          <div className="dash-save-bar">
            <button className="dash-save-btn" type="submit" disabled={!canSubmit}>
              {saveStatus === "saving" ? "Saving…" : "Save profile"}
            </button>
            {saveStatus === "saved" && <span className="dash-save-status">Saved. Your AI resume is updating in the background.</span>}
            {saveStatus === "error" && errorMsg && <span className="dash-save-status dash-save-status-error">{errorMsg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}