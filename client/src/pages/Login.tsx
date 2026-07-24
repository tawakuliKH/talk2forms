import { useState } from "react";
import { Link } from "react-router-dom";
import { signInWithGoogle, signInWithEmail } from "../lib/supabaseClient";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = EMAIL_RE.test(email);
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          Talk2Forms<span>.</span>
        </div>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue to your profile.</p>

        <button type="button" className="auth-google" onClick={() => signInWithGoogle()}>
          <svg width="18" height="18" viewBox="0 0 24 24" className="auth-google-icon">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        <div className="auth-divider">or sign in with email</div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              Email <span className="auth-required-star">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={`auth-input ${touched && !emailValid ? "auth-input-invalid" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {touched && !emailValid && (
              <div className="auth-field-error">Enter a valid email address.</div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              Password <span className="auth-required-star">*</span>
            </label>
            <input
              id="password"
              type="password"
              className={`auth-input ${touched && !passwordValid ? "auth-input-invalid" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {touched && !passwordValid && (
              <div className="auth-field-error">Password must be at least 6 characters.</div>
            )}
          </div>

          <button className="auth-submit" type="submit" disabled={!canSubmit}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {error && <div className="auth-banner auth-banner-error">{error}</div>}

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}