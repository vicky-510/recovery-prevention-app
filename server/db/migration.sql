CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('person', 'caregiver')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contextual safety tool: one trusted person, reachable in a single tap.
ALTER TABLE users ADD COLUMN IF NOT EXISTS safe_contact_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS safe_contact_phone TEXT;

CREATE TABLE IF NOT EXISTS action_categories (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

INSERT INTO action_categories (code, label) VALUES
  ('craving', 'Urge to use right now'),
  ('panic', 'Panic / anxiety spiral'),
  ('post_relapse', 'Just relapsed'),
  ('caregiver_checkin', 'Caregiver support script')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL REFERENCES action_categories(code),
  context_note TEXT,
  script_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interventions_user
  ON interventions (user_id, created_at DESC);

-- Educational notes are generated once per (category, role) and reused, so the
-- explainer is never regenerated while someone is waiting on it.
CREATE TABLE IF NOT EXISTS education_notes (
  category_code TEXT NOT NULL REFERENCES action_categories(code),
  role TEXT NOT NULL CHECK (role IN ('person', 'caregiver')),
  note_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (category_code, role)
);
