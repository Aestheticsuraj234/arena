import {boolean, integer, pgTable, text} from 'drizzle-orm/pg-core';

/**
 * Supported languages. The primary key is the Judge0 language ID, so existing
 * Judge0 clients send the same `language_id` they already use.
 */
export const languages = pgTable('languages', {
  id: integer().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  version: text().notNull(),
  isActive: boolean().notNull().default(true),
});
