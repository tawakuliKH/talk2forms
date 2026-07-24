import type { Session } from "@supabase/supabase-js";

// Broadcasts login state to the Talk2Forms extension's content script,
// which relays it to the background worker for the popup to read.
export function broadcastSessionToExtension(session: Session | null) {
  if (session) {
    window.postMessage(
      {
        source: "talk2forms-site",
        type: "T2F_AUTH",
        email: session.user.email,
        userId: session.user.id,
      },
      window.location.origin
    );
  } else {
    window.postMessage({ source: "talk2forms-site", type: "T2F_LOGOUT" }, window.location.origin);
  }
}