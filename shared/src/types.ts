// Core domain types shared across server and clients. No runtime deps.

export type OrderStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'crediting'
  | 'credited'
  | 'completed'
  | 'expired'
  | 'failed'
  | 'credit_failed'
  | 'refunded_needed';

export type ProviderName = 'mock' | 'opennode' | 'lnbits' | 'btcpay';
export type MachineName = 'mock' | 'cryptovend';
export type LanguageCode = 'en' | 'ur' | 'es';

export type OrderRecord = {
  id: string;
  status: OrderStatus;
  provider: ProviderName;
  providerChargeId: string | null;
  amount: number;
  currency: string;
  sats: number | null;
  payreq: string;
  exchangeRate: number | null;
  productLabel: string | null;
  language: LanguageCode | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  paidAt: number | null;
  creditAttempts: number;
  creditClaimedAt: number | null;
  creditedAt: number | null;
  creditError: string | null;
};

export type CreateChargeInput = {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl?: string;
  expiresIn: number;
  language: LanguageCode;
};

export type ChargeStatus = 'unpaid' | 'paid' | 'expired' | 'failed';

export type Charge = {
  providerChargeId: string;
  payreq: string;
  amount: number;
  currency: string;
  sats: number | null;
  exchangeRate: number | null;
  status: ChargeStatus;
  expiresAt: number;
  hostedUrl: string | null;
};

export type WebhookInput = {
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
  parsedBody: unknown;
};

export type WebhookVerdict =
  | { valid: true; chargeId: string; status: ChargeStatus }
  | { valid: false; reason: string };

export type CreditInput = {
  orderId: string;
  amount: number;
  currency: string;
};

export type CreditResult = { ok: true; raw?: string } | { ok: false; error: string };

export type PingResult = { ok: true; latencyMs: number } | { ok: false; error: string };

export type MachineStatus = {
  reachable: boolean;
  lastError: string | null;
};

export type PublicConfig = {
  mock: boolean;
  provider: ProviderName;
  machine: MachineName;
  amount: number;
  currency: string;
  sats: number | null;
  exchangeRate: number | null;
  expiresIn: number;
  pollIntervalMs: number;
  languages: LanguageCode[];
  defaultLanguage: LanguageCode;
  machineOnline: boolean | null;
};
