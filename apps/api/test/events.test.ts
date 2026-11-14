import type {SubmissionEvent, SubmissionView} from '@arena/shared';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createTestContext} from './helpers';

const ctx = createTestContext();
let cookie = '';

beforeAll(async () => {
  await ctx.seedLanguages();
  cookie = (await ctx.signUp('Watcher')).cookie;
  ctx.executor.solve = (input) => {
    const [a = 0, b = 0] = input.trim().split(/\s+/).map(Number);
    return `${a + b}\n`;
  };
});

afterAll(async () => {
  await ctx.pool.end();
});

/** Parses an SSE body into the JSON payloads of its `data:` lines. */
function parseEvents(text: string): SubmissionEvent[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)) as SubmissionEvent);
}

function openStream(token: string, as = cookie) {
  return ctx.app.request(`/v1/submissions/${token}/events`, {headers: {Cookie: as}});
}

describe('GET /v1/submissions/:token/events', () => {
  it('sends status and done right away for a finished submission', async () => {
    const res = await ctx.app.request('/v1/run', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify({languageId: 71, sourceCode: 'print(1)'}),
    });
    const {token} = (await res.json()) as SubmissionView;
    const stream = await openStream(token);
    expect(stream.headers.get('content-type')).toMatch(/text\/event-stream/);
    expect(parseEvents(await stream.text()).map((e) => e.type)).toEqual(['status', 'done']);
  });

  it('streams processing, every test and done while a problem is judged', async () => {
    ctx.queue.paused = true;
    const pending = ctx.app.request('/v1/problems/sum-of-two/submit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify({languageId: 71, sourceCode: 'solution'}),
    });
    const accepted = (await (await pending).json()) as SubmissionView;
    expect(accepted.status).toBe('in_queue');

    const stream = await openStream(accepted.token);
    const body = stream.text();
    // The worker picks it up while the client is listening.
    const id = ctx.queue.pending.shift();
    ctx.queue.paused = false;
    if (!id) throw new Error('nothing queued');
    await ctx.processor.process(id);

    const events = parseEvents(await body);
    expect(events.map((e) => e.type)).toEqual([
      'status',
      'status',
      'test',
      'test',
      'test',
      'test',
      'done',
    ]);
    expect(events[0]).toMatchObject({status: 'in_queue'});
    expect(events[1]).toMatchObject({status: 'processing'});
    expect(events[2]).toMatchObject({position: 0, status: 'accepted', total: 4});
    expect(events.at(-1)).toMatchObject({type: 'done', status: 'accepted'});
    expect(ctx.events.listenerCount).toBe(0); // unsubscribed after done
  });

  it("does not stream someone else's submission", async () => {
    const res = await ctx.app.request('/v1/run', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify({languageId: 71, sourceCode: 'print(1)'}),
    });
    const {token} = (await res.json()) as SubmissionView;
    const other = await ctx.signUp('Other');
    expect((await openStream(token, other.cookie)).status).toBe(404);
    expect((await openStream('not-a-token')).status).toBe(404);
  });
});
