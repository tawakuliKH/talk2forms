import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithGoogle, signUpWithEmail } from "../lib/supabaseClient";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValid = EMAIL_RE.test(email);
  const passwordValid = password.length >= 6;
  const confirmValid = confirmPassword === password && confirmPassword.length > 0;
  const canSubmit = emailValid && passwordValid && confirmValid && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const { error, data } = await signUpWithEmail(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is off, Supabase returns a session immediately.
    if (data.session) {
      navigate("/dashboard");
    } else {
      setSuccess(true);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          Talk2Forms<span>.</span>
        </div>
        <h1>Create your account</h1>
        <p className="auth-subtitle">Set up your profile once, apply everywhere.</p>

        <button type="button" className="auth-google" onClick={() => signInWithGoogle()}>
          Continue with Google
        </button>
        <div className="auth-divider">or sign up with email</div>

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

          <div className="auth-field">
            <label className="auth-label" htmlFor="confirmPassword">
              Confirm password <span className="auth-required-star">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`auth-input ${touched && !confirmValid ? "auth-input-invalid" : ""}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {touched && !confirmValid && (
              <div className="auth-field-error">Passwords must match.</div>
            )}
          </div>

          <button className="auth-submit" type="submit" disabled={!canSubmit}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        {success && (
          <div className="auth-banner auth-banner-success">
            Check your email to confirm your account, then sign in.
          </div>
        )}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}