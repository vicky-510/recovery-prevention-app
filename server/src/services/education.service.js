import { pool } from '../db/pool.js';
import { generateEducationNote } from './gemini.service.js';

/**
 * Educational notes do not vary by moment, so the first request for a
 * (category, role) pair generates one and every later request reads it back.
 * That keeps a calm-moment read instant and avoids paying for the same
 * explanation twice.
 */
export async function getEducationNote(userId, categoryCode) {
  const { rows: userRows } = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  if (userRows.length === 0) {
    throw Object.assign(new Error('User no longer exists.'), { status: 401 });
  }

  const { role } = userRows[0];

  const cached = await pool.query(
    'SELECT note_json, created_at FROM education_notes WHERE category_code = $1 AND role = $2',
    [categoryCode, role]
  );

  if (cached.rowCount > 0) {
    return { ...cached.rows[0].note_json, generated_at: cached.rows[0].created_at };
  }

  const note = await generateEducationNote(categoryCode, role);

  // Another request may have generated this concurrently; keep whichever landed first.
  const stored = await pool.query(
    `INSERT INTO education_notes (category_code, role, note_json)
     VALUES ($1, $2, $3)
     ON CONFLICT (category_code, role) DO UPDATE SET note_json = education_notes.note_json
     RETURNING note_json, created_at`,
    [categoryCode, role, note]
  );

  return { ...stored.rows[0].note_json, generated_at: stored.rows[0].created_at };
}
