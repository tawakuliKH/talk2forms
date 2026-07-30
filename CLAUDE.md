# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Talk2Forms: a Chrome extension that fills out job-application forms by voice.
The repo has three parts that only communicate over HTTP / `postMessage` /
`chrome.runtime` messaging — there is no shared build or monorepo tooling:

- `client/` — Vite + React + TypeScript marketing site + dashboard (Supabase Auth: Google + email). Users register/complete their profile here.
- `server/` — Node + Express + TypeScript API. Prisma → Supabase Postgres. Calls Gemini to generate resume summaries and clean up spoken answers.
- `extension/` — Plain-JS Manifest V3 Chrome extension (no build step). Scans a page's form fields, matches them against the user's saved profile, and lets the user "talk" answers for missing fields.

## Commands

Run from within each package directory (there is no root-level orchestration script).

**server/**
```bash
npm run dev              # tsx watch src/index.ts — http://localhost:8787
npm run build             # tsc -p tsconfig.json
npm start                 # node dist/index.js
npm run prisma:generate
npm run prisma:migrate -- --name <name>   # creates a new migration against DATABASE_URL
npm run prisma:studio
```

**client/**
```bash
npm run dev        # vite — http://localhost:5173
npm run build       # tsc -b && vite build
npm run preview
npm run lint         # eslint .
```

**extension/** — no build step. Load unpacked in `chrome://extensions` pointing at the `extension/` folder. After editing background/content scripts, reload the extension from that page; content script changes also require reloading the target tab.

There are no test suites in this repo yet.

### Environment setup
Both `client/` and `server/` need `.env` copied from their `.env.example` (Supabase URL/keys, `DATABASE_URL`, optional server-side `GEMINI_API_KEY` fallback). The extension's `background.js` hardcodes `API_URL = "http://localhost:8787"` — update it if the server runs elsewhere.

## Architecture

### Data model (`server/prisma/schema.prisma`)
- `User` — one row per registered account (keyed by email). Holds profile fields (name, lastname, whatsapp, linkedin, portfolio, github, `cvText`), the user's own `geminiApiKey`, `profileComplete`, and `trialUsed`.
- `AiResume` — 1:1 with `User`. Gemini-generated short resume summary, written asynchronously after registration.
- `MissingField` — per-`(userId, siteUrl)` record of form fields the extension found missing on a given site (field-gap tracking; consumed by the interview flow).
- `AnonymousUsage` — tracks the one-time trial for users who haven't signed up yet, keyed by a per-install `deviceId` generated in `background.js`.

Note: `server/src/lib/schema.prisma` is a stale duplicate of `server/prisma/schema.prisma` (missing `trialUsed`/`AnonymousUsage`). The Prisma CLI only reads `server/prisma/schema.prisma`; don't edit the one under `src/lib`.

### Server request flow (`server/src/`)
- `index.ts` wires up `/api/users`, `/api/trial`, `/api/forms` under Express, CORS-restricted to `CLIENT_ORIGIN`.
- `routes/users.ts` — `POST /register` upserts the `User` row and responds immediately, then fires a **background** (non-awaited) Gemini call to populate `AiResume` so the client never blocks on AI latency. `GET /:id` and `GET /by-email/:email` fetch profile + resume for the dashboard.
- `routes/forms.ts` — `POST /analyze` takes `{ email, fields: [{id, label}] }` from the extension's content script and matches field labels against keyword lists (`FIELD_MATCHERS`) to decide which of the user's saved profile values apply and what's missing. `POST /interview-answer` takes a raw spoken answer and asks Gemini to clean it up into form-ready text, gated by `consumeTrial` if the user has no personal Gemini key.
- `routes/trial.ts` — `POST /check-and-use` is the trial gate for anonymous (pre-signup) extension users, keyed by `deviceId`.
- `lib/trial.ts` (`consumeTrial`) — single source of truth for trial eligibility: signed-in users get one trial run before `profileComplete`/`trialUsed` blocks them; anonymous users get one run per `deviceId` via `AnonymousUsage`.
- `services/gemini.ts` — all `@google/generative-ai` calls live here (`generateResumeSummary`, `refineFieldAnswer`). Every user's own `geminiApiKey` is preferred; a server-side `GEMINI_API_KEY` env var is only a fallback for the trial flow, so AI costs land on each user rather than on the operator.
- `lib/prisma.ts` — reuses a single `PrismaClient` across dev hot-reloads via `globalThis`.

### Client (`client/src/`)
- `App.tsx` is the router root: it holds the Supabase `session` in state, redirects between `/`, `/login`, `/signup`, and the `/dashboard` (nested `Overview` / `Profile` routes), and calls `broadcastSessionToExtension` on every auth change.
- `lib/supabaseClient.ts` — Supabase client + `signInWithGoogle` / `signInWithEmail` / `signUpWithEmail` / `signOut` helpers.
- `lib/extensionBridge.ts` — the *only* link between the website and the extension. On login/logout it does `window.postMessage({ source: "talk2forms-site", type: "T2F_AUTH" | "T2F_LOGOUT", ... }, window.location.origin)`. The extension's content script (injected on `<all_urls>`, so also on the site itself) listens for this and relays it via `chrome.runtime.sendMessage` to `background.js`, which persists `t2f_session` in `chrome.storage.local`.
- `public/demo/job-application-demo.html` — a static mock job-application form served as-is by Vite, used to manually exercise the extension's scan/interview flow end-to-end.

### Extension (`extension/`, Manifest V3, no bundler)
There is no popup UI — the toolbar action toggles an overlay panel injected directly into the page.
- `background.js` (service worker) — owns the device id and `t2f_session` in `chrome.storage.local`. `chrome.action.onClicked` sends `T2F_TOGGLE_OVERLAY` to `content.js` for the active tab. Also proxies the extension's only two outbound HTTP calls (`T2F_ANALYZE` → `POST /api/forms/analyze`, `T2F_INTERVIEW_ANSWER` → `POST /api/forms/interview-answer`) via `proxyFetch`, since content scripts can't reliably `fetch` cross-origin on arbitrary pages.
- `content.js` — injected on every page (`<all_urls>`). Relays `T2F_AUTH`/`T2F_LOGOUT` from the site's `postMessage` into extension messaging. On `T2F_TOGGLE_OVERLAY`, builds/tears down a self-contained overlay (`toggleOverlay`/`renderRoot`, styles injected from the `OVERLAY_CSS` string) that: extracts form fields (`extractFields`/`findLabel`, tagging elements with `data-t2f-id` or `data-t2f-group` for radio/checkbox groups, capping huge `<select>` option lists at `MAX_OPTIONS`), sends them to the background worker for analysis, renders a scrollable status list, and drives a voice interview loop (`nextInQueue`/`wireRecordButtons`/`processAnswer`) using the Web Speech API (`SpeechRecognition` + `speechSynthesis`) for missing fields, writing accepted answers back into the page via `fillField`.

### End-to-end flow
1. User registers/completes profile on the client → `POST /api/users/register` → `User` row saved, `AiResume` generated in the background.
2. Client broadcasts the Supabase session to the extension via `postMessage` → `content.js` → `background.js` (`t2f_session` in `chrome.storage.local`).
3. Clicking the toolbar icon toggles the in-page overlay; "Scan this page" extracts fields and sends them (with trimmed page text) through the background proxy to `POST /api/forms/analyze`, which returns per-field ready/missing/skip status.
4. For missing fields, the overlay's voice interview records a spoken answer, sends it through the background proxy to `POST /api/forms/interview-answer` (trial-gated if no personal Gemini key), and writes the Gemini-cleaned answer into the page field on accept.

### Cost/latency tuning in `services/gemini.ts`
`analyzeFormWithGemini` and `refineFieldAnswer` (the two calls on the interactive scan/interview path) use `gemini-3.5-flash-lite` with page/CV text deliberately truncated (page text ~1200 chars, CV text ~1200/1000 chars) to keep per-scan latency and token cost down. `generateResumeSummary` (the one-off background call after profile save) stays on full `gemini-3.5-flash` since nothing is waiting on it.
