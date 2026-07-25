import { pool } from '../db/pool.js';
import { generateScript } from './gemini.service.js';

export async function listCategories() {
  const { rows } = await pool.query('SELECT code, label FROM action_categories ORDER BY code');
  return rows;
}

export async function categoryExists(code) {
  const { rowCount } = await pool.query('SELECT 1 FROM action_categories WHERE code = $1', [code]);
  return rowCount > 0;
}

/**
 * Generates a script with Gemini and records it. A generation failure propagates
 * rather than falling back to canned text — a fabricated script is worse than
 * an honest error for someone in crisis.
 */
export async function createIntervention(userId, categoryCode) {
  const script = await generateScript(categoryCode);

  const { rows } = await pool.query(
    `INSERT INTO interventions (user_id, category_code, script_json)
     VALUES ($1, $2, $3)
     RETURNING id, script_json, created_at`,
    [userId, categoryCode, script]
  );

  return rows[0];
}
