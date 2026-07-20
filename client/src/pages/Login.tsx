import { useState } from "react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = mode === "signin"
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password);
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Welcome</h1>
        <p className="subtitle">Sign in to complete your profile.</p>

        <button className="google" onClick={() => signInWithGoogle()}>
          Continue with Google
        </button>

        <div className="divider">or</div>

        <form onSubmit={handleEmailSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {error && <div className="status error">{error}</div>}

        <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === "signin" ? "signup" : "signin"); }}>
            {mode === "signin" ? "Sign up" : "Sign in"}
          </a>
        </p>
      </div>
    </div>
  );
}
