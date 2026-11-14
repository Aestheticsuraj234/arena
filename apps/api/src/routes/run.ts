import {isFinalStatus} from '@arena/db';
import {runRequestSchema} from '@arena/shared';
import {Hono} from 'hono';

import type {AppEnv} from '../app-env';
import {UnauthorizedError} from '../lib/errors';
import {parseBody} from '../lib/validate';
import {requireUser} from '../middleware/session';
import {toSubmissionView, type SubmissionService} from '../services/submission-service';

/**
 * `POST /v1/run`: queue the code and wait for the verdict. Answers 200 with
 * the result, or 202 with the token if it takes longer than `waitMs`.
 */
export function runRoutes(service: SubmissionService, waitMs: number) {
  return new Hono<AppEnv>().post('/', requireUser, async (c) => {
    const user = c.get('user');
    if (!user) throw new UnauthorizedError();
    const body = await parseBody(c, runRequestSchema);
    const created = await service.create({userId: user.id, ...body});
    if (c.req.query('wait') === 'false') return c.json(toSubmissionView(created), 202);
    const latest = await service.waitForResult(created, waitMs);
    return c.json(toSubmissionView(latest), isFinalStatus(latest.status) ? 200 : 202);
  });
}
