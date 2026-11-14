import {
  LanguageRepository,
  ProblemRepository,
  SubmissionRepository,
  type Database,
  type ProblemWithTests,
  type Submission,
  type TestResult,
} from '@arena/db';
import type {LanguageRegistry} from '@arena/engine';
import type {SubmissionQueue} from '@arena/queue';
import {DEFAULT_LIMITS, type SubmissionView, type TestResultView} from '@arena/shared';

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
  problemId?: string | null;
  sampleOnly?: boolean;
  batchId?: string | null;
}

/** Creates submissions, puts them on the queue, and reads them back. */
export class SubmissionService {
  private readonly languages: LanguageRepository;
  readonly submissions: SubmissionRepository;
  readonly problems: ProblemRepository;

  constructor(
    db: Database,
    private readonly registry: LanguageRegistry,
    private readonly queue: SubmissionQueue,
  ) {
    this.languages = new LanguageRepository(db);
    this.submissions = new SubmissionRepository(db);
    this.problems = new ProblemRepository(db);
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
        problemId: run.problemId ?? null,
        sampleOnly: run.sampleOnly ?? false,
        batchId: run.batchId ?? null,
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

  /** The public view, with the problem slug and per-test results if any. */
  async view(s: Submission): Promise<SubmissionView> {
    if (!s.problemId) return toSubmissionView(s);
    const [problem, results] = await Promise.all([
      this.problems.findById(s.problemId),
      this.submissions.listTestResults(s.id),
    ]);
    return toSubmissionView(s, problem, results);
  }

  private async assertLanguage(languageId: number): Promise<void> {
    const language = await this.languages.findById(languageId);
    if (!language?.isActive || !this.registry.has(languageId)) {
      throw new ValidationError(`languageId: ${languageId} is not supported`);
    }
  }
}

function testView(r: TestResult, problem: ProblemWithTests | undefined): TestResultView {
  const testCase = problem?.testCases.find((t) => t.id === r.testCaseId);
  return {
    position: r.position,
    status: r.status as TestResultView['status'],
    timeMs: r.timeMs,
    memoryKb: r.memoryKb,
    sample: testCase?.isSample
      ? {input: testCase.input, expectedOutput: testCase.expectedOutput, stdout: r.stdout}
      : null,
  };
}

/** Database row → public JSON. Hidden test data never leaves the server. */
export function toSubmissionView(
  s: Submission,
  problem?: ProblemWithTests,
  results?: TestResult[],
): SubmissionView {
  // For a failed hidden test, its stdout is withheld too.
  const firstFailure = results?.find((r) => r.status !== 'accepted');
  const failedHidden =
    firstFailure && !problem?.testCases.find((t) => t.id === firstFailure.testCaseId)?.isSample;
  return {
    token: s.token,
    status: s.status,
    languageId: s.languageId,
    sourceCode: s.sourceCode,
    stdin: s.stdin,
    stdout: failedHidden ? null : s.stdout,
    stderr: s.stderr,
    compileOutput: s.compileOutput,
    message: s.message,
    exitCode: s.exitCode,
    signal: s.signal,
    timeMs: s.timeMs,
    memoryKb: s.memoryKb,
    createdAt: s.createdAt.toISOString(),
    finishedAt: s.finishedAt?.toISOString() ?? null,
    problemSlug: problem?.slug ?? null,
    testsPassed: s.testsPassed,
    testsTotal: s.testsTotal,
    tests: results ? results.map((r) => testView(r, problem)) : null,
  };
}
