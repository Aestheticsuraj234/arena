import {createServer, type Server} from 'node:http';

import type {Registry} from 'prom-client';

export interface OpsServerOptions {
  port: number;
  registry: Registry;
  /** Returns named checks; any `false` makes `/health` answer 503. */
  health: () => Promise<Record<string, boolean>>;
}

/**
 * A tiny HTTP server for processes without their own (the worker):
 * `GET /metrics` for Prometheus and `GET /health` for orchestrators.
 */
export function startOpsServer({port, registry, health}: OpsServerOptions): Promise<Server> {
  const server = createServer((req, res) => {
    void (async () => {
      if (req.url === '/metrics') {
        res.setHeader('Content-Type', registry.contentType);
        res.end(await registry.metrics());
        return;
      }
      if (req.url === '/health') {
        const checks = await health().catch(() => ({health: false}));
        const ok = Object.values(checks).every(Boolean);
        res.statusCode = ok ? 200 : 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({status: ok ? 'ok' : 'degraded', checks}));
        return;
      }
      res.statusCode = 404;
      res.end();
    })().catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
