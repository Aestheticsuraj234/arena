import type {Context} from 'hono';
import type {z} from 'zod';

import {ValidationError} from './errors';

/** Parses the JSON body with a zod schema, or throws a 422 with the first issue. */
export async function parseBody<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    throw new ValidationError('Body must be valid JSON');
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new ValidationError(`${where}${issue?.message ?? 'Invalid body'}`);
  }
  return result.data;
}
