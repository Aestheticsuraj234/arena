import {boolean, index, integer, pgTable, text, timestamp, uuid} from 'drizzle-orm/pg-core';

import {difficulty} from './enums';

/** A LeetCode-style problem with hidden and sample test cases. */
export const problems = pgTable('problems', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  description: text().notNull(),
  difficulty: difficulty().notNull(),
  timeLimitMs: integer().notNull().default(2000),
  memoryLimitKb: integer().notNull().default(262_144),
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
});

export const testCases = pgTable(
  'test_cases',
  {
    id: uuid().primaryKey().defaultRandom(),
    problemId: uuid()
      .notNull()
      .references(() => problems.id, {onDelete: 'cascade'}),
    position: integer().notNull(),
    input: text().notNull(),
    expectedOutput: text().notNull(),
    isSample: boolean().notNull().default(false),
  },
  (t) => [index('test_cases_problem_idx').on(t.problemId, t.position)],
);
