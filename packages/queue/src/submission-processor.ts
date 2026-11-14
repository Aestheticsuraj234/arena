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
  type ExecutionJob,
  type ExecutionResult,
  type Executor,
  type JudgeResult,
} from '@arena/engine';
import {DEFAULT_LIMITS} from '@arena/shared';

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
export class SubmissionProcessor {
  constructor(
    private readonly submissions: SubmissionRepository,
    private readonly problems: ProblemRepository,
    private readonly executor: Executor,
    private readonly staleAfterMs = 5 * 60_000,
  ) {}

  async process(submissionId: string): Promise<ProcessOutcome> {
    const claimed = await this.submissions.markProcessing(submissionId, this.staleAfterMs);
    if (!claimed) return 'skipped'; // another worker has it, or it already finished

    const submission = await this.submissions.findById(submissionId);
    if (!submission) return 'skipped';

    try {
      if (submission.problemId) await this.judgeProblem(submission, submission.problemId);
      else await this.runPlain(submission);
    } catch (err) {
      // Infrastructure failure (Docker down…): let BullMQ retry it.
      await this.submissions.requeue(submissionId);
      throw err;
    }
    return 'finished';
  }

  /** Called after the last retry failed. */
  async giveUp(submissionId: string, reason: string): Promise<void> {
    await this.submissions.failPermanently(submissionId, `Execution failed: ${reason}`);
  }

  private async runPlain(s: Submission): Promise<void> {
    const result = await this.executor.execute(this.job(s, [s.stdin ?? '']));
    await this.submissions.saveResult(s.id, toSubmissionResult(result, s.expectedOutput));
  }

  private async judgeProblem(s: Submission, problemId: string): Promise<void> {
    const problem = await this.problems.findById(problemId);
    if (!problem) {
      await this.submissions.saveResult(s.id, {
        status: 'internal_error',
        message: 'Problem not found',
      });
      return;
    }
    const tests: TestCase[] = s.sampleOnly
      ? problem.testCases.filter((t) => t.isSample)
      : problem.testCases;
    const result = await this.executor.execute({
      ...this.job(
        s,
        tests.map((t) => t.input),
      ),
      afterRun: stopAtFirstFailure(tests),
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
    await this.submissions.saveResult(s.id, toProblemResult(judged));
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
