import {availableParallelism} from 'node:os';

import {describe, expect, it} from 'vitest';

import {loadWorkerEnv} from '../src/env';

describe('loadWorkerEnv', () => {
  it('defaults concurrency to the CPU count', () => {
    expect(loadWorkerEnv({}).WORKER_CONCURRENCY).toBe(availableParallelism());
  });

  it('reads an explicit concurrency', () => {
    expect(loadWorkerEnv({WORKER_CONCURRENCY: '4'}).WORKER_CONCURRENCY).toBe(4);
  });

  it('rejects a bad concurrency', () => {
    expect(() => loadWorkerEnv({WORKER_CONCURRENCY: '0'})).toThrow(/WORKER_CONCURRENCY/);
  });
});
