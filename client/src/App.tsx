import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import Login from "./pages/Login";
import CompleteProfile from "./pages/CompleteProfile";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/profile" /> : <Login />} />
      <Route
        path="/profile"
        element={session ? <CompleteProfile session={session} /> : <Navigate to="/login" />}
      />
      <Route path="*" element={<Navigate to={session ? "/profile" : "/login"} />} />
    </Routes>
  );
}
