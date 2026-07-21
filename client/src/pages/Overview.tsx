import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

interface Props {
  session: Session;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

interface UserData {
  name: string;
  lastname: string;
  profileComplete: boolean;
  geminiApiKey: string | null;
  aiResume?: { resume: string } | null;
}

export default function Overview({ session }: Props) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/users/by-email/${encodeURIComponent(session.user.email!)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setUser(body?.user || null))
      .finally(() => setLoading(false));
  }, [session.user.email]);

  const hasResume = Boolean(user?.aiResume);
  const hasKey = Boolean(user?.geminiApiKey);

  return (
    <div>
      <p className="ov-eyebrow">Overview</p>
      <h1 className="ov-title">
        {loading ? "Welcome" : user ? `Welcome back, ${user.name}` : "Welcome"}
      </h1>
      <p className="ov-subtitle">Here's a quick look at your Talk2Forms account.</p>

      <div className="ov-grid">
        <Link to="/dashboard/profile" className="ov-card ov-card-clickable">
          <span className={`ov-icon ${user?.profileComplete ? "ov-icon-good" : "ov-icon-warn"}`}>
            {user?.profileComplete ? "✓" : "!"}
          </span>
          <p className="ov-card-label">Profile status</p>
          <p className="ov-card-value">{loading ? "…" : user?.profileComplete ? "Complete" : "Incomplete"}</p>
          <p className="ov-card-action">Edit profile →</p>
        </Link>

        {!loading && !hasResume ? (
          <Link to="/dashboard/profile" className="ov-card ov-card-clickable">
            <span className={`ov-icon ${hasKey ? "ov-icon-warn" : "ov-icon-neutral"}`}>
              {hasKey ? "…" : "＋"}
            </span>
            <p className="ov-card-label">AI resume summary</p>
            <p className="ov-card-value">Not yet generated</p>
            <p className="ov-card-action">
              {hasKey ? "Save your profile to generate it →" : "Add a Gemini API key →"}
            </p>
          </Link>
        ) : (
          <button
            type="button"
            className="ov-card ov-card-clickable ov-card-button"
            onClick={() => setShowResume((v) => !v)}
          >
            <span className="ov-icon ov-icon-good">✓</span>
            <p className="ov-card-label">AI resume summary</p>
            <p className="ov-card-value">Generated</p>
            <p className="ov-card-action">{showResume ? "Hide summary ↑" : "View summary →"}</p>
          </button>
        )}
      </div>

      {showResume && hasResume && (
        <div className="ov-resume-card">
          <p className="ov-card-label">Your AI-generated summary</p>
          <p className="ov-resume-text">{user!.aiResume!.resume}</p>
        </div>
      )}

      <p className="ov-section-label">Quick actions</p>
      <div className="ov-actions">
        <Link to="/dashboard/profile" className="ov-action">
          <span className="ov-action-icon">✎</span>
          <div>
            <p className="ov-action-title">Edit profile</p>
            <p className="ov-action-sub">Update your info, links, and CV</p>
          </div>
        </Link>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="ov-action">
          <span className="ov-action-icon">🔑</span>
          <div>
            <p className="ov-action-title">Get a Gemini API key</p>
            <p className="ov-action-sub">Free — opens Google AI Studio</p>
          </div>
        </a>
        <Link to="/" className="ov-action">
          <span className="ov-action-icon">⌂</span>
          <div>
            <p className="ov-action-title">Back to homepage</p>
            <p className="ov-action-sub">See the Talk2Forms landing page</p>
          </div>
        </Link>
      </div>
    </div>
  );
}