import { pool } from '../db/pool.js';

const PROFILE_COLUMNS = 'id, email, role, safe_contact_name, safe_contact_phone';

export async function getProfile(userId) {
  const { rows } = await pool.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`, [userId]);
  return rows[0] ?? null;
}

/** Passing nulls clears the contact. */
export async function setSafeContact(userId, name, phone) {
  const { rows } = await pool.query(
    `UPDATE users SET safe_contact_name = $2, safe_contact_phone = $3
     WHERE id = $1
     RETURNING ${PROFILE_COLUMNS}`,
    [userId, name, phone]
  );

  return rows[0] ?? null;
}
