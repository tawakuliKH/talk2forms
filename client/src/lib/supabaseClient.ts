const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

export interface Session {
  user: { id: string; email: string };
}

export async function getSession(): Promise<Session | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
  if (!res.ok) return null;
  const body = await res.json();
  return body.user ? { user: body.user } : null;
}

export function signInWithGoogle() {
  window.location.href = `${API_URL}/api/auth/google`;
}

export async function signInWithEmail(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) return { error: { message: body.error || "Could not sign in." } };
  window.dispatchEvent(new CustomEvent("t2f-auth-changed"));
  return { error: null, data: { session: { user: body.user } } };
}

export async function signUpWithEmail(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) return { error: { message: body.error || "Could not create account." } };
  window.dispatchEvent(new CustomEvent("t2f-auth-changed"));
  return { error: null, data: { session: { user: body.user } } };
}

export async function signOut() {
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
  window.dispatchEvent(new CustomEvent("t2f-auth-changed"));
}
