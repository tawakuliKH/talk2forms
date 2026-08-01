# Talk2Forms

**Fill the forms with a click. Talk to forms and fill in a minute.**

Talk2Forms is a free browser extension and web platform that fills out any online form
by voice — in any language. Built for speed, and for accessibility: for anyone who
finds typing slow, tiring, or difficult, including people with limited vision or
limited use of their hands.

🔗 **Live site:** [https://talk2forms.site](https://talk2forms.site)
🔗 **Privacy policy:** [https://talk2forms.site/privacy](https://talk2forms.site/privacy)
🔗 **Repository:** [github.com/tawakuliKH/talk2forms](https://github.com/tawakuliKH/talk2forms)

---

## What it does

Job applications, signup forms, surveys, checkout pages — any form, on any website —
can be filled out just by talking. Talk2Forms scans the page, checks it against a
profile you set up once, and asks about anything that's missing, out loud, in whatever
language you speak.

## How it works

### 1. Create an account
Sign up at [talk2forms.site](https://talk2forms.site) with email/password or Google
sign-in.

### 2. Build your profile, once
Fill in your name, contact details, LinkedIn/portfolio/GitHub links, and a pasted
CV or background. Talk2Forms generates an AI-written summary of your background in
the background, ready for any form.

### 3. Connect your free AI key
Connect your own free Google Gemini API key from the dashboard (a step-by-step guide
is built in). Your key and your data are never shared with other users.

### 4. Install the extension and scan any form
Open any page with a form and click the Talk2Forms icon. An overlay panel opens right
on the page — no popup that disappears the moment you click elsewhere. Click
**Scan this page**, and Talk2Forms reads every field, compares it to your profile using
AI, and shows you exactly what it already knows and what's missing.

### 5. Talk, and it fills the form for you
Click **Start interview**. For fields it already has an answer for, it reads the value
back and asks you to confirm. For anything missing, press **Start recording**, speak
your answer in your own words — in any language — and press **Done recording**.
Talk2Forms transcribes your speech, combines it with your saved profile and the
context of the form itself, and writes a clean, properly formatted answer. You hear it
read back and can accept it, edit it directly, or record again before anything is
written into the real page.

### 6. It learns as you go
Answers you confirm are saved back to your profile automatically, so the next form
needs even less from you — and your AI-generated resume summary updates too.

---

## Key features

- **Any form, any site** — not limited to job applications; works on signups, surveys,
  checkout forms, and more.
- **Any language, auto-detected** — speak in English, Spanish, Persian, Pashto, or any
  of 99+ languages; Talk2Forms detects what you're speaking automatically, no settings
  to change.
- **Built for accessibility** — a genuinely hands-optional, voice-first flow for anyone
  who finds typing difficult.
- **Every field type supported** — text, email, phone, dropdowns, radio buttons,
  checkboxes, dates, and file uploads (which it prompts you to attach manually, since
  files can't be filled by voice).
- **Privacy-aware by design** — fields that clearly belong to someone else (a
  recipient, an emergency contact) are never filled with your own information, and
  password fields are never touched or sent to any AI.
- **Bring your own key** — every user connects their own free Gemini API key; nothing
  runs through a shared account.
- **Editable at every step** — nothing is written into a real form field without you
  seeing and confirming it first.

---

## How it's built

Talk2Forms is a three-part system:

```
talk2forms/
├── client/      Website — landing page, auth, dashboard, profile management
├── server/      API — auth, AI orchestration, database access
└── extension/   Chrome extension — the injected overlay panel that scans and fills forms
```

### Technology stack

| Layer | Technology |
|---|---|
| Frontend | Vite, React, TypeScript, React Router |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | Self-hosted PostgreSQL |
| Authentication | Self-hosted (bcrypt-hashed passwords, JWT sessions, Google OAuth 2.0) |
| AI reasoning | Google Gemini API (`gemini-3.5-flash-lite`) — form analysis, answer generation, profile summarization |
| Speech-to-text | Groq-hosted Whisper (`whisper-large-v3-turbo`) — fast, accurate, multilingual transcription |
| Text-to-speech | Web Speech API (`speechSynthesis`) |
| Email | Resend — welcome and profile-update transactional emails |
| Extension | Chrome Manifest V3, vanilla JavaScript, injected DOM overlay (not a popup) |
| Deployment | Self-hosted VPS, Docker, Apache reverse proxy, Let's Encrypt via AutoSSL |

### Why an injected overlay instead of a browser popup?

Chrome force-closes a standard extension popup the instant it loses focus — incompatible
with a multi-turn voice conversation. Talk2Forms instead injects a persistent panel
directly into the page's DOM, so it stays open exactly as long as the user needs it,
closing only via its own button.

### Why Gemini + Groq together?

Gemini (`flash-lite`) handles the reasoning: understanding a page, matching it against
a profile, and writing well-formatted answers — fast and cheap on its free tier. Groq's
hosted Whisper handles transcription specifically, since general-purpose LLM audio
input is neither as accurate nor as fast as a model built for speech recognition.
Splitting the two keeps each part of the pipeline on the tool best suited for it.

---

## Why it's useful

Most people fill out the same information — name, contact details, work history, a
short bio — over and over across dozens of unrelated forms. Talk2Forms removes that
repetition entirely, and does it in a way that's genuinely usable for people who can't
comfortably type through a long form at all: no keyboard required, no mouse required
beyond a couple of clicks, and no language barrier.

---

## Project status

Actively developed. Core flow (account → profile → scan → voice interview → fill) is
live in production. See open items and roadmap in project discussions.

## License

Private project — all rights reserved.
