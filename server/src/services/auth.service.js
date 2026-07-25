import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
import { issueToken } from '../utils/token.js';

export async function signup(email, password, role) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role`,
    [email, passwordHash, role]
  );
  const user = result.rows[0];
  return { user, token: issueToken(user.id) };
}

export async function login(email, password) {
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  const user = result.rows[0];
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  return { user: { id: user.id, email: user.email, role: user.role }, token: issueToken(user.id) };
}
