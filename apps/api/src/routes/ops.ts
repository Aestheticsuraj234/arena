import {timingSafeEqual} from 'node:crypto';

import {isDatabaseUp, type Database} from '@arena/db';
import type {Registry} from '@arena/telemetry';
import {Hono} from 'hono';

import {UnauthorizedError} from '../lib/errors';

export interface OpsDeps {
  db: Database;
  metrics: Registry;
  /** When set, `/metrics` needs `Authorization: Bearer <token>`. */
  token?: string;
  checks: Record<string, () => Promise<boolean>>;
}

function sameToken(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * `GET /metrics` for Prometheus, and `GET /ready`: can this instance serve
 * traffic right now (database, Redis)? `/health` stays the cheap liveness check.
 */
export function opsRoutes({db, metrics, token, checks}: OpsDeps) {
  return new Hono()
    .get('/metrics', async (c) => {
      if (token) {
        const auth = c.req.header('authorization') ?? '';
        if (!auth.startsWith('Bearer ') || !sameToken(auth.slice(7), token)) {
          throw new UnauthorizedError('Metrics need a bearer token');
        }
      }
      return c.body(await metrics.metrics(), 200, {'Content-Type': metrics.contentType});
    })
    .get('/ready', async (c) => {
      const results: Record<string, boolean> = {database: await isDatabaseUp(db)};
      for (const [name, check] of Object.entries(checks)) {
        results[name] = await check().catch(() => false);
      }
      const ready = Object.values(results).every(Boolean);
      return c.json({status: ready ? 'ready' : 'not_ready', checks: results}, ready ? 200 : 503);
    });
}
