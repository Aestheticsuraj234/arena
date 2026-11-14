import {LanguageRepository, type Database} from '@arena/db';
import {toRunResponse, type Executor, type LanguageRegistry} from '@arena/engine';
import {DEFAULT_LIMITS, runRequestSchema} from '@arena/shared';
import {Hono} from 'hono';

import type {AppEnv} from '../app-env';
import {ValidationError} from '../lib/errors';
import {parseBody} from '../lib/validate';
import {requireUser} from '../middleware/session';

/**
 * `POST /v1/run`: runs code and waits for the result. Synchronous on purpose
 * for this chapter; Chapter 6 moves execution to a queue and workers.
 */
export function runRoutes(db: Database, registry: LanguageRegistry, executor: Executor) {
  const languages = new LanguageRepository(db);
  return new Hono<AppEnv>().post('/', requireUser, async (c) => {
    const body = await parseBody(c, runRequestSchema);
    const language = await languages.findById(body.languageId);
    if (!language?.isActive || !registry.has(body.languageId)) {
      throw new ValidationError(`languageId: ${body.languageId} is not supported`);
    }
    const result = await executor.execute({
      languageId: body.languageId,
      sourceCode: body.sourceCode,
      inputs: [body.stdin],
      limits: {
        timeLimitMs: body.timeLimitMs ?? DEFAULT_LIMITS.timeLimitMs,
        memoryLimitKb: body.memoryLimitKb ?? DEFAULT_LIMITS.memoryLimitKb,
        outputLimitBytes: DEFAULT_LIMITS.outputLimitBytes,
      },
    });
    return c.json(toRunResponse(result));
  });
}
