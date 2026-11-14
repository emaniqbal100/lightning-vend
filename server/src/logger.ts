import pino from 'pino';
import type { AppConfig } from '@lightning-vend/shared/config';

export type Logger = pino.Logger;

export function createLogger(config: Pick<AppConfig, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  const usePretty = config.NODE_ENV === 'development' || config.NODE_ENV === 'test';
  return pino({
    level: config.LOG_LEVEL,
    base: { app: 'lightning-vend' },
    redact: {
      paths: [
        '*.OPENNODE_API_KEY',
        '*.CRYPTOVEND_PASS',
        '*.SESSION_SECRET',
        '*.ADMIN_PASSWORD',
        '*.ADMIN_PASSWORD_HASH',
        'req.headers.authorization',
        'req.headers.cookie',
      ],
      censor: '[REDACTED]',
    },
    ...(usePretty
      ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } } }
      : {}),
  });
}
