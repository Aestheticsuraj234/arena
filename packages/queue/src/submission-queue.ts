import {Queue, QueueEvents} from 'bullmq';
import type {Redis} from 'ioredis';

export const SUBMISSION_QUEUE = 'submissions';

/** Payload of a submission job. Everything else is read from Postgres. */
export interface SubmissionJobData {
  submissionId: string;
}

/** What the API needs from the queue. Tests use an in-memory version. */
export interface SubmissionQueue {
  enqueue(submissionIds: readonly string[]): Promise<void>;
  /** Resolves true once the job finished (either way), false on timeout. */
  waitUntilFinished(submissionId: string, timeoutMs: number): Promise<boolean>;
  /** Jobs waiting plus jobs running. */
  depth(): Promise<number>;
  close(): Promise<void>;
}

/** BullMQ-backed queue. The job ID is the submission ID, so enqueueing twice is a no-op. */
export class BullSubmissionQueue implements SubmissionQueue {
  private readonly queue: Queue<SubmissionJobData>;
  private readonly events: QueueEvents;

  constructor(connection: Redis) {
    this.queue = new Queue<SubmissionJobData>(SUBMISSION_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {type: 'exponential', delay: 1000},
        removeOnComplete: {age: 3600, count: 10_000},
        removeOnFail: {age: 24 * 3600},
      },
    });
    // QueueEvents needs its own connection: it blocks while listening.
    this.events = new QueueEvents(SUBMISSION_QUEUE, {connection: connection.duplicate()});
  }

  async enqueue(submissionIds: readonly string[]): Promise<void> {
    await this.queue.addBulk(
      submissionIds.map((submissionId) => ({
        name: 'run',
        data: {submissionId},
        opts: {jobId: submissionId},
      })),
    );
  }

  async waitUntilFinished(submissionId: string, timeoutMs: number): Promise<boolean> {
    const job = await this.queue.getJob(submissionId);
    if (!job) return true; // already removed after completion
    try {
      await job.waitUntilFinished(this.events, timeoutMs);
      return true;
    } catch (err) {
      // A failed job also "finished"; only a timeout means "still running".
      return !(err instanceof Error && /timed out/i.test(err.message));
    }
  }

  async depth(): Promise<number> {
    const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed', 'prioritized');
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }

  async close(): Promise<void> {
    await this.events.close();
    await this.queue.close();
  }
}
