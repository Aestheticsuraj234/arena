import {Redis} from 'ioredis';

/**
 * A Redis connection BullMQ can use. Workers block on Redis, so
 * `maxRetriesPerRequest` must be null.
 */
export function createRedis(url: string): Redis {
  return new Redis(url, {maxRetriesPerRequest: null});
}
