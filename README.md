# Steady

A recovery support platform for people navigating substance use disorders and the people who care for them.

Steady targets a single moment: the minutes during a craving, a panic spiral, or the aftermath of a relapse. Cognitive load is at its peak then, and that is precisely when most applications ask the user to read paragraphs, navigate menus, and type. Steady removes typing from that path entirely. One tap — or one spoken sentence — produces a personalised emergency script, generated live and delivered one step at a time.

**Live:** [recovery-prevention.netlify.app](https://recovery-prevention.netlify.app) · API at [recovery-prevention-app.onrender.com](https://recovery-prevention-app.onrender.com/api/health)

---

## Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Design notes](#design-notes)

---

## How it works

```
Sign in
   │
   ├── Tap a category  ─────┐
   │                        ├──►  Gemini generates a structured script
   └── Or speak freely  ────┘      (headline, steps, grounding line)
                                              │
                                              ▼
                             One step shown at a time, one tap to advance
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                 Read step aloud     Call a trusted contact   Read why this happens
```

When a recording is sent instead of a tap, a single multimodal call both classifies the situation and answers it, so the user never has to choose a category.

---

## Features

**Zero-typing crisis path.** Four large tap targets, loaded from the database and ordered most to least urgent, so the first thing a distressed reader meets is the most likely reason they opened the app. No text input exists anywhere between opening the application and receiving help.

**Voice input.** A recording is sent to Gemini as audio rather than transcribed locally, so pace, breathing, and distress reach the model instead of being flattened into text. If the audio contains no intelligible speech, the request is rejected rather than answered with a guess.

**Personalised scripts.** A first name, a sobriety start date, and a trusted contact are folded into the prompt, so a step reads "text Rahul" rather than "reach out to someone", and the streak is offered back as evidence the user has done this before. Days sober are computed in Postgres, so the count never drifts with the server's timezone.

**Role-aware generation.** The same category yields a different script for the person and for their caregiver. A person receives self-directed actions; a caregiver receives actions to take for someone else, along with words to say to them.

**Time-aware context.** The caller's local hour shapes the prompt. Overnight, the model is told most contacts are asleep, and the steps it returns change accordingly.

**One step at a time.** Steps render individually and large, with a single oversized control to advance, closing on a grounding line to say aloud. Any step can be read aloud via speech synthesis.

**Educational resources.** A separate schema explains what is happening and why, tailored to the reader's role. Notes do not vary by moment, so each `(category, role)` pair is generated once and read back afterwards.

**Safe contact.** One trusted person, reachable in a single tap from both the category and script screens, configured while calm so no typing sits on the crisis path.

---

## Architecture

| Layer | Choice |
| --- | --- |
| Frontend | Angular 18, standalone components with signals, Tailwind CSS |
| Backend | Node.js, Express, `route → controller → service` layering |
| Database | PostgreSQL, accessed with `pg` and parameterised queries |
| Auth | Email and password with bcrypt; sessions signed with native `crypto` HMAC-SHA256 |
| AI | Google Gemini via `@google/genai`, structured output enforced with `responseSchema` |

There is no ORM, no `jsonwebtoken`, and no state management library. Generative AI is the core engine rather than an added feature: every script and every explainer is produced by a live model call at request time.

---

## Prerequisites

- **Node.js 20 or later** (developed on 22)
- **A PostgreSQL database.** Any instance works; the connection assumes TLS, which suits hosted providers such as Supabase or Neon.
- **A Google Gemini API key**, from [Google AI Studio](https://aistudio.google.com/apikey).
- **Google Chrome**, only if running the browser test suite.

> **On Gemini quotas.** Every script is a live model call, so usage maps one-to-one onto the API's quota. The free tier currently allows twenty generations per day per project, which a few rehearsals will reach. Quotas are counted per *project*, not per key, so issuing a second key against the same project does not raise the ceiling — a key in a new project, or billing on the existing one, does. Educational notes are the exception: each is generated once and then read from the database.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/vicky-510/recovery-prevention-app.git
cd recovery-prevention-app

npm --prefix server install
npm --prefix client install
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Fill in `server/.env`:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `HMAC_SECRET` | Random string used to sign session tokens |
| `PORT` | Port for the API (defaults to `3000`) |
| `CORS_ORIGINS` | Optional. Comma-separated origins allowed to call the API. Leave unset locally; name the deployed frontend in production |

Generate a strong signing secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The first four are validated at startup. A missing one stops the process with a message naming it, rather than failing later at the first request.

> If your database password contains reserved URL characters (`@ : / ? # & %`), percent-encode them within the connection string.

### 3. Database schema

No manual step is required. The schema is applied automatically on startup, and every statement is written so that re-running is safe. To apply it by hand instead:

```bash
psql "$DATABASE_URL" -f server/db/migration.sql
```

---

## Running the application

Two processes, in separate terminals:

```bash
npm --prefix server start     # API on http://localhost:3000
npm --prefix client start     # UI  on http://localhost:4200
```

Open <http://localhost:4200> and create an account. The client proxies `/api` to the server, so no CORS configuration is needed in development.

Use `npm --prefix server run dev` to restart the API automatically on change.

### Browser support

Recording requires `MediaRecorder` and `getUserMedia`, and read-aloud requires `SpeechSynthesis`. Both are treated as optional: where a browser lacks support the control is hidden rather than shown in a state where it cannot work, and the application remains fully usable by tap alone.

---

## Testing

### Server

```bash
npm --prefix server test
```

123 tests across 7 suites, run with Jest and supertest against a real database. Coverage includes session-token forgery and expiry, password hashing, account-enumeration resistance, request validation, profile isolation between accounts, the ordering of the categories, and the construction of every prompt the application sends.

Prompt construction is kept in pure functions (`utils/anchors.js`, `utils/timeContext.js`, and the exported builders in `gemini.service.js`) so that the rules governing model input are asserted directly, without spending API quota. Requests that fail validation are also rejected before any model call.

Test accounts use unique generated addresses and are removed afterwards.

### Browser

```bash
npm --prefix client run test:e2e
```

A Playwright test covering the path unit tests cannot reach: a real `getUserMedia` capture, a real `MediaRecorder`, the browser's own audio conversion, and a live model call. Chrome is launched with a recorded WAV standing in for a microphone, so the suite needs neither a person nor audio hardware. Both servers must be running.

It signs in once per run, since credential endpoints are rate limited and running the suite in a tight loop would otherwise start returning `429`.

The fixture is committed. To regenerate it:

```bash
cd server && node scripts/make-audio-fixture.mjs
```

---

## Deployment

The two halves deploy independently. The browser calls the API directly rather than through a host-level redirect, because a static host's proxy typically times out well before a cold start on a free tier completes.

### API

Any Node host works. Set `DATABASE_URL`, `GEMINI_API_KEY`, `HMAC_SECRET`, and `CORS_ORIGINS` in its environment, and start with `npm start`. The schema is applied on boot, so no separate release step is needed.

| Setting | Value |
| --- | --- |
| Root directory | `server` |
| Build command | `npm ci` |
| Start command | `npm start` |

Set `CORS_ORIGINS` to the deployed frontend's origin. Left unset, the API accepts requests from any origin.

Free tiers commonly idle out after a period without traffic, and the next request pays a cold start of up to a minute.

### Frontend

`netlify.toml` at the repository root carries the build settings and the rewrite that lets client-side routing resolve.

| Setting | Value |
| --- | --- |
| Base directory | `client` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist/client/browser` |

Point the build at an API with a single environment variable:

| Variable | Description |
| --- | --- |
| `API_BASE_URL` | Origin of the deployed API, for example `https://your-api.onrender.com` |

Angular resolves environment files when it builds, so the value cannot be read from the process at runtime. A `prebuild` step writes it into `src/environments/environment.prod.ts` instead. Leaving the variable unset keeps the committed fallback, so a build never fails for want of it. Changing where the API lives means changing this variable and redeploying — no code edit.

On Netlify the variable belongs under **Site configuration → Environment variables**.

Recording requires a secure context, so the deployed site must be served over HTTPS for voice input to work. Both hosts above provide this by default.

---

## API reference

All endpoints are prefixed with `/api`. Every route except `/health` and the two authentication routes requires an `Authorization: Bearer <token>` header.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `POST` | `/auth/signup` | Create an account. Body: `email`, `password`, `role` |
| `POST` | `/auth/login` | Exchange credentials for a token |
| `GET` | `/me` | Current profile, including computed `days_sober` |
| `PUT` | `/me` | Replace the editable profile |
| `GET` | `/interventions/categories` | Situations available to select |
| `POST` | `/interventions` | Generate a script. Body: `category_code`, optional `local_hour` |
| `POST` | `/interventions/voice` | Generate a script from a recording. Body: `audio_base64`, `mime_type`, optional `local_hour` |
| `GET` | `/education/:categoryCode` | Explanatory note for a situation |

**Roles** are `person` or `caregiver`. **Categories** are `craving`, `panic`, `post_relapse`, and `caregiver_checkin`, returned in presentation order.

Two responses are worth calling out, because both describe a condition the caller can act on rather than a fault:

- `422` from `/interventions/voice` — the recording held no intelligible speech. Offer the tap path instead of acting on a guess.
- `503` from either generation route — the model is out of capacity, usually the daily quota. The body carries a message safe to show the reader, along the lines of *try again in a minute*.

### Security

Credential endpoints are rate limited to 10 requests per 15 minutes, and generation to 30. Login failures return an identical message whether the address is unknown or the password is wrong, so registered accounts cannot be enumerated. Request bodies are capped at 10 kB, except the audio route, which parses separately at 6 MB rather than raising the limit for everything. Responses carry the header set applied by `helmet`.

---

## Project structure

```
server/
  db/migration.sql            Schema, safe to re-run
  src/
    app.js                    Express application
    server.js                 Applies the schema, then listens
    config/env.js             Validates configuration at startup
    routes/                   Path and middleware definitions
    controllers/              Request validation and status codes
    services/                 Business logic, model calls, queries
    middleware/               Auth, rate limiting, error handling
    utils/                    Tokens, prompt anchors, time context
    tests/                    Jest and supertest suites
  scripts/                    Regenerates the browser test's audio fixture

client/
  e2e/                        Playwright tests and audio fixture
  scripts/                    Writes the API URL in before a build
  src/environments/           Per-configuration settings
  src/app/
    components/               Login and crisis screens
    core/                     Session, HTTP interceptor, audio
    services/api.service.ts   Typed transport layer
    models.ts                 Shared interfaces
```

Controllers validate and translate to status codes. Services own logic and data access. Routes bind paths to middleware. Model calls live only in `services/gemini.service.js`, and SQL only in services.

---

## Design notes

**A generation failure is never disguised.** If a model call fails, the API returns an error. There is no canned script to fall back to, and no seeded sample content anywhere in the application. For someone in crisis, a fabricated script is worse than an honest failure.

**Silence is not answered.** The model is required to quote what it heard from a recording, and the server checks that quote independently rather than trusting a self-reported confidence flag. Asked only to self-report, a model will treat silence as a craving and produce a confident script for it.

**Transcripts are not stored.** What a recording contained is used to confirm speech was present, then discarded.

**Anchors are treated as untrusted input.** Personal details supplied by the user are placed inside prompts, so they are length-capped and stripped of line breaks before use.

**Educational notes are cached; scripts never are.** An explanation of what a craving is does not change between readings, so it is generated once per `(category, role)` and stored. A script is bound to a specific person and moment, and is always generated fresh.

**The interface is dark by default, for a reason.** The application reasons explicitly about the small hours, and a full-brightness white screen at three in the morning works against the person it is meant to help. Motion is used only to slow the reader down — a control that breathes while listening, progress that fills as steps are completed — and is disabled entirely under `prefers-reduced-motion`.

**Failure states are worded for someone who is struggling.** An error tells the reader what to do next rather than what went wrong internally, and the tap path stays available whenever the spoken one does not work.

---

## Licence

MIT
