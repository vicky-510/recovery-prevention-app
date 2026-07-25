import { pool } from '../db/pool.js';

// days_sober is computed in Postgres so the answer never depends on the
// server's timezone drifting from the date the user recorded.
const PROFILE_COLUMNS = `
  id, email, role, first_name, sobriety_start_date,
  safe_contact_name, safe_contact_phone,
  (CURRENT_DATE - sobriety_start_date) AS days_sober
`;

export async function getProfile(userId) {
  const { rows } = await pool.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`, [userId]);
  return rows[0] ?? null;
}

/** Full replacement of the editable profile; nulls clear a field. */
export async function updateProfile(userId, fields) {
  const { firstName, sobrietyStartDate, safeContactName, safeContactPhone } = fields;

  const { rows } = await pool.query(
    `UPDATE users
     SET first_name = $2,
         sobriety_start_date = $3,
         safe_contact_name = $4,
         safe_contact_phone = $5
     WHERE id = $1
     RETURNING ${PROFILE_COLUMNS}`,
    [userId, firstName, sobrietyStartDate, safeContactName, safeContactPhone]
  );

  return rows[0] ?? null;
}
