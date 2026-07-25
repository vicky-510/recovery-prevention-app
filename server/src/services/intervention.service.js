import { pool } from '../db/pool.js';
import { generateScript } from './gemini.service.js';
import { timeBucket } from '../utils/timeContext.js';

export async function listCategories() {
  const { rows } = await pool.query('SELECT code, label FROM action_categories ORDER BY code');
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
  const { rows: userRows } = await pool.query(
    `SELECT role, first_name, safe_contact_name,
            (CURRENT_DATE - sobriety_start_date) AS days_sober
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userRows.length === 0) {
    throw Object.assign(new Error('User no longer exists.'), { status: 401 });
  }

  const user = userRows[0];

  const script = await generateScript(categoryCode, user.role, localHour, {
    firstName: user.first_name,
    daysSober: user.days_sober,
    safeContactName: user.safe_contact_name,
  });

  const { rows } = await pool.query(
    `INSERT INTO interventions (user_id, category_code, context_note, script_json)
     VALUES ($1, $2, $3, $4)
     RETURNING id, script_json, created_at`,
    [userId, categoryCode, timeBucket(localHour), script]
  );

  return rows[0];
}
