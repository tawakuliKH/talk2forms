window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== "talk2forms-site") return;
  if (event.data.type === "T2F_AUTH") {
    chrome.runtime.sendMessage({ type: "T2F_AUTH", email: event.data.email, userId: event.data.userId });
  } else if (event.data.type === "T2F_LOGOUT") {
    chrome.runtime.sendMessage({ type: "T2F_LOGOUT" });
  }
});

const APP_URL = "http://localhost:5173";
let overlayEl = null;
let fields = [];
let queue = [];
let qi = 0;
let recognition = null;
let recognizing = false;
let transcriptBuffer = "";
let pageTextCache = "";

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

function speak(text) {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.onend = resolve;
    u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Field extraction (trimmed for speed) ----------

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

// Cap huge dropdowns (e.g. 250-item country lists) — sending them all to
// Gemini is the single biggest cause of slow analysis. Fields with more than
// MAX_OPTIONS are sent WITHOUT their option list, so Gemini treats them as
// "missing" rather than costing thousands of extra tokens per scan.
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
      out.push({ id, label: findLabel(el) || humanize(el.name), type: el.type, options: options.slice(0, MAX_OPTIONS), isGroup: true });
      return;
    }

    const label = findLabel(el);
    if (!label) return;
    const id = `t2f-field-${counter++}`;
    el.setAttribute("data-t2f-id", id);

    let options;
    if (el.tagName === "SELECT") {
      const all = Array.from(el.options).map((o) => o.textContent.trim()).filter(Boolean);
      options = all.length <= MAX_OPTIONS ? all : undefined; // skip huge lists entirely
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

// ---------- Overlay UI ----------

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
.t2f-iv-label { font-weight:700; font-size:1rem; margin:0 0 6px; }
.t2f-iv-hint { font-size:0.82rem; color:#6b7a70; margin:0 0 12px; }
.t2f-iv-value { background:#f3f5f0; padding:10px 12px; border-radius:10px; font-size:0.84rem; margin:0 0 12px; }
.t2f-iv-editable { width:100%; min-height:80px; padding:10px 12px; border:1px solid #d6dad1; border-radius:10px; font-size:0.84rem; font-family:inherit; margin:0 0 12px; }
.t2f-iv-actions { display:flex; gap:8px; }
.t2f-transcript { font-size:0.76rem; color:#6b7a70; margin-top:8px; min-height:14px; }
.t2f-btn-link { display:block; width:100%; text-align:center; background:none; border:none; color:#9aa39d; font-size:0.76rem; cursor:pointer; padding:8px 0 0; }
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
    if (recognition && recognizing) recognition.stop();
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
          <button class="t2f-btn t2f-btn-secondary" id="interviewBtn" style="display:none;" disabled>Start interview</button>
          <a class="t2f-btn t2f-btn-secondary" href="${APP_URL}/dashboard" target="_blank">Open dashboard</a>
        </div>
      </div>
      <div id="interviewPanel" style="display:none;">
        <div class="t2f-iv-header">
          <span id="ivProgress" class="t2f-iv-progress"></span>
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
  if (f.status === "skip") return `<span class="t2f-field-status t2f-status-skip">— Not tracked</span>`;
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

  fields = body.results.map((r, i) => ({ ...r, type: extracted[i]?.type, options: extracted[i]?.options, isGroup: extracted[i]?.isGroup }));
  renderFieldList();

  const topicBox = document.getElementById("topicBox");
  topicBox.innerHTML = `<p class="t2f-topic-label">This page is about</p><p class="t2f-topic">${escapeHtml(body.topic)}</p>`;
  topicBox.style.display = "block";

  queue = fields.map((_, i) => i).filter((i) => fields[i].status !== "skip");
  qi = 0;

  const interviewBtn = document.getElementById("interviewBtn");
  interviewBtn.disabled = queue.length === 0;
  interviewBtn.style.display = "block";

  await speak(body.intro);
}

async function nextInQueue() {
  if (qi >= queue.length) {
    document.getElementById("interviewStep").innerHTML = `<p class="t2f-status t2f-status-done">✓ All fields reviewed</p>`;
    await speak("All done. Your form is ready to review and submit.");
    return;
  }

  const field = fields[queue[qi]];
  const stepEl = document.getElementById("interviewStep");
  document.getElementById("ivProgress").textContent = `Field ${qi + 1} of ${queue.length}`;

  if (field.status === "ready") {
    stepEl.innerHTML = `
      <p class="t2f-iv-label">${escapeHtml(field.label)}</p>
      <p class="t2f-iv-value">${escapeHtml(field.value)}</p>
      <div class="t2f-iv-actions">
        <button class="t2f-btn" id="acceptBtn">Use this ✓</button>
        <button class="t2f-btn t2f-btn-secondary" id="skipBtn">Skip</button>
      </div>`;
    await speak(`For ${field.label}, I have: ${field.value}. Should I use this?`);
    document.getElementById("acceptBtn").onclick = () => confirmField(field, field.value);
    document.getElementById("skipBtn").onclick = () => advanceQueue();
    return;
  }

  stepEl.innerHTML = `
    <p class="t2f-iv-label">${escapeHtml(field.label)}</p>
    <p class="t2f-iv-hint">This one's missing — tell me about it, or skip it.</p>
    <div class="t2f-iv-actions">
      <button class="t2f-btn" id="recBtn">🎙️ Start recording</button>
      <button class="t2f-btn t2f-btn-secondary" id="stopRecBtn" disabled>Stop</button>
    </div>
    <p class="t2f-transcript" id="transcript"></p>
    <button class="t2f-btn-link" id="skipMissingBtn">Skip this field</button>`;
  await speak(`Tell me about your ${field.label}. Press start recording when ready, or skip it.`);
  document.getElementById("skipMissingBtn").onclick = () => advanceQueue();
  wireRecordButtons(field);
}

function wireRecordButtons(field) {
  const recBtn = document.getElementById("recBtn");
  const stopBtn = document.getElementById("stopRecBtn");
  const transcriptEl = document.getElementById("transcript");

  if (!SpeechRecognitionAPI) {
    transcriptEl.textContent = "Voice isn't supported in this browser.";
    recBtn.disabled = true;
    return;
  }

  recBtn.onclick = () => {
    transcriptBuffer = "";
    recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) transcriptBuffer += e.results[i][0].transcript + " ";
      transcriptEl.textContent = `"${transcriptBuffer.trim()}"`;
    };
    recognition.onerror = () => {};
    recognition.start();
    recognizing = true;
    recBtn.disabled = true;
    stopBtn.disabled = false;
    recBtn.textContent = "🔴 Recording…";
  };

  stopBtn.onclick = async () => {
    if (recognition && recognizing) recognition.stop();
    recognizing = false;
    recBtn.disabled = false;
    stopBtn.disabled = true;
    recBtn.textContent = "🎙️ Start recording";
    if (!transcriptBuffer.trim()) {
      transcriptEl.textContent = "Didn't catch anything — try again.";
      return;
    }
    await processAnswer(field, transcriptBuffer.trim());
  };
}

async function processAnswer(field, rawAnswer) {
  const stepEl = document.getElementById("interviewStep");
  stepEl.insertAdjacentHTML("beforeend", `<p class="t2f-status" id="thinking">Thinking…</p>`);

  const { t2f_session } = await chrome.storage.local.get("t2f_session");
  const { ok, body } = await chrome.runtime.sendMessage({
    type: "T2F_INTERVIEW_ANSWER",
    payload: {
      email: t2f_session.email,
      fieldLabel: field.label,
      fieldType: field.type,
      options: field.options,
      pageContext: pageTextCache,
      rawAnswer,
    },
  });
  document.getElementById("thinking")?.remove();

  if (!ok) {
    stepEl.innerHTML = `<p class="t2f-status t2f-status-error">${escapeHtml(body.error || "Something went wrong.")}</p>`;
    return;
  }

  const isChoice = field.options && field.options.length > 0;
  stepEl.innerHTML = `
    <p class="t2f-iv-label">${escapeHtml(field.label)}</p>
    ${isChoice ? `<p class="t2f-iv-value">${escapeHtml(body.answer)}</p>` : `<textarea class="t2f-iv-editable" id="editableAnswer">${escapeHtml(body.answer)}</textarea>`}
    <div class="t2f-iv-actions">
      <button class="t2f-btn" id="acceptBtn">Accept ✓</button>
      <button class="t2f-btn t2f-btn-secondary" id="redoBtn">Try again</button>
    </div>`;
  await speak(`Here's what I'll put: ${body.answer}. Do you accept this, or want to edit it?`);
  document.getElementById("acceptBtn").onclick = () => {
    const finalValue = isChoice ? body.answer : document.getElementById("editableAnswer").value;
    confirmField(field, finalValue);
  };
  document.getElementById("redoBtn").onclick = () => retryField(field);
}

function retryField(field) {
  const stepEl = document.getElementById("interviewStep");
  stepEl.innerHTML = `
    <p class="t2f-iv-label">${escapeHtml(field.label)}</p>
    <div class="t2f-iv-actions">
      <button class="t2f-btn" id="recBtn">🎙️ Start recording</button>
      <button class="t2f-btn t2f-btn-secondary" id="stopRecBtn" disabled>Stop</button>
    </div>
    <p class="t2f-transcript" id="transcript"></p>`;
  wireRecordButtons(field);
}

function confirmField(field, value) {
  fillField(field.id, value, !!field.isGroup);
  field.status = "ready";
  field.value = value;
  renderFieldList();
  advanceQueue();
}

function advanceQueue() {
  qi++;
  nextInQueue();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "T2F_TOGGLE_OVERLAY") toggleOverlay();
});
