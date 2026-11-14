import type {ApiKey} from '@arena/db';

import type {SessionData} from './auth';

/** Variables middleware puts on the Hono context. */
export interface AppEnv {
  Variables: {
    user: SessionData['user'] | null;
    session: SessionData['session'] | null;
    apiKey: ApiKey | null;
  };
}
