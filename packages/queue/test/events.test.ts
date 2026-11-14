/** Redis pub/sub fan-out between a "worker" and an "API instance". */
import type {SubmissionEvent} from '@arena/shared';
import {afterAll, describe, expect, it} from 'vitest';

import {createRedis, RedisSubmissionEvents} from '../src';

const url = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15';
const workerSide = new RedisSubmissionEvents(createRedis(url));
const apiSide = new RedisSubmissionEvents(createRedis(url));

afterAll(async () => {
  await workerSide.close();
  await apiSide.close();
});

describe('RedisSubmissionEvents', () => {
  it('delivers events only to listeners of that token', async () => {
    await apiSide.ready();
    const mine: SubmissionEvent[] = [];
    const other: SubmissionEvent[] = [];
    const stopMine = apiSide.subscribe('token-a', (e) => mine.push(e));
    const stopOther = apiSide.subscribe('token-b', (e) => other.push(e));

    await workerSide.publish({type: 'status', token: 'token-a', status: 'processing'});
    await workerSide.publish({type: 'done', token: 'token-a', status: 'accepted'});
    await expect.poll(() => mine.length).toBe(2);
    expect(mine.map((e) => e.type)).toEqual(['status', 'done']);
    expect(other).toEqual([]);

    stopMine();
    await workerSide.publish({type: 'done', token: 'token-a', status: 'accepted'});
    await new Promise((r) => setTimeout(r, 100));
    expect(mine).toHaveLength(2);
    stopOther();
  });
});
