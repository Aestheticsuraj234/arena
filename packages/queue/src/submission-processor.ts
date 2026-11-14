import type {
  ProblemRepository,
  Submission,
  SubmissionRepository,
  SubmissionResult,
  TestCase,
} from '@arena/db';
import {
  judgeTests,
  stopAtFirstFailure,
  toRunResponse,
  verdictForRun,
  type ExecutionJob,
  type ExecutionResult,
  type Executor,
  type JudgeResult,
} from '@arena/engine';
import {DEFAULT_LIMITS, type SubmissionEvent} from '@arena/shared';

import {NO_EVENTS, type SubmissionEvents} from './submission-events';

export type ProcessOutcome = 'finished' | 'skipped';

/** Execution result → the columns stored on a plain submission. */
export function toSubmissionResult(
  result: ExecutionResult,
  expectedOutput: string | null = null,
): SubmissionResult {
  const r = toRunResponse(result, expectedOutput);
  return {
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    compileOutput: r.compileOutput,
    message: r.message,
    exitCode: r.exitCode,
    signal: r.signal,
    timeMs: r.timeMs,
    memoryKb: r.memoryKb,
  };
}

/** Judge result → the columns stored on a problem submission. */
export function toProblemResult(judged: JudgeResult): SubmissionResult {
  const shown = judged.firstFailure;
  return {
    status: judged.status,
    stdout: shown?.stdout ?? null,
    stderr: shown?.stderr || null,
    compileOutput: judged.compileOutput,
    message: judged.message,
    exitCode: null,
    signal: null,
    timeMs: judged.timeMs,
    memoryKb: judged.memoryKb,
    testsPassed: judged.passed,
    testsTotal: judged.total,
  };
}

/**
 * Runs one submission: claim it, execute it, store the verdict. A plain run
 * has one input; a problem submission runs its test cases in one sandbox and
 * stops at the first failure.
 */
export interface ProcessorHooks {
  /** A submission was claimed and starts running. */
  onStart?: (info: {submissionId: string; languageId: number}) => void;
  /** A verdict was saved. `durationMs` covers claim → verdict. */
  onFinish?: (info: {
    submissionId: string;
    languageId: number;
    status: SubmissionResult['status'];
    durationMs: number;
  }) => void;
  /** Execution threw (Docker down…); the job will be retried. */
  onError?: (info: {submissionId: string; error: unknown}) => void;
}

export interface ProcessorOptions {
  /** Metrics and logging callbacks (Chapter 11). */
  hooks?: ProcessorHooks;
  /** Live events for SSE (Chapter 9). Optional: nothing is published without it. */
  events?: Pick<SubmissionEvents, 'publish'>;
  /** A `processing` row older than this may be claimed again. */
  staleAfterMs?: number;
}

export class SubmissionProcessor {
  private readonly events: Pick<SubmissionEvents, 'publish'>;
  private readonly staleAfterMs: number;
  private readonly hooks: ProcessorHooks;

  constructor(
    private readonly submissions: SubmissionRepository,
    private readonly problems: ProblemRepository,
    private readonly executor: Executor,
    options: ProcessorOptions = {},
  ) {
    this.events = options.events ?? NO_EVENTS;
    this.staleAfterMs = options.staleAfterMs ?? 5 * 60_000;
    this.hooks = options.hooks ?? {};
  }

  async process(submissionId: string): Promise<ProcessOutcome> {
    const claimed = await this.submissions.markProcessing(submissionId, this.staleAfterMs);
    if (!claimed) return 'skipped'; // another worker has it, or it already finished

    const submission = await this.submissions.findById(submissionId);
    if (!submission) return 'skipped';
    this.emit({type: 'status', token: submission.token, status: 'processing'});
    const info = {submissionId, languageId: submission.languageId};
    this.hooks.onStart?.(info);
    const started = performance.now();

    let status: SubmissionResult['status'];
    try {
      status = submission.problemId
        ? await this.judgeProblem(submission, submission.problemId)
        : await this.runPlain(submission);
    } catch (err) {
      // Infrastructure failure (Docker down…): let BullMQ retry it.
      this.hooks.onError?.({submissionId, error: err});
      await this.submissions.requeue(submissionId);
      throw err;
    }
    this.hooks.onFinish?.({...info, status, durationMs: performance.now() - started});
    return 'finished';
  }

  /** Called after the last retry failed. */
  async giveUp(submissionId: string, reason: string): Promise<void> {
    await this.submissions.failPermanently(submissionId, `Execution failed: ${reason}`);
    const s = await this.submissions.findById(submissionId);
    if (s) this.emit({type: 'done', token: s.token, status: 'internal_error'});
  }

  /** Events are best effort: a lost event never fails a submission. */
  private emit(event: SubmissionEvent): void {
    void this.events.publish(event).catch(() => undefined);
  }

  private async finish(
    s: Submission,
    result: SubmissionResult,
  ): Promise<SubmissionResult['status']> {
    const saved = await this.submissions.saveResult(s.id, result);
    if (saved) this.emit({type: 'done', token: s.token, status: result.status});
    return result.status;
  }

  private async runPlain(s: Submission): Promise<SubmissionResult['status']> {
    const result = await this.executor.execute(this.job(s, [s.stdin ?? '']));
    return this.finish(s, toSubmissionResult(result, s.expectedOutput));
  }

  private async judgeProblem(
    s: Submission,
    problemId: string,
  ): Promise<SubmissionResult['status']> {
    const problem = await this.problems.findById(problemId);
    if (!problem) {
      return this.finish(s, {status: 'internal_error', message: 'Problem not found'});
    }
    const tests: TestCase[] = s.sampleOnly
      ? problem.testCases.filter((t) => t.isSample)
      : problem.testCases;
    const stop = stopAtFirstFailure(tests);
    const result = await this.executor.execute({
      ...this.job(
        s,
        tests.map((t) => t.input),
      ),
      afterRun: (run, i) => {
        this.emit({
          type: 'test',
          token: s.token,
          position: i,
          status: verdictForRun(run, tests[i]?.expectedOutput ?? ''),
          timeMs: run.timeMs,
          total: tests.length,
        });
        return stop(run, i);
      },
    });
    const judged = judgeTests(result, tests);
    await this.submissions.saveTestResults(
      judged.tests.map((t) => {
        const testCase = tests[t.position];
        if (!testCase) throw new Error(`No test case at position ${t.position}`);
        return {
          submissionId: s.id,
          testCaseId: testCase.id,
          position: t.position,
          status: t.status,
          stdout: t.stdout,
          stderr: t.stderr || null,
          timeMs: t.timeMs,
          memoryKb: t.memoryKb,
        };
      }),
    );
    return this.finish(s, toProblemResult(judged));
  }

  private job(s: Submission, inputs: string[]): ExecutionJob {
    return {
      languageId: s.languageId,
      sourceCode: s.sourceCode,
      inputs,
      limits: {
        timeLimitMs: s.timeLimitMs,
        memoryLimitKb: s.memoryLimitKb,
        outputLimitBytes: DEFAULT_LIMITS.outputLimitBytes,
      },
    };
  }
}
