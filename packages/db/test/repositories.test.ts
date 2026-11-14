import {randomUUID} from 'node:crypto';

import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {
  createDb,
  isDatabaseUp,
  LanguageRepository,
  ProblemRepository,
  SEED_LANGUAGES,
  SubmissionRepository,
} from '../src';

const {db, pool} = createDb(
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/arena',
);
const languages = new LanguageRepository(db);
const problems = new ProblemRepository(db);
const submissions = new SubmissionRepository(db);

beforeAll(async () => {
  await languages.upsertMany(SEED_LANGUAGES);
});

afterAll(async () => {
  await pool.end();
});

describe('client', () => {
  it('reports the database as up', async () => {
    expect(await isDatabaseUp(db)).toBe(true);
  });
});

describe('LanguageRepository', () => {
  it('lists active languages sorted by name', async () => {
    const list = await languages.listActive();
    const names = list.map((l) => l.name);
    expect(names).toEqual([...names].sort());
    expect(list.map((l) => l.id)).toEqual(expect.arrayContaining([50, 54, 62, 63, 71, 74]));
  });

  it('finds Python by its Judge0 ID', async () => {
    expect(await languages.findById(71)).toMatchObject({slug: 'python'});
    expect(await languages.findById(9999)).toBeUndefined();
  });

  it('upserts without duplicating', async () => {
    await languages.upsertMany(SEED_LANGUAGES);
    const pythons = (await languages.listActive()).filter((l) => l.slug === 'python');
    expect(pythons).toHaveLength(1);
  });
});

describe('ProblemRepository', () => {
  const slug = `test-${randomUUID()}`;

  it('creates a problem with ordered test cases', async () => {
    await problems.upsert({
      slug,
      title: 'Echo',
      description: 'Print the input',
      difficulty: 'easy',
      testCases: [
        {input: 'a', expectedOutput: 'a', isSample: true},
        {input: 'b', expectedOutput: 'b'},
      ],
    });
    const found = await problems.findBySlug(slug);
    expect(found?.testCases.map((t) => [t.position, t.input, t.isSample])).toEqual([
      [0, 'a', true],
      [1, 'b', false],
    ]);
    expect(found?.timeLimitMs).toBe(2000);
  });

  it('replaces test cases on a second upsert', async () => {
    await problems.upsert({
      slug,
      title: 'Echo v2',
      description: 'Print the input',
      difficulty: 'medium',
      testCases: [{input: 'c', expectedOutput: 'c'}],
    });
    const found = await problems.findBySlug(slug);
    expect(found?.title).toBe('Echo v2');
    expect(found?.testCases).toHaveLength(1);
  });

  it('returns undefined for an unknown slug', async () => {
    expect(await problems.findBySlug('does-not-exist')).toBeUndefined();
  });
});

describe('SubmissionRepository', () => {
  const base = {languageId: 71, sourceCode: 'print(1)', timeLimitMs: 2000, memoryLimitKb: 131072};

  it('creates a queued submission with a token', async () => {
    const created = await submissions.create(base);
    expect(created.status).toBe('in_queue');
    expect(created.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(await submissions.findByToken(created.token)).toMatchObject({id: created.id});
  });

  it('lets only one worker take a submission', async () => {
    const created = await submissions.create(base);
    const results = await Promise.all([
      submissions.markProcessing(created.id),
      submissions.markProcessing(created.id),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('saves a result and sets finishedAt', async () => {
    const created = await submissions.create(base);
    const saved = await submissions.saveResult(created.id, {
      status: 'accepted',
      stdout: '1\n',
      exitCode: 0,
      timeMs: 12,
      memoryKb: 9000,
    });
    expect(saved).toMatchObject({status: 'accepted', stdout: '1\n', timeMs: 12});
    expect(saved.finishedAt).toBeInstanceOf(Date);
  });

  it('returns batch lookups in request order', async () => {
    const [a, b] = await submissions.createMany([base, base]);
    if (!a || !b) throw new Error('createMany returned too few rows');
    const found = await submissions.findByTokens([b.token, randomUUID(), a.token]);
    expect(found.map((s) => s?.id)).toEqual([b.id, undefined, a.id]);
  });
});
