/**
 * One-shot database setup for production: migrations + languages (+ sample
 * problems when SEED_PROBLEMS=true). Bundled to dist/setup-db.js.
 */
import {createDb, setupDatabase} from '@arena/db';
import {createLogger} from '@arena/telemetry';

const logger = createLogger({service: 'setup-db'});
const url = process.env.DATABASE_URL;
const migrationsFolder = process.env.MIGRATIONS_DIR ?? '/app/drizzle';
if (!url) {
  logger.fatal('DATABASE_URL is required');
  process.exit(1);
}

const {db, pool} = createDb(url, 1);
try {
  const steps = await setupDatabase(db, {
    migrationsFolder,
    seedProblems: process.env.SEED_PROBLEMS === 'true',
  });
  logger.info({steps}, 'database ready');
} catch (err) {
  logger.fatal({err}, 'database setup failed');
  process.exitCode = 1;
} finally {
  await pool.end();
}
