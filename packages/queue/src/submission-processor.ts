import type {Submission, SubmissionRepository, SubmissionResult} from '@arena/db';
import {toRunResponse, type ExecutionResult, type Executor} from '@arena/engine';
import {DEFAULT_LIMITS} from '@arena/shared';

export type ProcessOutcome = 'finished' | 'skipped';

/** Execution result → the columns stored on the submission. */
export function toSubmissionResult(result: ExecutionResult): SubmissionResult {
  const r = toRunResponse(result);
  return {
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    compileOutput: r.compileOutput,
    message: r.message,
    exitCode: r.exitCode,
    timeMs: r.timeMs,
    memoryKb: r.memoryKb,
  };
}

/**
 * Runs one submission: claim it, execute it, store the verdict. Shared by the
 * worker and by the API tests' in-memory queue.
 */
export class SubmissionProcessor {
  constructor(
    private readonly submissions: SubmissionRepository,
    private readonly executor: Executor,
    private readonly staleAfterMs = 5 * 60_000,
  ) {}

  async process(submissionId: string): Promise<ProcessOutcome> {
    const claimed = await this.submissions.markProcessing(submissionId, this.staleAfterMs);
    if (!claimed) return 'skipped'; // another worker has it, or it already finished

    const submission = await this.submissions.findById(submissionId);
    if (!submission) return 'skipped';

    let result: ExecutionResult;
    try {
      result = await this.executor.execute(this.jobFor(submission));
    } catch (err) {
      // Infrastructure failure (Docker down…): let BullMQ retry it.
      await this.submissions.requeue(submissionId);
      throw err;
    }
    await this.submissions.saveResult(submissionId, toSubmissionResult(result));
    return 'finished';
  }

  /** Called after the last retry failed. */
  async giveUp(submissionId: string, reason: string): Promise<void> {
    await this.submissions.failPermanently(submissionId, `Execution failed: ${reason}`);
  }

  private jobFor(s: Submission) {
    return {
      languageId: s.languageId,
      sourceCode: s.sourceCode,
      inputs: [s.stdin ?? ''],
      limits: {
        timeLimitMs: s.timeLimitMs,
        memoryLimitKb: s.memoryLimitKb,
        outputLimitBytes: DEFAULT_LIMITS.outputLimitBytes,
      },
    };
  }
}
