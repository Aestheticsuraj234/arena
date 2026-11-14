import type {SubmissionEvent} from '@arena/shared';
import type {Redis} from 'ioredis';

export const SUBMISSION_EVENTS_CHANNEL = 'arena:submission-events';

export type SubmissionEventListener = (event: SubmissionEvent) => void;

/** Publishes and fans out live submission events. */
export interface SubmissionEvents {
  publish(event: SubmissionEvent): Promise<void>;
  /** Listens for one submission's events. Returns an unsubscribe function. */
  subscribe(token: string, listener: SubmissionEventListener): () => void;
  close(): Promise<void>;
}

/** Keeps listeners per token and dispatches events to them. */
class ListenerHub {
  private readonly listeners = new Map<string, Set<SubmissionEventListener>>();

  add(token: string, listener: SubmissionEventListener): () => void {
    const set = this.listeners.get(token) ?? new Set();
    set.add(listener);
    this.listeners.set(token, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(token);
    };
  }

  dispatch(event: SubmissionEvent): void {
    for (const listener of this.listeners.get(event.token) ?? []) listener(event);
  }

  get size(): number {
    return this.listeners.size;
  }
}

/**
 * Redis pub/sub: workers publish, every API instance receives every event on
 * one shared subscription and hands it to the SSE streams for that token.
 * Events are fire-and-forget; Postgres stays the source of truth.
 */
export class RedisSubmissionEvents implements SubmissionEvents {
  private readonly hub = new ListenerHub();
  private subscriber: Redis | null = null;

  constructor(private readonly publisher: Redis) {}

  async publish(event: SubmissionEvent): Promise<void> {
    await this.publisher.publish(SUBMISSION_EVENTS_CHANNEL, JSON.stringify(event));
  }

  subscribe(token: string, listener: SubmissionEventListener): () => void {
    this.ensureSubscribed();
    return this.hub.add(token, listener);
  }

  /** Resolves once the shared subscription is active. */
  async ready(): Promise<void> {
    this.ensureSubscribed();
    await this.subscriber?.subscribe(SUBMISSION_EVENTS_CHANNEL);
  }

  async close(): Promise<void> {
    await this.subscriber?.quit();
    this.subscriber = null;
  }

  private ensureSubscribed(): void {
    if (this.subscriber) return;
    // A subscribed connection cannot run other commands, so it gets its own.
    const sub = this.publisher.duplicate();
    sub.on('message', (_channel: string, message: string) => {
      try {
        this.hub.dispatch(JSON.parse(message) as SubmissionEvent);
      } catch {
        // Ignore malformed messages; they are not ours.
      }
    });
    void sub.subscribe(SUBMISSION_EVENTS_CHANNEL);
    this.subscriber = sub;
  }
}

/** Same behavior in one process, for tests and the in-memory queue. */
export class MemorySubmissionEvents implements SubmissionEvents {
  private readonly hub = new ListenerHub();
  readonly published: SubmissionEvent[] = [];

  async publish(event: SubmissionEvent): Promise<void> {
    this.published.push(event);
    this.hub.dispatch(event);
  }

  subscribe(token: string, listener: SubmissionEventListener): () => void {
    return this.hub.add(token, listener);
  }

  get listenerCount(): number {
    return this.hub.size;
  }

  async close(): Promise<void> {}
}

/** Publisher that drops events, for processors that do not need them. */
export const NO_EVENTS: Pick<SubmissionEvents, 'publish'> = {
  publish: async () => undefined,
};
