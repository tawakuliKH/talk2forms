const API_URL = "http://localhost:8787";

chrome.runtime.onInstalled.addListener(async () => {
  const { t2f_device_id } = await chrome.storage.local.get("t2f_device_id");
  if (!t2f_device_id) {
    await chrome.storage.local.set({ t2f_device_id: crypto.randomUUID() });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: "T2F_TOGGLE_OVERLAY" });
});

async function proxyFetch(path, payload) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "T2F_AUTH") {
    chrome.storage.local.set({ t2f_session: { email: message.email, userId: message.userId } });
    return;
  }
  if (message.type === "T2F_LOGOUT") {
    chrome.storage.local.remove("t2f_session");
    return;
  }
  if (message.type === "T2F_ANALYZE") {
    proxyFetch("/api/forms/analyze", message.payload).then(sendResponse);
    return true;
  }
  if (message.type === "T2F_INTERVIEW_ANSWER") {
    proxyFetch("/api/forms/interview-answer", message.payload).then(sendResponse);
    return true;
  }
});
