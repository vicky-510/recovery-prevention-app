import { pool } from '../db/pool.js';
import { generateScript, generateScriptFromAudio } from './gemini.service.js';
import { timeBucket } from '../utils/timeContext.js';

async function loadContext(userId) {
  const { rows } = await pool.query(
    `SELECT role, first_name, safe_contact_name,
            (CURRENT_DATE - sobriety_start_date) AS days_sober
     FROM users WHERE id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('User no longer exists.'), { status: 401 });
  }

  const user = rows[0];

  return {
    role: user.role,
    profile: {
      firstName: user.first_name,
      daysSober: user.days_sober,
      safeContactName: user.safe_contact_name,
    },
  };
}

async function record(userId, categoryCode, localHour, script) {
  const { rows } = await pool.query(
    `INSERT INTO interventions (user_id, category_code, context_note, script_json)
     VALUES ($1, $2, $3, $4)
     RETURNING id, category_code, script_json, created_at`,
    [userId, categoryCode, timeBucket(localHour), script]
  );

  return rows[0];
}

export async function listCategories() {
  const { rows } = await pool.query(
    'SELECT code, label FROM action_categories ORDER BY sort_order, code'
  );
  return rows;
}

export async function categoryExists(code) {
  const { rowCount } = await pool.query('SELECT 1 FROM action_categories WHERE code = $1', [code]);
  return rowCount > 0;
}

/**
 * Generates a script for this person, their role, and this moment, then records
 * it. A generation failure propagates rather than falling back to canned text —
 * a fabricated script is worse than an honest error for someone in crisis.
 */
export async function createIntervention(userId, categoryCode, localHour) {
  const { role, profile } = await loadContext(userId);
  const script = await generateScript(categoryCode, role, localHour, profile);

  return record(userId, categoryCode, localHour, script);
}

/**
 * The spoken path: the recording goes to Gemini, which decides what the moment
 * is and answers it in one pass. Returns null when the model could not make
 * sense of the audio, so the caller can offer the tap path instead of acting on
 * a guess.
 */
export async function createVoiceIntervention(userId, audioBase64, mimeType, localHour) {
  const { role, profile } = await loadContext(userId);

  const result = await generateScriptFromAudio({
    audioBase64,
    mimeType,
    role,
    localHour,
    profile,
  });

  if (!result.understood) return null;

  const { understood, detected_category: categoryCode, ...script } = result;

  return record(userId, categoryCode, localHour, script);
}
