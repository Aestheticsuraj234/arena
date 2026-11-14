import {index, integer, pgTable, text, timestamp, uuid} from 'drizzle-orm/pg-core';

import {apiKeys} from './api-keys';
import {user} from './auth';
import {submissionStatus} from './enums';
import {languages} from './languages';
import {problems, testCases} from './problems';

/** Groups the submissions created by one batch request. */
export const batches = pgTable('batches', {
  id: uuid().primaryKey().defaultRandom(),
  userId: text().references(() => user.id, {onDelete: 'set null'}),
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
});

/**
 * One run of source code: either a free run (stdin + optional expected
 * output) or a submission against a problem's test cases.
 */
export const submissions = pgTable(
  'submissions',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Public identifier, as in Judge0's `token`. */
    token: uuid().notNull().unique().defaultRandom(),
    userId: text().references(() => user.id, {onDelete: 'set null'}),
    apiKeyId: uuid().references(() => apiKeys.id, {onDelete: 'set null'}),
    batchId: uuid().references(() => batches.id, {onDelete: 'cascade'}),
    problemId: uuid().references(() => problems.id, {onDelete: 'set null'}),
    languageId: integer()
      .notNull()
      .references(() => languages.id),
    sourceCode: text().notNull(),
    stdin: text(),
    expectedOutput: text(),
    timeLimitMs: integer().notNull(),
    memoryLimitKb: integer().notNull(),

    status: submissionStatus().notNull().default('in_queue'),
    stdout: text(),
    stderr: text(),
    compileOutput: text(),
    message: text(),
    exitCode: integer(),
    timeMs: integer(),
    memoryKb: integer(),

    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    startedAt: timestamp({withTimezone: true}),
    finishedAt: timestamp({withTimezone: true}),
  },
  (t) => [
    index('submissions_user_created_idx').on(t.userId, t.createdAt),
    index('submissions_batch_idx').on(t.batchId),
    index('submissions_status_idx').on(t.status),
  ],
);

/** Result of one test case for a problem submission. */
export const testResults = pgTable(
  'test_results',
  {
    id: uuid().primaryKey().defaultRandom(),
    submissionId: uuid()
      .notNull()
      .references(() => submissions.id, {onDelete: 'cascade'}),
    testCaseId: uuid()
      .notNull()
      .references(() => testCases.id, {onDelete: 'cascade'}),
    position: integer().notNull(),
    status: submissionStatus().notNull(),
    stdout: text(),
    stderr: text(),
    timeMs: integer(),
    memoryKb: integer(),
  },
  (t) => [index('test_results_submission_idx').on(t.submissionId, t.position)],
);
