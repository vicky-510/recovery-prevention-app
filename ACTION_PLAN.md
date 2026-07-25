# Recovery & Prevention Platform — Action Plan

## Theme
Multi-modal, GenAI-powered recovery platform for individuals navigating substance use disorders and caregivers.

**MVP Flow:** Zero-typing interventions & personalized emergency scripts during high cognitive load situations.

## Stack (fixed)
- Frontend: Angular (standalone components, no NgRx) + Tailwind CSS (Light/Slate theme)
- Backend: Node.js + Express (route → controller → service)
- Database: Postgres (Supabase pooler), raw `pg`, parameterized queries, no ORM
- Auth: Native `crypto` HMAC tokens (no `jsonwebtoken`) — **email + password with bcrypt** (chosen mode)
- AI: `@google/genai`, `gemini-flash-latest`, strict JSON via `responseSchema`
- Data policy: no fake/mock data — everything real or generated at runtime

---

## 1. Domain Mapping

**Tables:**

- `users`
  - `id` (uuid, pk)
  - `email` (unique)
  - `password_hash`
  - `role` (`person` | `caregiver`)
  - `created_at`

- `action_categories` (seeded lookup)
  - `id` (pk)
  - `code` (`craving`, `panic`, `post_relapse`, `caregiver_checkin`)
  - `label`

- `interventions` (one row per crisis-trigger event)
  - `id` (pk)
  - `user_id` (fk → users)
  - `category_code` (fk → action_categories.code)
  - `context_note` (nullable short text, optional)
  - `script_json` (jsonb — Gemini-generated structured script)
  - `created_at`

**Trigger:** single tap "I need help now" (+ optional 1-word voice category pick via Web Speech). No forms, no required free text.

**Core action categories (fixed set of 4):**
- `craving` — urge to use right now
- `panic` — acute anxiety/panic spiral
- `post_relapse` — just relapsed, needs non-judgmental grounding
- `caregiver_checkin` — caregiver needs a script to support the person

---

## 2. AI Schema (Gemini)

- Model: `gemini-flash-latest`
- Forced structured output via `responseSchema` (flat, minimal)
- Output fields:
  - `headline` — short calming title
  - `steps` — array of 3-4 short imperative strings
  - `grounding_line` — one sentence to say aloud
  - `caregiver_note` — optional, only if role = caregiver
- System prompt: fixed persona — trauma-informed, non-clinical, ultra-concise, no medical claims. Inputs: `category` + optional `context_note`.

---

## 2b. Features

### Built (complete, verified end-to-end)

1. **Secure Login** — email + password, bcrypt-hashed, native `crypto` HMAC session token (no `jsonwebtoken`, no third-party auth).
2. **Zero-Typing Crisis Trigger** — single-tap "I Need Help Now"; user selects one of 4 seeded categories (`craving`, `panic`, `post_relapse`, `caregiver_checkin`). No text input required anywhere in the crisis path.
3. **Real-Time Personalized Emergency Script (GenAI core engine)** — live `gemini-flash-latest` call with strict `responseSchema`, returning structured `headline` / `steps[]` / `grounding_line`. Freshly generated every time; never canned.
4. **Persisted Intervention Record** — every generated script is `INSERT`ed into `interventions` (Postgres/Supabase) with real parameterized queries, proving dynamic runtime data rather than sample data.
5. **Role-Aware Scripts** — the `person` / `caregiver` role chosen at signup is read on every trigger and changes the prompt, so the same category yields a different script for each. A person gets self-directed physical actions; a caregiver gets actions to take for someone else plus words to say to them.

### Standout features (ranked, add only after end-to-end smoke test passes)

1. **Pre-generated crisis cache** *(highest impact)* — a 2–3s AI call, or no signal, is a product failure mid-crisis. Generate and store the user's personalized scripts **while they are calm**; on SOS tap serve instantly from Postgres, then refresh the cache with a background Gemini call. Directly answers "when cognitive load is highest" and stays fully real (real GenAI, real DB) — an architectural insight, not a bolt-on.
2. **One-step-at-a-time script delivery** — render one step, large, one tap to advance, instead of a wall of text. The real accessibility answer to high cognitive load; ~5 min, client-only, no backend change.
3. **Personal anchors in the script** — store 2–3 short anchors at signup (reason for recovery, who matters, days sober) and feed them into the Gemini prompt so scripts say something concrete instead of generic advice.


### Scoring note

Features above move **Problem Statement Alignment** (and #2 moves **Accessibility**). The other four categories are earned by *how* we build, not by adding features:

- **Code Quality** — route → controller → service layering, central error handler, fail-fast env validation, no dead code
- **Security** — bcrypt + HMAC auth enforced at the router, `helmet` headers, rate limiting on auth and AI endpoints, 10kb body cap, parameterized queries, uniform login errors (no account enumeration), secrets only in `.env` (gitignored)
- **Efficiency** — one Gemini call per trigger, `compression`, pooled connections, no N+1 queries
- **Testing** — 39 Jest + supertest tests passing against the real database (token forgery/expiry, signup validation, password hashing, auth enforcement, category integrity, role-specific prompt construction)

---

## 3. Tech Pick & Auth Choice

**Auth mode:** Email + password with bcrypt (locked — not access-code).

**Optional integrations — pick or skip:**
- SSE — Skip (single request/response is enough)
- Web Speech — **Pick** (zero-typing category selection / voice trigger)
- Maps/Places — Skip (no location need)
- Firebase Auth — Skip (using own bcrypt auth per stack constraint)
- FCM — Skip (no push needed for 1-hr demo)
- Vision — Skip (no image input in flow)
- Sheets — Skip
- Calendar — Skip
- Dual-role QR — Skip (role is just a field set at signup)

---

## 4. Express Game Plan

**DB tables:** `users`, `action_categories`, `interventions`

**Core API routes (route → controller → service):**
1. `POST /api/auth/signup`, `POST /api/auth/login` — bcrypt + HMAC token (one auth unit)
2. `POST /api/interventions` — body `{category_code, context_note?}` → Gemini service → stores + returns `script_json`
3. `GET /api/interventions/categories` — returns seeded category list (for tap UI)

**Aggressive cut-list (reject if suggested):**
- History/dashboard views
- Editing past interventions
- Multi-language support
- Notifications
- Caregiver-to-person linking/invites
- Analytics
- Settings pages

**30-second demo script:**
Login → tap "I need help now" → tap/say `craving` → Gemini generates a real personalized script in <2s → shown on screen (and/or read via TTS) → done.

---

## 5. Execution Phases (on "go")

- **P1 (~10m):** Angular + Express scaffold, DB migration SQL, `pg` pool connection, auth routes skeleton
- **P2 (~25m):** bcrypt + HMAC auth logic, Gemini service with `responseSchema`, interventions route wired end-to-end
- **P3 (~25m):** Angular UI (single-screen tap interface + Web Speech), wire to API, live smoke test
