import {migrate} from 'drizzle-orm/node-postgres/migrator';

import type {Database} from './client';
import {LanguageRepository} from './repositories/language-repository';
import {ProblemRepository} from './repositories/problem-repository';
import {SEED_LANGUAGES, SEED_PROBLEMS} from './seed-data';

export interface SetupOptions {
  /** Folder with the generated SQL migrations. */
  migrationsFolder: string;
  /** Also load the sample problems. Languages are always upserted. */
  seedProblems: boolean;
}

/**
 * Brings a database up to date: apply migrations, then upsert the languages
 * (and optionally the sample problems). Safe to run on every deploy.
 */
export async function setupDatabase(db: Database, options: SetupOptions): Promise<string[]> {
  const steps: string[] = [];
  await migrate(db, {migrationsFolder: options.migrationsFolder});
  steps.push('migrations applied');
  await new LanguageRepository(db).upsertMany(SEED_LANGUAGES);
  steps.push(`${SEED_LANGUAGES.length} languages upserted`);
  if (options.seedProblems) {
    const problems = new ProblemRepository(db);
    for (const problem of SEED_PROBLEMS) await problems.upsert(problem);
    steps.push(`${SEED_PROBLEMS.length} problems upserted`);
  }
  return steps;
}
