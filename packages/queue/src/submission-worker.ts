import {Worker} from 'bullmq';
import type {Redis} from 'ioredis';

import {SUBMISSION_QUEUE, type SubmissionJobData} from './submission-queue';
import type {ProcessOutcome, SubmissionProcessor} from './submission-processor';

export interface WorkerOptions {
  connection: Redis;
  processor: SubmissionProcessor;
  /** Submissions run at the same time in this process. */
  concurrency: number;
  log?: (message: string) => void;
  /** Called when a job failed for the last time. */
  onGiveUp?: (submissionId: string) => void;
}

/** A BullMQ worker that hands each job to the `SubmissionProcessor`. */
export function createSubmissionWorker({
  connection,
  processor,
  concurrency,
  log = () => undefined,
  onGiveUp,
}: WorkerOptions): Worker<SubmissionJobData, ProcessOutcome> {
  const worker = new Worker<SubmissionJobData, ProcessOutcome>(
    SUBMISSION_QUEUE,
    (job) => processor.process(job.data.submissionId),
    {connection, concurrency},
  );

  worker.on('completed', (job, outcome) => {
    log(`submission ${job.data.submissionId} ${outcome}`);
  });

  worker.on('failed', (job, err) => {
    if (!job) return;
    const attempts = job.opts.attempts ?? 1;
    log(
      `submission ${job.data.submissionId} failed (attempt ${job.attemptsMade}/${attempts}): ${err.message}`,
    );
    if (job.attemptsMade >= attempts) {
      onGiveUp?.(job.data.submissionId);
      void processor.giveUp(job.data.submissionId, err.message);
    }
  });

  return worker;
}
