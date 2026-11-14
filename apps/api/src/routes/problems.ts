import {isFinalStatus} from '@arena/db';
import {submitProblemSchema, type ProblemDetail, type ProblemSummary} from '@arena/shared';
import {Hono} from 'hono';

import type {AppEnv} from '../app-env';
import {NotFoundError, UnauthorizedError} from '../lib/errors';
import {parseBody} from '../lib/validate';
import {requireUser} from '../middleware/session';
import type {SubmissionService} from '../services/submission-service';

/**
 * Problems: list and read are public; `run` (samples only) and `submit` (all
 * tests) need a signed-in user and wait for the verdict like `/v1/run`.
 */
export function problemRoutes(service: SubmissionService, waitMs: number) {
  return new Hono<AppEnv>()
    .get('/', async (c) => {
      const rows = await service.problems.list();
      const body: ProblemSummary[] = rows.map(({slug, title, difficulty}) => ({
        slug,
        title,
        difficulty,
      }));
      return c.json(body);
    })
    .get('/:slug', async (c) => {
      const problem = await service.problems.findBySlug(c.req.param('slug'));
      if (!problem) throw new NotFoundError('Problem not found');
      const body: ProblemDetail = {
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        description: problem.description,
        timeLimitMs: problem.timeLimitMs,
        memoryLimitKb: problem.memoryLimitKb,
        samples: problem.testCases
          .filter((t) => t.isSample)
          .map(({input, expectedOutput}) => ({input, expectedOutput})),
        totalTests: problem.testCases.length,
      };
      return c.json(body);
    })
    .post('/:slug/submit', requireUser, async (c) => {
      const user = c.get('user');
      if (!user) throw new UnauthorizedError();
      const problem = await service.problems.findBySlug(c.req.param('slug'));
      if (!problem) throw new NotFoundError('Problem not found');
      const body = await parseBody(c, submitProblemSchema);
      const created = await service.create({
        source: 'problem',
        userId: user.id,
        languageId: body.languageId,
        sourceCode: body.sourceCode,
        stdin: '',
        problemId: problem.id,
        sampleOnly: body.mode === 'run',
        timeLimitMs: problem.timeLimitMs,
        memoryLimitKb: problem.memoryLimitKb,
      });
      // `?wait=false` answers at once, for clients that follow the SSE stream.
      if (c.req.query('wait') === 'false') return c.json(await service.view(created), 202);
      const latest = await service.waitForResult(created, waitMs);
      return c.json(await service.view(latest), isFinalStatus(latest.status) ? 200 : 202);
    });
}
