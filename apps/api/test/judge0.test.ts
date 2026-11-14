import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {createTestContext} from './helpers';

const ctx = createTestContext();
let cookie = '';

const OK_RESULT = structuredClone(ctx.executor.result);

beforeAll(async () => {
  await ctx.seedLanguages();
  cookie = (await ctx.signUp('Judge')).cookie;
});

beforeEach(() => {
  ctx.executor.result = structuredClone(OK_RESULT);
});

afterAll(async () => {
  await ctx.pool.end();
});

/** A fresh key per call keeps tests clear of the rate limit (5 per key here). */
async function newKey() {
  return ctx.createApiKey(cookie);
}

async function post(key: string | null, body: unknown, query = '') {
  return ctx.app.request(`/submissions${query}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...(key ? {'X-Auth-Token': key} : {})},
    body: JSON.stringify(body),
  });
}

async function get(key: string, token: string, query = '') {
  const res = await ctx.app.request(`/submissions/${token}${query}`, {
    headers: {'X-Auth-Token': key},
  });
  return {status: res.status, body: (await res.json()) as Record<string, unknown>};
}

const PY = {source_code: 'print(1)', language_id: 71};

describe('Judge0 public endpoints', () => {
  it('GET /statuses returns the 14 Judge0 statuses', async () => {
    const body = (await (await ctx.app.request('/statuses')).json()) as Array<{id: number}>;
    expect(body.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it('GET /languages lists id and name', async () => {
    const body = (await (await ctx.app.request('/languages')).json()) as Array<{name: string}>;
    expect(body).toContainEqual({id: 71, name: 'Python (3.12)'});
  });

  it('GET /languages/:id shows the commands', async () => {
    const body = (await (await ctx.app.request('/languages/54')).json()) as Record<string, unknown>;
    expect(body).toMatchObject({id: 54, source_file: 'main.cpp', run_cmd: './main'});
    expect(body.compile_cmd).toMatch(/^g\+\+ /);
  });
});

describe('Judge0 authentication', () => {
  it('rejects a missing or invalid key', async () => {
    expect((await post(null, PY)).status).toBe(401);
    expect((await post('arena_wrong', PY)).status).toBe(401);
  });

  it('accepts Authorization: Bearer as well', async () => {
    const key = await newKey();
    const res = await ctx.app.request('/submissions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${key}`},
      body: JSON.stringify(PY),
    });
    expect(res.status).toBe(201);
  });

  it('rejects a revoked key', async () => {
    const key = await newKey();
    const list = (await (
      await ctx.app.request('/v1/api-keys', {headers: {Cookie: cookie}})
    ).json()) as Array<{id: string; prefix: string}>;
    const id = list.find((k) => key.startsWith(k.prefix))?.id;
    const del = await ctx.app.request(`/v1/api-keys/${id}`, {
      method: 'DELETE',
      headers: {Cookie: cookie},
    });
    expect(del.status).toBe(204);
    expect((await post(key, PY)).status).toBe(401);
  });
});

describe('POST /submissions', () => {
  it('returns a token, and GET returns the default fields', async () => {
    const key = await newKey();
    const res = await post(key, PY);
    expect(res.status).toBe(201);
    const {token} = (await res.json()) as {token: string};
    const {body} = await get(key, token);
    expect(Object.keys(body).sort()).toEqual(
      ['compile_output', 'memory', 'message', 'status', 'stderr', 'stdout', 'time', 'token'].sort(),
    );
    expect(body).toMatchObject({
      status: {id: 3, description: 'Accepted'},
      stdout: 'fake\n',
      time: '0.005',
      memory: 1000,
    });
  });

  it('wait=true returns the result directly', async () => {
    const res = await post(await newKey(), PY, '?wait=true');
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({status: {id: 3}, stdout: 'fake\n'});
  });

  it('compares expected_output: Wrong Answer', async () => {
    const res = await post(await newKey(), {...PY, expected_output: '2'}, '?wait=true');
    expect(await res.json()).toMatchObject({status: {id: 4, description: 'Wrong Answer'}});
  });

  it('decodes and encodes base64', async () => {
    const b64 = (s: string) => Buffer.from(s).toString('base64');
    const res = await post(
      await newKey(),
      {source_code: b64('print(input())'), language_id: 71, stdin: b64('hi')},
      '?base64_encoded=true&wait=true',
    );
    expect(await res.json()).toMatchObject({stdout: b64('fake\n')});
    expect(ctx.executor.jobs.at(-1)).toMatchObject({sourceCode: 'print(input())', inputs: ['hi']});
  });

  it('rejects invalid base64 in Judge0 error format', async () => {
    const res = await post(
      await newKey(),
      {source_code: '%%%', language_id: 71},
      '?base64_encoded=true',
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({source_code: ['is not valid base64']});
  });

  it('reports missing and unknown fields like Judge0', async () => {
    const missing = await post(await newKey(), {source_code: 'x'});
    expect(missing.status).toBe(422);
    expect(await missing.json()).toEqual({language_id: ["can't be blank"]});
    const unknown = await post(await newKey(), {source_code: 'x', language_id: 9999});
    expect(await unknown.json()).toEqual({language_id: ["language with id 9999 doesn't exist"]});
  });

  it('converts cpu_time_limit seconds and memory_limit KB', async () => {
    await post(await newKey(), {...PY, cpu_time_limit: 1.5, memory_limit: 131072});
    expect(ctx.executor.jobs.at(-1)?.limits).toMatchObject({
      timeLimitMs: 1500,
      memoryLimitKb: 131_072,
    });
  });

  it('maps a segfault to Runtime Error (SIGSEGV) with fields=*', async () => {
    ctx.executor.result = {
      compile: null,
      runs: [
        {
          status: 'runtime_error',
          stdout: '',
          stderr: '',
          exitCode: null,
          signal: 'SIGSEGV',
          timeMs: 2,
          memoryKb: 900,
          message: 'Killed by SIGSEGV',
        },
      ],
    };
    const res = await post(await newKey(), PY, '?wait=true&fields=*');
    expect(await res.json()).toMatchObject({
      status: {id: 7, description: 'Runtime Error (SIGSEGV)'},
      exit_signal: 11,
      language: {id: 71, name: 'Python (3.12)'},
      cpu_time_limit: 2,
    });
  });

  it('returns only the requested fields', async () => {
    const res = await post(await newKey(), PY, '?wait=true&fields=token,status_id');
    expect(Object.keys((await res.json()) as object).sort()).toEqual(['status_id', 'token']);
  });

  it('rate-limits per key with 429 and Retry-After', async () => {
    const key = await newKey();
    for (let i = 0; i < 5; i++) expect((await post(key, PY)).status).toBe(201);
    const limited = await post(key, PY);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    expect(limited.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it("does not show another user's submission", async () => {
    const res = await post(await newKey(), PY);
    const {token} = (await res.json()) as {token: string};
    const stranger = await ctx.signUp('Stranger');
    const strangerKey = await ctx.createApiKey(stranger.cookie);
    expect((await get(strangerKey, token)).status).toBe(404);
  });
});

describe('/v1/api-keys', () => {
  it('shows the full key once and only the prefix afterwards', async () => {
    const res = await ctx.app.request('/v1/api-keys', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify({name: 'laptop'}),
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as {key: string; prefix: string};
    const list = await (await ctx.app.request('/v1/api-keys', {headers: {Cookie: cookie}})).text();
    expect(list).toContain(created.prefix);
    expect(list).not.toContain(created.key);
  });
});

describe('Judge0 batch', () => {
  async function postBatch(key: string, submissions: unknown, query = '') {
    return ctx.app.request(`/submissions/batch${query}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Auth-Token': key},
      body: JSON.stringify({submissions}),
    });
  }

  it('creates several submissions and reads them back in order', async () => {
    const key = await newKey();
    const res = await postBatch(key, [PY, {...PY, stdin: 'x'}]);
    expect(res.status).toBe(201);
    const created = (await res.json()) as Array<{token: string}>;
    expect(created).toHaveLength(2);

    const tokens = [created[1]?.token, 'not-a-token', created[0]?.token].join(',');
    const got = await ctx.app.request(
      `/submissions/batch?tokens=${tokens}&fields=token,status_id`,
      {
        headers: {'X-Auth-Token': key},
      },
    );
    expect(await got.json()).toEqual({
      submissions: [
        {token: created[1]?.token, status_id: 3},
        null,
        {token: created[0]?.token, status_id: 3},
      ],
    });
  });

  it('returns per-item errors next to valid tokens', async () => {
    const res = await postBatch(await newKey(), [PY, {source_code: 'x'}, {...PY, language_id: 1}]);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body[0]).toHaveProperty('token');
    expect(body[1]).toEqual({language_id: ["can't be blank"]});
    expect(body[2]).toEqual({language_id: ["language with id 1 doesn't exist"]});
  });

  it('rejects an empty or oversized batch', async () => {
    const key = await newKey();
    expect((await postBatch(key, [])).status).toBe(422);
    expect(
      (
        await postBatch(
          key,
          Array.from({length: 21}, () => PY),
        )
      ).status,
    ).toBe(422);
  });

  it('charges every item against the rate limit', async () => {
    const key = await newKey();
    expect((await postBatch(key, [PY, PY, PY, PY])).status).toBe(201);
    expect((await postBatch(key, [PY, PY])).status).toBe(429);
  });
});
