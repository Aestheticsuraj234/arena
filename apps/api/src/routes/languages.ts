import {LanguageRepository, type Database} from '@arena/db';
import type {LanguageRegistry} from '@arena/engine';
import type {LanguageInfo} from '@arena/shared';
import {Hono} from 'hono';

/** `GET /v1/languages`: active languages that this server can actually run. */
export function languageRoutes(db: Database, registry: LanguageRegistry) {
  const languages = new LanguageRepository(db);
  return new Hono().get('/', async (c) => {
    const rows = await languages.listActive();
    const body: LanguageInfo[] = rows
      .filter((l) => registry.has(l.id))
      .map(({id, slug, name, version}) => ({id, slug, name, version}));
    return c.json(body);
  });
}
