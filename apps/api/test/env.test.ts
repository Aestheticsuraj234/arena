import {describe, expect, it} from 'vitest';

import {loadEnv} from '../src/env';

const base = {BETTER_AUTH_SECRET: 'x'.repeat(32)};

describe('loadEnv', () => {
  it('treats empty optional variables as unset', () => {
    const env = loadEnv({...base, METRICS_TOKEN: '', COOKIE_DOMAIN: ''});
    expect(env.METRICS_TOKEN).toBeUndefined();
    expect(env.COOKIE_DOMAIN).toBeUndefined();
  });

  it('still rejects a short metrics token', () => {
    expect(() => loadEnv({...base, METRICS_TOKEN: 'short'})).toThrow(/METRICS_TOKEN/);
  });

  it('requires a long auth secret', () => {
    expect(() => loadEnv({BETTER_AUTH_SECRET: 'short'})).toThrow(/BETTER_AUTH_SECRET/);
  });
});
