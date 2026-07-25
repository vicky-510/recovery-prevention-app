import { app } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';

try {
  await runMigrations();
  console.log('Schema is up to date.');
} catch (err) {
  console.error('Migration failed, refusing to start:', err.message);
  process.exit(1);
}

app.listen(env.PORT, () => console.log(`Server running on port ${env.PORT}`));
