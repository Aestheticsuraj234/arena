import {pino, type Logger} from 'pino';

export type {Logger};

export interface LoggerOptions {
  /** `api`, `worker`… added to every line as `service`. */
  service: string;
  level?: string;
}

/**
 * JSON logs, one object per line, ready for Loki, CloudWatch or `jq`. Never
 * log source code, stdin or API keys; log IDs and tokens instead.
 */
export function createLogger({service, level = process.env.LOG_LEVEL ?? 'info'}: LoggerOptions) {
  return pino({
    level,
    base: {service},
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-auth-token"]'],
      censor: '[redacted]',
    },
  });
}
