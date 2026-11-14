import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import type { LanguageCode, MachineName, ProviderName } from './types.js';

// Server-side environment configuration. Validated at startup; never sent to the browser.
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    DB_PATH: z.string().default('./data/lightning-vend.db'),

    // Provider selection
    PROVIDER: z.enum(['mock', 'opennode', 'lnbits', 'btcpay']).default('mock'),
    OPENNODE_API_KEY: z.string().optional(),
    OPENNODE_ENV: z.enum(['dev', 'live']).default('dev'),

    // Machine selection
    MACHINE: z.enum(['mock', 'cryptovend']).default('mock'),
    CRYPTOVEND_BASE_URL: z.string().url().or(z.literal('')).optional(),
    CRYPTOVEND_USER: z.string().optional(),
    CRYPTOVEND_PASS: z.string().optional(),
    CRYPTOVEND_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

    PUBLIC_URL: z.string().url().or(z.literal('')).optional(),

    // Kiosk
    KIOSK_DEFAULT_LANGUAGE: z.enum(['en', 'ur', 'es']).default('en'),
    POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
    BTC_EXCHANGE_RATE: z.coerce.number().positive().optional(), // mock fiat->sats rate (sats per 1 unit fiat)

    // Pricing defaults (also editable at runtime via admin settings)
    DEFAULT_PRICE: z.coerce.number().positive().default(1.5),
    DEFAULT_CURRENCY: z.string().length(3).default('USD'),
    INVOICE_EXPIRY_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),

    // Credit idempotency / retry
    CREDIT_MAX_ATTEMPTS: z.coerce.number().int().positive().max(20).default(5),
    CREDIT_INITIAL_BACKOFF_MS: z.coerce.number().int().positive().default(1000),
    CREDIT_MAX_BACKOFF_MS: z.coerce.number().int().positive().default(30000),
    CREDIT_STALE_CLAIM_MS: z.coerce.number().int().positive().default(60000),

    // Mock provider
    MOCK_PAY_DELAY_MS: z.coerce.number().int().min(0).default(4000),

    // Webhook replay protection
    WEBHOOK_REPLAY_TTL_MS: z.coerce.number().int().positive().default(3_600_000),

    // HTTP hardening
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    CORS_ALLOWED_ORIGINS: z.string().default(''), // comma separated
    BODY_LIMIT: z.coerce.number().int().positive().default(8192),

    // Admin auth
    ADMIN_USERNAME: z.string().min(1).default('admin'),
    ADMIN_PASSWORD: z.string().optional(),
    ADMIN_PASSWORD_HASH: z.string().optional(),
    SESSION_SECRET: z.string().optional(),
    SESSION_TTL_MS: z.coerce.number().int().positive().default(86_400_000),

    // Alerts
    ALERT_WEBHOOK_URL: z.string().url().or(z.literal('')).optional(),
    ALERT_EMAIL_TO: z.string().email().or(z.literal('')).optional(),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.PROVIDER === 'opennode' && !cfg.OPENNODE_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OPENNODE_API_KEY is required when PROVIDER=opennode',
        path: ['OPENNODE_API_KEY'],
      });
    }
    if (cfg.MACHINE === 'cryptovend' && !cfg.CRYPTOVEND_BASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CRYPTOVEND_BASE_URL is required when MACHINE=cryptovend',
        path: ['CRYPTOVEND_BASE_URL'],
      });
    }
    if (!cfg.ADMIN_PASSWORD_HASH && !cfg.ADMIN_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Set ADMIN_PASSWORD (plaintext, dev) or ADMIN_PASSWORD_HASH (scrypt) to enable admin login',
        path: ['ADMIN_PASSWORD'],
      });
    }
  });

export type AppConfig = z.infer<typeof envSchema> & {
  corsOrigins: string[];
  sessionSecret: string;
  generatedSessionSecret: boolean;
  defaultLanguage: LanguageCode;
  provider: ProviderName;
  machine: MachineName;
};

export class ConfigError extends Error {
  issues: { path: string; message: string }[];
  constructor(issues: { path: string; message: string }[]) {
    super('Configuration is invalid:\n' + issues.map((i) => `  - ${i.path}: ${i.message}`).join('\n'));
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    throw new ConfigError(issues);
  }
  const c = parsed.data;
  const generatedSessionSecret = !c.SESSION_SECRET;
  const sessionSecret = c.SESSION_SECRET ?? randomBytes(32).toString('hex');
  const corsOrigins = c.CORS_ALLOWED_ORIGINS
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    ...c,
    corsOrigins,
    sessionSecret,
    generatedSessionSecret,
    defaultLanguage: c.KIOSK_DEFAULT_LANGUAGE,
    provider: c.PROVIDER,
    machine: c.MACHINE,
  };
}

// Mask a secret for display: show last 4 chars only.
export function maskSecret(value: string | undefined | null): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return '••••••' + value.slice(-4);
}
