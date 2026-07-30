import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { getSession, type Session } from "./lib/supabaseClient";
import { broadcastSessionToExtension } from "./lib/extensionBridge";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "./pages/DashboardLayout";
import Overview from "./pages/Overview";
import Profile from "./pages/Profile";
import GeminiKeyGuide from "./pages/GeminiKeyGuide";
import PrivacyPolicy from "./pages/PrivacyPolicy";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshSession() {
    const s = await getSession();
    setSession(s);
    broadcastSessionToExtension(s as any);
  }

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
    window.addEventListener("t2f-auth-changed", refreshSession);
    return () => window.removeEventListener("t2f-auth-changed", refreshSession);
  }, []);

  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={<Landing session={session} />} />
      <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/signup" element={session ? <Navigate to="/dashboard" /> : <Signup />} />
      <Route path="/gemini-key-guide" element={<GeminiKeyGuide />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route
        path="/dashboard"
        element={session ? <DashboardLayout session={session} /> : <Navigate to="/login" />}
      >
        <Route index element={<Overview session={session!} />} />
        <Route path="profile" element={<Profile session={session!} />} />
      </Route>
      <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} />} />
    </Routes>
  );
}
