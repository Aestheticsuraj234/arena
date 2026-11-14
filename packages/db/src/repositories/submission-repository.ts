import {and, asc, desc, eq, inArray} from 'drizzle-orm';

import type {Database} from '../client';
import {submissions, testResults} from '../schema';

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type TestResult = typeof testResults.$inferSelect;
export type NewTestResult = typeof testResults.$inferInsert;

/** Fields a worker writes when a run finishes. */
export type SubmissionResult = Pick<
  NewSubmission,
  | 'status'
  | 'stdout'
  | 'stderr'
  | 'compileOutput'
  | 'message'
  | 'exitCode'
  | 'timeMs'
  | 'memoryKb'
  | 'finishedAt'
>;

/** Reads and writes submissions and their per-test results. */
export class SubmissionRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewSubmission): Promise<Submission> {
    const [row] = await this.db.insert(submissions).values(input).returning();
    if (!row) throw new Error('Failed to create submission');
    return row;
  }

  async createMany(inputs: NewSubmission[]): Promise<Submission[]> {
    if (inputs.length === 0) return [];
    return this.db.insert(submissions).values(inputs).returning();
  }

  async findById(id: string): Promise<Submission | undefined> {
    const [row] = await this.db.select().from(submissions).where(eq(submissions.id, id));
    return row;
  }

  async findByToken(token: string): Promise<Submission | undefined> {
    const [row] = await this.db.select().from(submissions).where(eq(submissions.token, token));
    return row;
  }

  /** Submissions for the given tokens, in the order of `tokens`. */
  async findByTokens(tokens: string[]): Promise<Array<Submission | undefined>> {
    if (tokens.length === 0) return [];
    const rows = await this.db.select().from(submissions).where(inArray(submissions.token, tokens));
    const byToken = new Map(rows.map((r) => [r.token, r]));
    return tokens.map((t) => byToken.get(t));
  }

  listByUser(userId: string, limit = 20, offset = 0): Promise<Submission[]> {
    return this.db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Moves a queued submission to `processing`. Returns false when another
   * worker already took it, so a job is never run twice.
   */
  async markProcessing(id: string): Promise<boolean> {
    const rows = await this.db
      .update(submissions)
      .set({status: 'processing', startedAt: new Date()})
      .where(and(eq(submissions.id, id), eq(submissions.status, 'in_queue')))
      .returning({id: submissions.id});
    return rows.length === 1;
  }

  async saveResult(id: string, result: SubmissionResult): Promise<Submission> {
    const [row] = await this.db
      .update(submissions)
      .set({...result, finishedAt: result.finishedAt ?? new Date()})
      .where(eq(submissions.id, id))
      .returning();
    if (!row) throw new Error(`Submission ${id} not found`);
    return row;
  }

  async saveTestResults(rows: NewTestResult[]): Promise<void> {
    if (rows.length > 0) await this.db.insert(testResults).values(rows);
  }

  listTestResults(submissionId: string): Promise<TestResult[]> {
    return this.db
      .select()
      .from(testResults)
      .where(eq(testResults.submissionId, submissionId))
      .orderBy(asc(testResults.position));
  }
}
