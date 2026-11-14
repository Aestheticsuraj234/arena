import {randomUUID} from 'node:crypto';

import type {ApiMetrics, Logger} from '@arena/telemetry';
import {createMiddleware} from 'hono/factory';
import {routePath} from 'hono/route';

import type {AppEnv} from '../app-env';

const REQUEST_ID = /^[\w-]{8,64}$/;

/**
 * Gives every request an ID (kept from `X-Request-Id` if valid), logs one line
 * per request, and records count and duration by route pattern, so
 * `/submissions/:token` is one series, not one per token.
 */
export function observe(logger: Logger, metrics: ApiMetrics) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const incoming = c.req.header('x-request-id');
    const requestId = incoming && REQUEST_ID.test(incoming) ? incoming : randomUUID();
    c.set('requestId', requestId);
    c.set('log', logger.child({requestId}));
    c.header('X-Request-Id', requestId);

    const started = performance.now();
    try {
      await next();
    } finally {
      const seconds = (performance.now() - started) / 1000;
      // The last matched route is the handler's pattern; '/*' means nothing matched.
      const last = routePath(c, -1);
      const route = c.res.status === 404 && last.endsWith('*') ? 'unmatched' : last;
      const status = String(c.res.status);
      metrics.httpRequests.inc({method: c.req.method, route, status});
      metrics.httpDuration.observe({method: c.req.method, route}, seconds);
      if (route !== '/metrics' && route !== '/health') {
        const level = c.res.status >= 500 ? 'error' : 'info';
        logger[level](
          {
            requestId,
            method: c.req.method,
            route,
            status: c.res.status,
            ms: Math.round(seconds * 1000),
          },
          'request',
        );
      }
    }
  });
}
