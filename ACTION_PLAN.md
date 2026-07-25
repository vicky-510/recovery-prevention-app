# Recovery & Prevention Platform — Action Plan

## Theme
Multi-modal, GenAI-powered recovery platform for individuals navigating substance use disorders and caregivers.

**MVP Flow:** Zero-typing interventions & personalized emergency scripts during high cognitive load situations.

## Stack (fixed)
- Frontend: Angular (standalone components, no NgRx) + Tailwind CSS (Light/Slate theme)
- Backend: Node.js + Express (route → controller → service)
- Database: Postgres (Supabase pooler), raw `pg`, parameterized queries, no ORM
- Auth: Native `crypto` HMAC tokens (no `jsonwebtoken`) — **email + password with bcrypt** (chosen mode)
- AI: `@google/genai`, `gemini-2.5-flash`, strict JSON via `responseSchema`
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

- Model: `gemini-2.5-flash`
- Forced structured output via `responseSchema` (flat, minimal)
- Output fields:
  - `headline` — short calming title
  - `steps` — array of 3-4 short imperative strings
  - `grounding_line` — one sentence to say aloud
  - `caregiver_note` — optional, only if role = caregiver
- System prompt: fixed persona — trauma-informed, non-clinical, ultra-concise, no medical claims. Inputs: `category` + optional `context_note`.

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

---

## Scoring Alignment Reminder
- **High Impact:** Code Quality, Problem Statement Alignment
- **Medium Impact:** Security, Efficiency
- **Low Impact:** Testing, Accessibility
- **Disqualifiers to avoid:** static/hardcoded pages, mock/fake data, hallucinated AI responses, false positives (demo-only features). Every demoed feature must run end-to-end with a real Gemini call.
