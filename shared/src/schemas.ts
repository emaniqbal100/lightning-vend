import { z } from 'zod';
import { ORDER_STATES } from './constants.js';

export const languageSchema = z.enum(['en', 'ur', 'es']);
export const orderStatusSchema = z.enum(ORDER_STATES as [string, ...string[]]);

// POST /api/orders
export const createOrderRequestSchema = z.object({
  productId: z.string().max(64).optional(),
  language: languageSchema.optional(),
});

// GET /api/config
export const publicConfigSchema = z.object({
  mock: z.boolean(),
  provider: z.enum(['mock', 'opennode', 'lnbits', 'btcpay']),
  machine: z.enum(['mock', 'cryptovend']),
  amount: z.number(),
  currency: z.string(),
  sats: z.number().nullable(),
  exchangeRate: z.number().nullable(),
  expiresIn: z.number().int().positive(),
  pollIntervalMs: z.number().int().positive(),
  languages: z.array(languageSchema),
  defaultLanguage: languageSchema,
  machineOnline: z.boolean().nullable(),
});

// Order as exposed to the kiosk (no secrets, no internal credit bookkeeping).
export const orderResponseSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  provider: z.enum(['mock', 'opennode', 'lnbits', 'btcpay']),
  amount: z.number(),
  currency: z.string(),
  sats: z.number().nullable(),
  exchangeRate: z.number().nullable(),
  payreq: z.string(),
  qr: z.string(),
  expiresIn: z.number().int().positive(),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
});

// Operator-editable runtime settings (secrets are never editable here).
export const settingsSchema = z.object({
  price: z.number().positive().max(10000),
  currency: z.string().length(3),
  invoiceExpirySeconds: z.number().int().min(60).max(3600),
  pollIntervalMs: z.number().int().min(500).max(60000),
  defaultLanguage: languageSchema,
  provider: z.enum(['mock', 'opennode', 'lnbits', 'btcpay']),
  machine: z.enum(['mock', 'cryptovend']),
  alertWebhookUrl: z.string().url().or(z.literal('')).optional(),
  alertEmailTo: z.string().email().or(z.literal('')).optional(),
});

export type Settings = z.infer<typeof settingsSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
