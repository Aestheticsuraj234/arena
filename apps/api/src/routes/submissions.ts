import type {SubmissionEvents} from '@arena/queue';
import {createSubmissionSchema} from '@arena/shared';
import {Hono} from 'hono';
import {z} from 'zod';

import type {AppEnv} from '../app-env';
import {NotFoundError, UnauthorizedError} from '../lib/errors';
import {parseBody} from '../lib/validate';
import {requireUser} from '../middleware/session';
import {toSubmissionView, type SubmissionService} from '../services/submission-service';
import {submissionEventsHandler, type EventStreamOptions} from './submission-events';

const tokenSchema = z.uuid();
const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Async submissions for signed-in users: create, read one, list mine. */
export function submissionRoutes(
  service: SubmissionService,
  events: SubmissionEvents,
  streamOptions?: EventStreamOptions,
) {
  return new Hono<AppEnv>()
    .use(requireUser)
    .post('/', async (c) => {
      const user = c.get('user');
      if (!user) throw new UnauthorizedError();
      const body = await parseBody(c, createSubmissionSchema);
      const created = await service.create({userId: user.id, ...body});
      return c.json({token: created.token, status: created.status}, 201);
    })
    .get('/', async (c) => {
      const user = c.get('user');
      if (!user) throw new UnauthorizedError();
      const {limit, offset} = pageSchema.parse(c.req.query());
      const rows = await service.submissions.listByUser(user.id, limit, offset);
      return c.json(rows.map((s) => toSubmissionView(s)));
    })
    .get('/:token/events', submissionEventsHandler(service, events, streamOptions))
    .get('/:token', async (c) => {
      const user = c.get('user');
      const token = tokenSchema.safeParse(c.req.param('token'));
      if (!user || !token.success) throw new NotFoundError('Submission not found');
      const submission = await service.submissions.findByToken(token.data);
      // Someone else's submission looks the same as a missing one.
      if (!submission || submission.userId !== user.id) {
        throw new NotFoundError('Submission not found');
      }
      return c.json(await service.view(submission));
    });
}
