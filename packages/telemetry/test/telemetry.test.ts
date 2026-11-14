import {afterAll, describe, expect, it} from 'vitest';

import {createApiMetrics, createRegistry, createWorkerMetrics, startOpsServer} from '../src';

describe('metrics', () => {
  it('exposes API metrics with the service label', async () => {
    const registry = createRegistry('api');
    const m = createApiMetrics(registry, async () => 7);
    m.httpRequests.inc({method: 'GET', route: '/health', status: '200'});
    m.submissionsCreated.inc({language: 'python', source: 'judge0'});
    const text = await registry.metrics();
    expect(text).toContain(
      'arena_http_requests_total{method="GET",route="/health",status="200",service="api"} 1',
    );
    expect(text).toContain('arena_queue_depth{service="api"} 7');
    expect(text).toContain('arena_process_cpu_user_seconds_total');
  });

  it('reports -1 queue depth when Redis is down instead of failing the scrape', async () => {
    const registry = createRegistry('api');
    createApiMetrics(registry, async () => {
      throw new Error('redis down');
    });
    expect(await registry.metrics()).toContain('arena_queue_depth{service="api"} -1');
  });

  it('exposes worker metrics', async () => {
    const registry = createRegistry('worker');
    const m = createWorkerMetrics(registry);
    m.processed.inc({language: 'cpp', status: 'accepted'});
    m.executionDuration.observe({language: 'cpp'}, 0.7);
    const text = await registry.metrics();
    expect(text).toContain(
      'arena_submissions_processed_total{language="cpp",status="accepted",service="worker"} 1',
    );
    expect(text).toContain(
      'arena_execution_duration_seconds_bucket{le="1",service="worker",language="cpp"} 1',
    );
  });
});

describe('ops server', () => {
  const registry = createRegistry('worker');
  let healthy = true;
  const server = startOpsServer({
    port: 0,
    registry,
    health: async () => ({redis: healthy, docker: true}),
  });
  const base = server.then((s) => {
    const address = s.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    return `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    (await server).close();
  });

  it('serves /metrics', async () => {
    const res = await fetch(`${await base}/metrics`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('arena_process_');
  });

  it('answers /health with 200, then 503 when a check fails', async () => {
    expect((await fetch(`${await base}/health`)).status).toBe(200);
    healthy = false;
    const res = await fetch(`${await base}/health`);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({status: 'degraded', checks: {redis: false, docker: true}});
  });
});
