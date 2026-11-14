import {and, asc, desc, eq, inArray, lt, or} from 'drizzle-orm';

import type {Database} from '../client';
import {submissions, testResults} from '../schema';
import type {FinalStatus} from '../submission-state';

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type TestResult = typeof testResults.$inferSelect;
export type NewTestResult = typeof testResults.$inferInsert;

/** Fields a worker writes when a run finishes. */
export type SubmissionResult = {status: FinalStatus} & Pick<
  NewSubmission,
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
   * worker already has it, so a job never runs twice. A submission stuck in
   * `processing` for longer than `staleAfterMs` (its worker crashed) can be
   * claimed again.
   */
  async markProcessing(id: string, staleAfterMs = 5 * 60_000): Promise<boolean> {
    const staleBefore = new Date(Date.now() - staleAfterMs);
    const rows = await this.db
      .update(submissions)
      .set({status: 'processing', startedAt: new Date()})
      .where(
        and(
          eq(submissions.id, id),
          or(
            eq(submissions.status, 'in_queue'),
            and(eq(submissions.status, 'processing'), lt(submissions.startedAt, staleBefore)),
          ),
        ),
      )
      .returning({id: submissions.id});
    return rows.length === 1;
  }

  /** Puts a `processing` submission back in the queue after a worker error. */
  async requeue(id: string): Promise<void> {
    await this.db
      .update(submissions)
      .set({status: 'in_queue', startedAt: null})
      .where(and(eq(submissions.id, id), eq(submissions.status, 'processing')));
  }

  /**
   * Stores the final result. Only a `processing` submission can finish, so a
   * late duplicate can never overwrite a verdict. Returns undefined otherwise.
   */
  async saveResult(id: string, result: SubmissionResult): Promise<Submission | undefined> {
    const [row] = await this.db
      .update(submissions)
      .set({...result, finishedAt: result.finishedAt ?? new Date()})
      .where(and(eq(submissions.id, id), eq(submissions.status, 'processing')))
      .returning();
    return row;
  }

  /** Marks a submission as failed for good, whatever its current state. */
  async failPermanently(id: string, message: string): Promise<void> {
    await this.db
      .update(submissions)
      .set({status: 'internal_error', message, finishedAt: new Date()})
      .where(and(eq(submissions.id, id), inArray(submissions.status, ['in_queue', 'processing'])));
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
