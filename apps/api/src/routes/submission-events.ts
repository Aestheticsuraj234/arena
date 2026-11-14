import {isFinalStatus} from '@arena/db';
import type {SubmissionEvents} from '@arena/queue';
import type {RunVerdict, SubmissionEvent} from '@arena/shared';
import type {Context} from 'hono';
import {streamSSE} from 'hono/streaming';
import {z} from 'zod';

import type {AppEnv} from '../app-env';
import {NotFoundError} from '../lib/errors';
import type {SubmissionService} from '../services/submission-service';

export interface EventStreamOptions {
  /** Comment lines keep proxies from closing an idle stream. */
  heartbeatMs?: number;
  /** Streams end after this long; the client can reconnect. */
  maxDurationMs?: number;
}

/**
 * `GET /v1/submissions/:token/events`: Server-Sent Events for one submission.
 * Sends the current status first, then `test` and `done` events as the worker
 * publishes them, and closes after `done`.
 */
export function submissionEventsHandler(
  service: SubmissionService,
  events: SubmissionEvents,
  {heartbeatMs = 15_000, maxDurationMs = 120_000}: EventStreamOptions = {},
) {
  return async (c: Context<AppEnv>) => {
    const user = c.get('user');
    const token = z.uuid().safeParse(c.req.param('token'));
    if (!user || !token.success) throw new NotFoundError('Submission not found');
    const existing = await service.submissions.findByToken(token.data);
    if (!existing || existing.userId !== user.id) throw new NotFoundError('Submission not found');

    return streamSSE(c, async (stream) => {
      const pending: SubmissionEvent[] = [];
      let wake: (() => void) | null = null;
      let closed = false;
      // Subscribe before reading the state, so no event falls in between.
      const unsubscribe = events.subscribe(token.data, (event) => {
        pending.push(event);
        wake?.();
      });
      stream.onAbort(() => {
        closed = true;
        wake?.();
      });

      let id = 0;
      const send = (event: SubmissionEvent) =>
        stream.writeSSE({event: event.type, data: JSON.stringify(event), id: String(id++)});

      try {
        const latest = (await service.submissions.findByToken(token.data)) ?? existing;
        await send({type: 'status', token: latest.token, status: latest.status});
        if (isFinalStatus(latest.status)) {
          await send({type: 'done', token: latest.token, status: latest.status as RunVerdict});
          return;
        }

        const deadline = Date.now() + maxDurationMs;
        while (!closed && Date.now() < deadline) {
          if (pending.length === 0) {
            const waitMs = Math.min(heartbeatMs, deadline - Date.now());
            await new Promise<void>((resolve) => {
              wake = resolve;
              setTimeout(resolve, waitMs);
            });
            wake = null;
          }
          if (pending.length === 0) {
            if (!closed) await stream.write(': heartbeat\n\n');
            continue;
          }
          const event = pending.shift();
          if (!event) continue;
          await send(event);
          if (event.type === 'done') return;
        }
      } finally {
        unsubscribe();
      }
    });
  };
}
