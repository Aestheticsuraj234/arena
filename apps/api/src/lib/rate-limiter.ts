import type {Redis} from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  resetSeconds: number;
}

/** Counts actions per key in fixed windows. */
export interface RateLimiter {
  consume(key: string, cost?: number): Promise<RateLimitResult>;
}

/**
 * Fixed-window limiter on Redis: one `INCRBY` per request, and the key expires
 * with the window. Shared by every API instance.
 */
export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly redis: Redis,
    private readonly limit: number,
    private readonly windowSeconds = 60,
  ) {}

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const window = Math.floor(Date.now() / 1000 / this.windowSeconds);
    const redisKey = `ratelimit:${key}:${window}`;
    const results = await this.redis
      .multi()
      .incrby(redisKey, cost)
      .expire(redisKey, this.windowSeconds, 'NX')
      .exec();
    const used = Number(results?.[0]?.[1] ?? 0);
    const resetSeconds = this.windowSeconds - (Math.floor(Date.now() / 1000) % this.windowSeconds);
    return {
      allowed: used <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - used),
      resetSeconds,
    };
  }
}

/** In-process limiter for tests and single-instance development. */
export class MemoryRateLimiter implements RateLimiter {
  private readonly used = new Map<string, number>();

  constructor(private readonly limit: number) {}

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const used = (this.used.get(key) ?? 0) + cost;
    this.used.set(key, used);
    return {
      allowed: used <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - used),
      resetSeconds: 60,
    };
  }
}
