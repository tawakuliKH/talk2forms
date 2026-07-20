# Project scaffold — website + database (stage 1)

This covers **item 1** of the spec: the registration/profile website, the
Supabase-backed database (via Prisma), and the background Gemini call that
creates the `aiResume` row after a user submits their profile.

```
project/
  client/   Vite + React + TypeScript website (Supabase Auth: Google + email)
  server/   Node + Express + TypeScript API (Prisma -> Supabase Postgres, Gemini calls)
```

## 1. Create the Supabase project

1. Go to https://supabase.com → New project.
2. Once it's up, go to **Project Settings → Database** and copy the
   connection string (URI, port 5432, or the pooled one on 6543 for
   `DATABASE_URL`).
3. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key** (for the client) and the **service_role key** (for
   the server, keep this secret).
4. Go to **Authentication → Providers** and enable **Google** (you'll need
   a Google OAuth client id/secret — Supabase's docs walk through this) and
   make sure **Email** is enabled too.
5. Add `http://localhost:5173` to **Authentication → URL Configuration →
   Redirect URLs** for local dev.

## 2. Server setup

```bash
cd server
cp .env.example .env
# fill in DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run prisma:migrate -- --name init   # creates User, AiResume, MissingField tables in Supabase
npm run dev                              # http://localhost:8787
```

## 3. Client setup

```bash
cd client
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev                              # http://localhost:5173
```

## What's wired up right now

- **Auth**: Google or email/password sign-in via Supabase Auth, session
  persisted automatically (Supabase handles the "stay logged in" storage).
- **Profile form**: name, lastname, whatsapp, linkedin/portfolio/github
  (optional), a big CV paste field, and the user's own Gemini API key
  (per item 6, with a link + short guidance on getting one).
- **On submit**: the server immediately upserts the `User` row and responds,
  then — in the background — calls Gemini with the profile to generate a
  short resume summary and writes it to `AiResume` (userId + resume).
- **Database**: `prisma/schema.prisma` already includes `User`, `AiResume`,
  and a `MissingField` table set up ahead of time for item 3 (the field-gap
  detection the extension will use later).

## Not built yet (next stages)

- The browser extension itself (popup, scan/highlight, AI interview) — items 2–6.
- Emailing users to complete/confirm their profile.
- Encrypting the stored Gemini API key at rest (currently plain text —
  flagging this now so we don't forget before going further than your own
  test email).

## A note on this sandbox

I built all of this by hand-writing the files since my sandbox here has no
network access, so I couldn't run `npm create vite` or `npm install`
myself. Everything above is a normal Vite/Prisma project though — the
`npm install` commands will work fine on your machine.
