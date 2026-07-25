import fs from 'node:fs/promises';
import { pool } from './pool.js';

const MIGRATION_PATH = new URL('../../db/migration.sql', import.meta.url);

/**
 * Applies the schema at boot. Every statement is `IF NOT EXISTS` / `ON CONFLICT
 * DO NOTHING`, so this is safe to run on every start.
 */
export async function runMigrations() {
  const sql = await fs.readFile(MIGRATION_PATH, 'utf8');
  await pool.query(sql);
}
