import {LanguageRepository, SubmissionRepository, type Database, type Submission} from '@arena/db';
import type {LanguageRegistry} from '@arena/engine';
import type {SubmissionQueue} from '@arena/queue';
import {DEFAULT_LIMITS, type SubmissionView} from '@arena/shared';

import {ValidationError} from '../lib/errors';

export interface NewRun {
  userId: string | null;
  apiKeyId?: string | null;
  languageId: number;
  sourceCode: string;
  stdin: string;
  expectedOutput?: string | null;
  timeLimitMs?: number;
  memoryLimitKb?: number;
}

/** Creates submissions, puts them on the queue, and reads them back. */
export class SubmissionService {
  private readonly languages: LanguageRepository;
  readonly submissions: SubmissionRepository;

  constructor(
    db: Database,
    private readonly registry: LanguageRegistry,
    private readonly queue: SubmissionQueue,
  ) {
    this.languages = new LanguageRepository(db);
    this.submissions = new SubmissionRepository(db);
  }

  /** Validates the language, stores the submission and enqueues it. */
  async create(run: NewRun): Promise<Submission> {
    const [submission] = await this.createMany([run]);
    if (!submission) throw new Error('Failed to create submission');
    return submission;
  }

  async createMany(runs: readonly NewRun[]): Promise<Submission[]> {
    for (const run of runs) await this.assertLanguage(run.languageId);
    const created = await this.submissions.createMany(
      runs.map((run) => ({
        userId: run.userId,
        apiKeyId: run.apiKeyId ?? null,
        languageId: run.languageId,
        sourceCode: run.sourceCode,
        stdin: run.stdin,
        expectedOutput: run.expectedOutput ?? null,
        timeLimitMs: run.timeLimitMs ?? DEFAULT_LIMITS.timeLimitMs,
        memoryLimitKb: run.memoryLimitKb ?? DEFAULT_LIMITS.memoryLimitKb,
      })),
    );
    await this.queue.enqueue(created.map((s) => s.id));
    return created;
  }

  /** Waits for a verdict up to `timeoutMs`, then returns the latest row. */
  async waitForResult(submission: Submission, timeoutMs: number): Promise<Submission> {
    await this.queue.waitUntilFinished(submission.id, timeoutMs);
    return (await this.submissions.findById(submission.id)) ?? submission;
  }

  private async assertLanguage(languageId: number): Promise<void> {
    const language = await this.languages.findById(languageId);
    if (!language?.isActive || !this.registry.has(languageId)) {
      throw new ValidationError(`languageId: ${languageId} is not supported`);
    }
  }
}

/** Database row → public JSON. */
export function toSubmissionView(s: Submission): SubmissionView {
  return {
    token: s.token,
    status: s.status,
    languageId: s.languageId,
    sourceCode: s.sourceCode,
    stdin: s.stdin,
    stdout: s.stdout,
    stderr: s.stderr,
    compileOutput: s.compileOutput,
    message: s.message,
    exitCode: s.exitCode,
    signal: s.signal,
    timeMs: s.timeMs,
    memoryKb: s.memoryKb,
    createdAt: s.createdAt.toISOString(),
    finishedAt: s.finishedAt?.toISOString() ?? null,
  };
}
