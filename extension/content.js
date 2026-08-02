window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== "talk2forms-site") return;
  if (event.data.type === "T2F_AUTH") {
    chrome.runtime.sendMessage({ type: "T2F_AUTH", email: event.data.email, userId: event.data.userId });
  } else if (event.data.type === "T2F_LOGOUT") {
    chrome.runtime.sendMessage({ type: "T2F_LOGOUT" });
  }
});

const APP_URL = "https://talk2forms.site";
let overlayEl = null;
let fields = [];
let queue = [];
let qi = 0;
let mediaRecorder = null;
let audioChunks = [];
let recording = false;
let pageTextCache = "";
let learnedUpdates = {};

function speak(text) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(u);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Field extraction ----------

function humanize(str) {
  return str.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function findLabel(el) {
  if (el.id) {
    const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (l && l.textContent.trim()) return l.textContent.trim();
  }
  const pl = el.closest("label");
  if (pl && pl.textContent.trim()) return pl.textContent.trim();
  if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
  let node = el;
  for (let d = 0; d < 3 && node; d++) {
    const prev = node.previousElementSibling;
    if (prev && prev.textContent.trim() && prev.tagName !== "INPUT" && prev.textContent.trim().length < 60) {
      return prev.textContent.trim();
    }
    node = node.parentElement;
  }
  if (el.name) return humanize(el.name);
  if (el.id) return humanize(el.id);
  return "";
}

function findGroupLabel(name, sampleEl) {
  let container = sampleEl.closest("div") || sampleEl.parentElement;
  for (let d = 0; d < 4 && container; d++) {
    const prev = container.previousElementSibling;
    if (prev) {
      const text = prev.textContent.trim();
      if (text && text.length < 100 && !prev.querySelector("input")) {
        return text;
      }
    }
    container = container.parentElement;
  }
  return humanize(name);
}

const MAX_OPTIONS = 25;

function extractFields() {
  const seen = new Set();
  const out = [];
  let counter = 0;

  document.querySelectorAll("input, textarea, select").forEach((el) => {
    if (el.type === "hidden" || el.type === "submit" || el.type === "button") return;
    if (el.offsetParent === null) return;

    if ((el.type === "radio" || el.type === "checkbox") && el.name) {
      const groupKey = `${el.type}:${el.name}`;
      if (seen.has(groupKey)) return;
      seen.add(groupKey);
      const group = document.querySelectorAll(`input[type="${el.type}"][name="${CSS.escape(el.name)}"]`);
      const options = [];
      group.forEach((g) => {
        const optLabel = findLabel(g) || g.value;
        if (optLabel) options.push(optLabel);
      });
      const id = `t2f-field-${counter++}`;
      group.forEach((g) => g.setAttribute("data-t2f-group", id));
      out.push({ id, label: findGroupLabel(el.name, el), type: el.type, options: options.slice(0, MAX_OPTIONS), isGroup: true });
      return;
    }

    if (el.type === "file") {
      const label = findLabel(el);
      if (!label) return;
      const id = `t2f-field-${counter++}`;
      el.setAttribute("data-t2f-id", id);
      out.push({ id, label, type: "file" });
      return;
    }

    const label = findLabel(el);
    if (!label) return;
    const id = `t2f-field-${counter++}`;
    el.setAttribute("data-t2f-id", id);

    let options;
    if (el.tagName === "SELECT") {
      const all = Array.from(el.options).map((o) => o.textContent.trim()).filter(Boolean);
      options = all.length <= MAX_OPTIONS ? all : undefined;
    }

    out.push({
      id,
      label,
      placeholder: (el.placeholder || "").slice(0, 60),
      type: el.tagName === "SELECT" ? "select" : el.type || "text",
      options,
    });
  });

  return out;
}

function fillField(id, value, isGroup) {
  if (isGroup) {
    document.querySelectorAll(`[data-t2f-group="${id}"]`).forEach((el) => {
      const label = el.closest("label")?.textContent.trim() || el.value;
      if (label && value.includes(label)) {
        el.checked = true;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    return;
  }
  const el = document.querySelector(`[data-t2f-id="${id}"]`);
  if (!el) return;
  if (el.tagName === "SELECT") {
    const opt = Array.from(el.options).find((o) => o.textContent.trim() === value);
    if (opt) el.value = opt.value;
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.style.outline = "2px solid #cfff57";
  el.style.outlineOffset = "2px";
}

// ---------- Overlay shell ----------

const OVERLAY_CSS = `
#t2f-overlay { position: fixed; top: 20px; right: 20px; width: 380px; height: 80vh; max-height: 640px;
  z-index: 2147483647; font-family: "Inter", system-ui, sans-serif; box-shadow: 0 20px 50px -12px rgba(0,0,0,0.35); border-radius: 20px; }
#t2f-overlay * { box-sizing: border-box; }
.t2f-card { background: #fff; border-radius: 20px; padding: 20px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.t2f-main { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.t2f-top-fixed { flex-shrink: 0; }
.t2f-bottom-fixed { flex-shrink: 0; padding-top: 10px; border-top: 1px solid #e4e7e0; background: #fff; }
.t2f-overlay-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
.t2f-logo { font-family:"Bricolage Grotesque",sans-serif; font-weight:800; font-size:1.05rem; color:#16201c; }
.t2f-logo span { background:#cfff57; border-radius:3px; padding:0 4px; }
.t2f-close-btn { width:26px;height:26px;border-radius:50%;border:none;background:#f3f5f0;color:#16201c;font-size:0.95rem;cursor:pointer; }
.t2f-status { font-size:0.82rem; color:#6b7a70; margin:0 0 12px; text-align:center; }
.t2f-status-error { color:#b32d2d; } .t2f-status-done { color:#2c7a34; font-weight:700; }
.t2f-email { font-weight:700; color:#16201c; }
.t2f-btn { display:block; width:100%; text-align:center; padding:12px; border-radius:12px; border:none; background:#16201c; color:#f7f8f4;
  font-weight:600; font-size:0.86rem; text-decoration:none; cursor:pointer; font-family:inherit; }
.t2f-btn:disabled { background:#c3c9c1; cursor:not-allowed; }
.t2f-btn-secondary { background:#f3f5f0; border:1px solid #e4e7e0; color:#16201c; margin-top:10px; }
.t2f-btn-interview { background:#cfff57; color:#16201c; border:1px solid #b8e63e; margin-top:10px; font-weight:700; }
.t2f-btn-interview:hover:not(:disabled) { background:#c2f542; }
.t2f-btn-interview:disabled { background:#e8ecdf; color:#9aa39d; border-color:#e4e7e0; }
.t2f-topic-box { background:linear-gradient(135deg,#f3ffcf,#edefea); border-radius:14px; padding:12px 14px; margin:14px 0; }
.t2f-topic-label { font-size:0.66rem; text-transform:uppercase; color:#6b7a70; font-weight:700; margin:0 0 3px; }
.t2f-topic { font-size:0.84rem; color:#16201c; margin:0; font-weight:600; }
.t2f-field-list { flex: 1; min-height: 0; overflow-y: auto; margin: 14px 0; display: flex; flex-direction: column; gap: 6px; }
.t2f-field { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:11px 13px; border-radius:12px; border:1px solid #e4e7e0; background:#fafbf9; font-size:0.79rem; }
.t2f-field-label { font-weight:600; max-width:48%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.t2f-field-status { font-size:0.72rem; font-weight:700; padding:4px 9px; border-radius:20px; max-width:55%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.t2f-status-ready { background:#e5f6e6; color:#2c7a34; } .t2f-status-missing { background:#fdecec; color:#b32d2d; } .t2f-status-skip { background:#f3f5f0; color:#9aa39d; }
#interviewPanel { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
#interviewStep { flex: 1; min-height: 0; overflow-y: auto; }
.t2f-iv-header { flex-shrink: 0; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.t2f-iv-progress { font-family:"JetBrains Mono",monospace; font-size:0.7rem; color:#9aa39d; }
.t2f-back-btn { width: 26px; height: 26px; border-radius: 50%; border: none; background: #f3f5f0; color: #16201c; font-size: 1.1rem; line-height: 1; cursor: pointer; }
.t2f-back-btn:hover:not(:disabled) { background: #edefea; }
.t2f-back-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.t2f-iv-label { font-weight:700; font-size:1rem; margin:0 0 6px; }
.t2f-iv-hint { font-size:0.82rem; color:#6b7a70; margin:0 0 12px; }
.t2f-iv-input { width:100%; padding:10px 12px; border:1px solid #d6dad1; border-radius:10px; font-size:0.85rem; font-family:inherit; margin:0 0 12px; }
.t2f-iv-editable { width:100%; min-height:100px; padding:10px 12px; border:1px solid #d6dad1; border-radius:10px; font-size:0.84rem; font-family:inherit; margin:0 0 12px; }
.t2f-iv-actions { display:flex; gap:6px; flex-wrap: wrap; }
.t2f-iv-actions .t2f-btn { flex: 1 1 calc(50% - 4px); min-width: 110px; padding: 9px 10px; font-size: 0.78rem; }
.t2f-voice-status { font-size:0.74rem; color:#6b7a70; font-style:italic; font-weight:400; text-align:center; margin:10px 0 0; min-height:16px; }
.t2f-btn-link { display:block; width:100%; text-align:center; background:none; border:none; color:#9aa39d; font-size:0.76rem; cursor:pointer; padding:8px 0 0; }
.t2f-file-note { font-size: 0.82rem; color: #6b7a70; background: #f3f5f0; border-radius: 10px; padding: 12px; margin-bottom: 14px; }
`;

function injectStyles() {
  if (document.getElementById("t2f-overlay-style")) return;
  const style = document.createElement("style");
  style.id = "t2f-overlay-style";
  style.textContent = OVERLAY_CSS;
  document.head.appendChild(style);
}

async function toggleOverlay() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
    speechSynthesis.cancel();
    if (mediaRecorder && recording) {
      try { mediaRecorder.stop(); } catch (e) {}
    }
    return;
  }
  injectStyles();
  overlayEl = document.createElement("div");
  overlayEl.id = "t2f-overlay";
  document.body.appendChild(overlayEl);
  await renderRoot();
}

async function renderRoot() {
  const { t2f_session } = await chrome.storage.local.get("t2f_session");

  if (!t2f_session || !t2f_session.email) {
    overlayEl.innerHTML = `
      <div class="t2f-card">
        <div class="t2f-overlay-header">
          <span class="t2f-logo">Talk2Forms<span>.</span></span>
          <button class="t2f-close-btn" id="t2fClose">×</button>
        </div>
        <p class="t2f-status">You're not signed in yet.</p>
        <a class="t2f-btn" href="${APP_URL}/login" target="_blank">Sign in</a>
      </div>`;
    overlayEl.querySelector("#t2fClose").onclick = toggleOverlay;
    return;
  }

  overlayEl.innerHTML = `
    <div class="t2f-card">
      <div class="t2f-overlay-header">
        <span class="t2f-logo">Talk2Forms<span>.</span></span>
        <button class="t2f-close-btn" id="t2fClose">×</button>
      </div>
      <div id="mainView" class="t2f-main">
        <div class="t2f-top-fixed">
          <p class="t2f-status">Signed in as<br /><span class="t2f-email">${escapeHtml(t2f_session.email)}</span></p>
          <button class="t2f-btn" id="scanBtn">Scan this page</button>
          <div class="t2f-topic-box" id="topicBox" style="display:none;"></div>
        </div>
        <div class="t2f-field-list" id="fieldList"></div>
        <div class="t2f-bottom-fixed">
          <button class="t2f-btn t2f-btn-interview" id="interviewBtn" style="display:none;" disabled>🎤 Start interview</button>
          <a class="t2f-btn t2f-btn-secondary" href="${APP_URL}/dashboard" target="_blank">Open dashboard</a>
        </div>
      </div>
      <div id="interviewPanel" style="display:none;">
        <div class="t2f-iv-header">
          <button class="t2f-back-btn" id="backBtn" title="Previous field">‹</button>
          <span id="ivProgress" class="t2f-iv-progress"></span>
          <span style="width:22px;"></span>
        </div>
        <div id="interviewStep"></div>
      </div>
    </div>`;

  overlayEl.querySelector("#t2fClose").onclick = toggleOverlay;
  overlayEl.querySelector("#scanBtn").onclick = handleScan;
  overlayEl.querySelector("#interviewBtn").onclick = () => {
    document.getElementById("interviewPanel").style.display = "block";
    document.getElementById("mainView").style.display = "none";
    qi = 0;
    nextInQueue();
  };
}

function statusPill(f) {
  if (f.status === "skip") {
    if (f.type === "file") return `<span class="t2f-field-status t2f-status-skip">📎 Upload manually</span>`;
    return `<span class="t2f-field-status t2f-status-skip">— Not tracked</span>`;
  }
  if (f.status === "ready") return `<span class="t2f-field-status t2f-status-ready">✓ ${escapeHtml(f.value)}</span>`;
  return `<span class="t2f-field-status t2f-status-missing">● Missing</span>`;
}

function renderFieldList() {
  document.getElementById("fieldList").innerHTML = fields
    .map((f) => `<div class="t2f-field"><span class="t2f-field-label">${escapeHtml(f.label)}</span>${statusPill(f)}</div>`)
    .join("");
}

async function handleScan() {
  const fieldListEl = document.getElementById("fieldList");
  fieldListEl.innerHTML = `<p class="t2f-status">⏳ Analyzing the form with AI…</p>`;
  document.getElementById("interviewBtn").style.display = "none";
  learnedUpdates = {};

  const extracted = extractFields();
  pageTextCache = document.body.innerText.slice(0, 1200);

  if (extracted.length === 0) {
    fieldListEl.innerHTML = `<p class="t2f-status">No recognizable fields found.</p>`;
    return;
  }

  const { t2f_session } = await chrome.storage.local.get("t2f_session");
  const { ok, body } = await chrome.runtime.sendMessage({
    type: "T2F_ANALYZE",
    payload: { email: t2f_session.email, pageText: pageTextCache, fields: extracted },
  });

  if (!ok) {
    fieldListEl.innerHTML = `<p class="t2f-status t2f-status-error">${escapeHtml(body.error || "Could not analyze this page.")}</p>`;
    return;
  }

  const extractedById = Object.fromEntries(extracted.map((f) => [f.id, f]));
  fields = body.results.map((r) => {
    const orig = extractedById[r.id] || {};
    return {
      ...r,
      type: orig.type,
      options: orig.options,
      isGroup: orig.isGroup,
      status: orig.type === "file" ? "skip" : r.status,
    };
  });
  renderFieldList();

  const topicBox = document.getElementById("topicBox");
  topicBox.innerHTML = `<p class="t2f-topic-label">This page is about</p><p class="t2f-topic">${escapeHtml(body.topic)}</p>`;
  topicBox.style.display = "block";

  queue = fields.map((_, i) => i).filter((i) => fields[i].status !== "skip");
  qi = 0;

  const interviewBtn = document.getElementById("interviewBtn");
  interviewBtn.disabled = queue.length === 0;
  interviewBtn.style.display = "block";

  const closing = queue.length > 0
    ? " Let's start the interview to fill out this form — press Start interview whenever you're ready."
    : "";
  speak(body.intro + closing);
}

// ---------- Interview flow ----------

async function nextInQueue() {
  const backBtn = document.getElementById("backBtn");
  backBtn.disabled = qi === 0;
  backBtn.onclick = () => {
    if (qi > 0) {
      speechSynthesis.cancel();
      qi--;
      nextInQueue();
    }
  };

  if (qi >= queue.length) {
    document.getElementById("interviewStep").innerHTML = `<p class="t2f-status t2f-status-done">✓ All fields reviewed</p>`;
    speak("All done. Your form is ready to review and submit.");
    submitLearnedUpdates();
    return;
  }

  const field = fields[queue[qi]];
  const stepEl = document.getElementById("interviewStep");
  document.getElementById("ivProgress").textContent = `Field ${qi + 1} of ${queue.length}`;

  if (field.type === "file") {
    stepEl.innerHTML = `
      <p class="t2f-iv-label">${escapeHtml(field.label)}</p>
      <p class="t2f-file-note">Please upload your file directly on the page using this field's own upload button — Talk2Forms can't attach files for you.</p>
      <div class="t2f-iv-actions">
        <button class="t2f-btn" id="skipBtn">Next field →</button>
      </div>`;
    speak(`For ${field.label}, please upload the file directly on the page. I can't do that part for you.`);
    document.getElementById("skipBtn").onclick = () => advanceQueue();
    return;
  }

  if (field.type === "textarea") {
    renderTextareaCapture(field, field.status === "ready" ? field.value : null, null);
    if (field.status === "ready") {
      speak(`For ${field.label}, I have: ${field.value}. Do you want me to use this, or is there anything you'd like to add or change? Feel free to talk to me.`);
    } else {
      speak(`Tell me about your ${field.label}. Press start recording when ready, or skip it.`);
    }
    return;
  }

  const isChoice = field.options && field.options.length > 0;
  if (field.status === "ready" && isChoice) {
    stepEl.innerHTML = `
      <p class="t2f-iv-label">${escapeHtml(field.label)}</p>
      <p class="t2f-iv-hint">${escapeHtml(field.value)}</p>
      <div class="t2f-iv-actions">
        <button class="t2f-btn" id="acceptBtn">Use this ✓</button>
        <button class="t2f-btn t2f-btn-secondary" id="skipBtn">Skip</button>
      </div>`;
    document.getElementById("acceptBtn").onclick = () => { speechSynthesis.cancel(); confirmField(field, field.value); };
    document.getElementById("skipBtn").onclick = () => { speechSynthesis.cancel(); advanceQueue(); };
    speak(`For ${field.label}, I have: ${field.value}. Should I use this?`);
    return;
  }

  renderSimpleCapture(field, field.status === "ready" ? field.value : "");
  if (field.status === "ready") {
    speak(`For ${field.label}, I have: ${field.value}. You can edit it if you'd like, or use this as is.`);
  } else {
    speak(`Tell me about your ${field.label}. Press start recording when ready, or skip it.`);
  }
}

function renderSimpleCapture(field, initialValue) {
  const stepEl = document.getElementById("interviewStep");
  const hasValue = Boolean(initialValue);
  stepEl.innerHTML = `
    <p class="t2f-iv-label">${escapeHtml(field.label)}</p>
    <input type="text" class="t2f-iv-input" id="editableInput" value="${escapeHtml(initialValue)}" placeholder="Type or record your answer…" />
    <div class="t2f-iv-actions">
      <button class="t2f-btn" id="useThisBtn" ${hasValue ? "" : "disabled"}>Use this ✓</button>
      <button class="t2f-btn t2f-btn-secondary" id="recBtn">🎙️ Start recording</button>
      <button class="t2f-btn t2f-btn-secondary" id="stopRecBtn" disabled>Done recording</button>
      <button class="t2f-btn t2f-btn-secondary" id="skipBtn">Skip</button>
    </div>
    <p class="t2f-voice-status" id="voiceStatus"></p>`;

  const input = document.getElementById("editableInput");
  const useThisBtn = document.getElementById("useThisBtn");
  input.addEventListener("input", () => { useThisBtn.disabled = !input.value.trim(); });

  useThisBtn.onclick = () => {
    if (!input.value.trim()) return;
    speechSynthesis.cancel();
    confirmField(field, input.value.trim());
  };
  document.getElementById("skipBtn").onclick = () => { speechSynthesis.cancel(); advanceQueue(); };

  wireRecordButtons(field, (transcript) => processSimpleAnswer(field, transcript));
}

function renderTextareaCapture(field, draft, lastSaid) {
  const stepEl = document.getElementById("interviewStep");
  const hasDraft = Boolean(draft);

  stepEl.innerHTML = `
    <p class="t2f-iv-label">${escapeHtml(field.label)}</p>
    ${
      hasDraft
        ? `<textarea class="t2f-iv-editable" id="editableAnswer">${escapeHtml(draft)}</textarea>`
        : `<p class="t2f-iv-hint">This one's missing — tell me about it in your own words.</p>`
    }
    <div class="t2f-iv-actions">
      <button class="t2f-btn" id="useThisBtn" ${hasDraft ? "" : "disabled"}>Use this ✓</button>
      <button class="t2f-btn t2f-btn-secondary" id="recBtn">🎙️ Start recording</button>
      <button class="t2f-btn t2f-btn-secondary" id="stopRecBtn" disabled>Done recording</button>
      <button class="t2f-btn t2f-btn-secondary" id="skipBtn">Skip</button>
    </div>
    <p class="t2f-voice-status" id="voiceStatus">${lastSaid ? `You said: "${escapeHtml(lastSaid)}"` : ""}</p>`;

  const useThisBtn = document.getElementById("useThisBtn");
  if (hasDraft) {
    const textarea = document.getElementById("editableAnswer");
    textarea.addEventListener("input", () => { useThisBtn.disabled = !textarea.value.trim(); });
  }

  useThisBtn.onclick = () => {
    if (!hasDraft) return;
    speechSynthesis.cancel();
    const finalValue = document.getElementById("editableAnswer").value;
    confirmField(field, finalValue);
  };
  document.getElementById("skipBtn").onclick = () => { speechSynthesis.cancel(); advanceQueue(); };

  const currentDraft = () => (hasDraft ? document.getElementById("editableAnswer").value : null);
  wireRecordButtons(field, (transcript) => processTextareaAnswer(field, transcript, currentDraft()));
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// All transient states (Listening / Transcribing / Thinking / "You said") are
// written into the SAME #voiceStatus element, so nothing jumps position.
function wireRecordButtons(field, onTranscript) {
  const recBtn = document.getElementById("recBtn");
  const stopBtn = document.getElementById("stopRecBtn");
  const voiceStatusEl = document.getElementById("voiceStatus");

  recBtn.onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.start();
      recording = true;
      recBtn.disabled = true;
      stopBtn.disabled = false;
      recBtn.textContent = "🔴 Recording…";
      voiceStatusEl.textContent = "🎙️ Listening…";
    } catch (err) {
      voiceStatusEl.textContent = "Microphone access was denied or unavailable.";
    }
  };

  stopBtn.onclick = async () => {
    if (!mediaRecorder || !recording) return;

    const stopped = new Promise((resolve) => {
      mediaRecorder.onstop = resolve;
    });
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    await stopped;
    recording = false;

    recBtn.disabled = false;
    stopBtn.disabled = true;
    recBtn.textContent = recBtn.textContent.includes("Add") ? "🎙️ Add / change" : "🎙️ Start recording";
    voiceStatusEl.textContent = "🤖 Transcribing…";

    if (audioChunks.length === 0) {
      voiceStatusEl.textContent = "Didn't catch anything — try again.";
      return;
    }

    try {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const audioBase64 = await blobToBase64(blob);

      const { ok, body } = await chrome.runtime.sendMessage({
        type: "T2F_TRANSCRIBE",
        payload: { audioBase64, mimeType: "audio/webm" },
      });

      if (!ok || !body?.text) {
        voiceStatusEl.textContent = "Couldn't transcribe that — try again.";
        return;
      }

      voiceStatusEl.textContent = "🤖 Thinking…";
      await onTranscript(body.text);
    } catch (err) {
      voiceStatusEl.textContent = "Something went wrong — try again.";
    }
  };
}

async function processSimpleAnswer(field, rawAnswer) {
  const { t2f_session } = await chrome.storage.local.get("t2f_session");

  try {
    const { ok, body } = await chrome.runtime.sendMessage({
      type: "T2F_INTERVIEW_ANSWER",
      payload: { email: t2f_session.email, fieldLabel: field.label, fieldType: field.type, options: field.options, pageContext: pageTextCache, rawAnswer },
    });

    if (!ok) {
      const voiceStatusEl = document.getElementById("voiceStatus");
      if (voiceStatusEl) voiceStatusEl.innerHTML = `<span class="t2f-status-error">${escapeHtml(body?.error || "Something went wrong.")}</span>`;
      return;
    }

    renderSimpleCapture(field, body.answer);
    // Show the raw transcript in the same fixed slot, right where it belongs.
    document.getElementById("voiceStatus").textContent = `You said: "${rawAnswer}"`;
    speak(`Here's what I'll put: ${body.answer}. You can edit it, or use this as is.`);
  } catch (err) {
    const voiceStatusEl = document.getElementById("voiceStatus");
    if (voiceStatusEl) voiceStatusEl.innerHTML = `<span class="t2f-status-error">Error: ${escapeHtml(err.message || String(err))}</span>`;
  }
}

async function processTextareaAnswer(field, rawAnswer, previousDraft) {
  const { t2f_session } = await chrome.storage.local.get("t2f_session");

  try {
    const { ok, body } = await chrome.runtime.sendMessage({
      type: "T2F_INTERVIEW_ANSWER",
      payload: {
        email: t2f_session.email,
        fieldLabel: field.label,
        fieldType: field.type,
        pageContext: pageTextCache,
        rawAnswer,
        previousDraft: previousDraft || undefined,
      },
    });

    if (!ok) {
      const voiceStatusEl = document.getElementById("voiceStatus");
      if (voiceStatusEl) voiceStatusEl.innerHTML = `<span class="t2f-status-error">${escapeHtml(body?.error || "Something went wrong.")}</span>`;
      return;
    }

    renderTextareaCapture(field, body.answer, rawAnswer);
    speak(`Here's the draft: ${body.answer}. Do you want me to use this, or is there anything you'd like to add or change? Feel free to talk to me.`);
  } catch (err) {
    const voiceStatusEl = document.getElementById("voiceStatus");
    if (voiceStatusEl) voiceStatusEl.innerHTML = `<span class="t2f-status-error">Error: ${escapeHtml(err.message || String(err))}</span>`;
  }
}

function confirmField(field, value) {
  fillField(field.id, value, !!field.isGroup);
  field.status = "ready";
  field.value = value;
  if (field.profileField) {
    learnedUpdates[field.profileField] = value;
  }
  renderFieldList();
  advanceQueue();
}

function advanceQueue() {
  qi++;
  nextInQueue();
}

async function submitLearnedUpdates() {
  if (Object.keys(learnedUpdates).length === 0) return;
  const { t2f_session } = await chrome.storage.local.get("t2f_session");
  try {
    await chrome.runtime.sendMessage({
      type: "T2F_LEARN",
      payload: { email: t2f_session.email, updates: learnedUpdates },
    });
  } catch (err) {
    console.error("[Talk2Forms] failed to save learned info:", err);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "T2F_TOGGLE_OVERLAY") toggleOverlay();
});
