import {asc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {languages} from '../schema';

export type Language = typeof languages.$inferSelect;
export type NewLanguage = typeof languages.$inferInsert;

/** Reads and writes the `languages` table. */
export class LanguageRepository {
  constructor(private readonly db: Database) {}

  listActive(): Promise<Language[]> {
    return this.db
      .select()
      .from(languages)
      .where(eq(languages.isActive, true))
      .orderBy(asc(languages.name));
  }

  async findById(id: number): Promise<Language | undefined> {
    const [row] = await this.db.select().from(languages).where(eq(languages.id, id));
    return row;
  }

  /** Inserts or updates languages by ID. Used by the seed script. */
  async upsertMany(rows: NewLanguage[]): Promise<void> {
    for (const row of rows) {
      await this.db
        .insert(languages)
        .values(row)
        .onConflictDoUpdate({
          target: languages.id,
          set: {slug: row.slug, name: row.name, version: row.version, isActive: row.isActive},
        });
    }
  }
}
