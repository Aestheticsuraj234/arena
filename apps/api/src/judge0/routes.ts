import {LanguageRepository, type ApiKey, type Database, type Language} from '@arena/db';
import type {LanguageRegistry} from '@arena/engine';
import {Hono, type Context} from 'hono';
import {z} from 'zod';

import type {AppEnv} from '../app-env';
import {AppError, NotFoundError, UnauthorizedError} from '../lib/errors';
import type {RateLimiter} from '../lib/rate-limiter';
import {requireApiKey} from '../middleware/api-key';
import {API_VERSION} from '../routes/health';
import type {NewRun, SubmissionService} from '../services/submission-service';
import {
  decodeBase64,
  judge0SubmissionSchema,
  LENGTH_LIMITS,
  toFieldErrors,
  type Judge0FieldErrors,
  type Judge0SubmissionBody,
} from './schema';
import {parseFields, toJudge0Submission} from './serializer';
import {JUDGE0_STATUSES} from './statuses';

export class RateLimitedError extends AppError {
  constructor(readonly resetSeconds: number) {
    super(429, 'rate_limited', `Rate limit exceeded. Try again in ${resetSeconds} s`);
  }
}

export interface Judge0Deps {
  db: Database;
  registry: LanguageRegistry;
  service: SubmissionService;
  rateLimiter: RateLimiter;
  waitMs: number;
}

const flag = (value: string | undefined) => value === 'true' || value === '1';
const tokenSchema = z.uuid();

/**
 * Judge0 CE compatible endpoints, mounted at the root so existing Judge0
 * clients only change their base URL and send an Arena API key.
 */
export function judge0Routes({db, registry, service, rateLimiter, waitMs}: Judge0Deps) {
  const languages = new LanguageRepository(db);
  const app = new Hono<AppEnv>();

  async function languageMap(): Promise<Map<number, Language>> {
    const rows = await languages.listActive();
    return new Map(rows.filter((l) => registry.has(l.id)).map((l) => [l.id, l]));
  }

  app.get('/about', (c) =>
    c.json({version: API_VERSION, homepage: 'https://github.com/', source_code: 'arena'}),
  );

  app.get('/statuses', (c) => c.json(JUDGE0_STATUSES));

  app.get('/languages', async (c) => {
    const map = await languageMap();
    return c.json([...map.values()].map((l) => ({id: l.id, name: `${l.name} (${l.version})`})));
  });

  app.get('/languages/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const language = (await languageMap()).get(id);
    if (!language) throw new NotFoundError('Language not found');
    const runner = registry.get(id);
    return c.json({
      id,
      name: `${language.name} (${language.version})`,
      is_archived: false,
      source_file: runner.sourceFile,
      compile_cmd: runner.compileCommand()?.join(' ') ?? null,
      run_cmd: runner.runCommand().join(' '),
    });
  });

  app.use('/submissions/*', requireApiKey(db));
  app.use('/submissions', requireApiKey(db));

  /** Charges `cost` submissions to the key and sets the rate-limit headers. */
  async function charge(c: Context<AppEnv>, apiKey: ApiKey, cost: number) {
    const limit = await rateLimiter.consume(`apikey:${apiKey.id}`, cost);
    c.header('X-RateLimit-Limit', String(limit.limit));
    c.header('X-RateLimit-Remaining', String(limit.remaining));
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.resetSeconds));
      throw new RateLimitedError(limit.resetSeconds);
    }
  }

  // Batch routes come first so "batch" is not read as a token.
  app.post('/submissions/batch', async (c) => {
    const apiKey = c.get('apiKey');
    if (!apiKey) throw new UnauthorizedError();
    const base64 = flag(c.req.query('base64_encoded'));
    const read = await readJson(c);
    if ('errors' in read) return c.json(read.errors, 422);
    const list = batchBodySchema.safeParse(read.json);
    if (!list.success) return c.json(toFieldErrors(list.error), 422);
    await charge(c, apiKey, list.data.submissions.length);

    const parsed = list.data.submissions.map((item) => parseJudge0Item(item, base64, registry));
    const valid = parsed.flatMap((p) => ('body' in p ? [p.body] : []));
    const batchId = valid.length ? await service.submissions.createBatch(apiKey.userId) : null;
    const created = await service.createMany(valid.map((b) => toNewRun(b, apiKey, batchId)));
    let next = 0;
    // One entry per input item, in order: a token, or that item's errors.
    return c.json(
      parsed.map((p) => ('errors' in p ? p.errors : {token: created[next++]?.token})),
      201,
    );
  });

  app.get('/submissions/batch', async (c) => {
    const apiKey = c.get('apiKey');
    if (!apiKey) throw new UnauthorizedError();
    const tokens = (c.req.query('tokens') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0 || tokens.length > MAX_BATCH) {
      return c.json({tokens: [`must list between 1 and ${MAX_BATCH} tokens`]}, 422);
    }
    const valid = tokens.map((t) => (tokenSchema.safeParse(t).success ? t : null));
    const found = await service.submissions.findByTokens(valid.filter((t): t is string => !!t));
    const byToken = new Map(found.flatMap((s) => (s ? [[s.token, s] as const] : [])));
    const fields = parseFields(c.req.query('fields'));
    const base64 = flag(c.req.query('base64_encoded'));
    const langs = await languageMap();
    return c.json({
      submissions: valid.map((t) => {
        const s = t ? byToken.get(t) : undefined;
        if (!s || s.userId !== apiKey.userId) return null;
        return toJudge0Submission(s, langs.get(s.languageId), fields, base64);
      }),
    });
  });

  app.post('/submissions', async (c) => {
    const apiKey = c.get('apiKey');
    if (!apiKey) throw new UnauthorizedError();
    await charge(c, apiKey, 1);

    const base64 = flag(c.req.query('base64_encoded'));
    const read = await readJson(c);
    if ('errors' in read) return c.json(read.errors, 422);
    const parsed = parseJudge0Item(read.json, base64, registry);
    if ('errors' in parsed) return c.json(parsed.errors, 422);
    const created = await service.create(toNewRun(parsed.body, apiKey, null));

    if (!flag(c.req.query('wait'))) return c.json({token: created.token}, 201);
    const done = await service.waitForResult(created, waitMs);
    const fields = parseFields(c.req.query('fields'));
    return c.json(
      toJudge0Submission(done, (await languageMap()).get(done.languageId), fields, base64),
      201,
    );
  });

  app.get('/submissions/:token', async (c) => {
    const apiKey = c.get('apiKey');
    const token = tokenSchema.safeParse(c.req.param('token'));
    if (!apiKey || !token.success) throw new NotFoundError('Submission not found');
    const s = await service.submissions.findByToken(token.data);
    if (!s || s.userId !== apiKey.userId) throw new NotFoundError('Submission not found');
    const fields = parseFields(c.req.query('fields'));
    const base64 = flag(c.req.query('base64_encoded'));
    return c.json(toJudge0Submission(s, (await languageMap()).get(s.languageId), fields, base64));
  });

  return app;
}

/** Judge0's batch limit. */
export const MAX_BATCH = 20;

const batchBodySchema = z.object({
  submissions: z
    .array(z.unknown(), {message: "can't be blank"})
    .min(1, {message: "can't be blank"})
    .max(MAX_BATCH, {message: `size must be at most ${MAX_BATCH}`}),
});

function toNewRun(body: Judge0SubmissionBody, apiKey: ApiKey, batchId: string | null): NewRun {
  return {
    userId: apiKey.userId,
    apiKeyId: apiKey.id,
    batchId,
    languageId: body.language_id,
    sourceCode: body.source_code,
    stdin: body.stdin ?? '',
    expectedOutput: body.expected_output ?? null,
    timeLimitMs: body.cpu_time_limit ? Math.round(body.cpu_time_limit * 1000) : undefined,
    memoryLimitKb: body.memory_limit ?? undefined,
  };
}

type ParsedBody = {body: z.infer<typeof judge0SubmissionSchema>} | {errors: Judge0FieldErrors};

async function readJson(c: Context): Promise<{json: unknown} | {errors: Judge0FieldErrors}> {
  try {
    return {json: await c.req.json()};
  } catch {
    return {errors: {base: ['body must be valid JSON']}};
  }
}

/** Validates one Judge0 submission and decodes base64 fields when asked to. */
function parseJudge0Item(json: unknown, base64: boolean, registry: LanguageRegistry): ParsedBody {
  const result = judge0SubmissionSchema.safeParse(json);
  if (!result.success) return {errors: toFieldErrors(result.error)};
  const body = {...result.data};

  for (const field of ['source_code', 'stdin', 'expected_output'] as const) {
    let value = body[field];
    if (value === null || value === undefined) continue;
    if (base64) {
      const decoded = decodeBase64(value);
      if (decoded === null) return {errors: {[field]: ['is not valid base64']}};
      value = decoded;
      body[field] = decoded;
    }
    if (value.length > LENGTH_LIMITS[field]) {
      return {errors: {[field]: [`is too long (maximum is ${LENGTH_LIMITS[field]} characters)`]}};
    }
  }
  if (!registry.has(body.language_id)) {
    return {errors: {language_id: [`language with id ${body.language_id} doesn't exist`]}};
  }
  return {body};
}
