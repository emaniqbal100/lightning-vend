import type { PaymentProvider, ChargeInfo } from './types.js';
import type {
  Charge,
  ChargeStatus,
  CreateChargeInput,
  ProviderName,
  WebhookInput,
  WebhookVerdict,
} from '@lightning-vend/shared';
import { decodeBolt11Sat } from '../../util/bolt11.js';
import { hmacSha256Hex, timingSafeEqualHex } from '../../security/hmac.js';

export interface OpenNodeOptions {
  apiKey: string;
  env: 'dev' | 'live';
}

type OpenNodeStatus = string;

function mapStatus(s: OpenNodeStatus): ChargeStatus {
  switch (s) {
    case 'paid':
      return 'paid';
    case 'expired':
      return 'expired';
    case 'refunded':
    case 'failed':
      return 'failed';
    case 'unpaid':
    case 'underpaid':
    case 'processing':
    default:
      return 'unpaid';
  }
}

export class OpenNodeProvider implements PaymentProvider {
  readonly name: ProviderName = 'opennode';
  private readonly api: string;
  private readonly apiKey: string;

  constructor(opts: OpenNodeOptions) {
    this.apiKey = opts.apiKey;
    this.api = opts.env === 'live' ? 'https://api.opennode.com' : 'https://dev-api.opennode.com';
  }

  private async call<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(this.api + path, {
      ...init,
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal: init.signal ?? AbortSignal.timeout(15000),
    });
    const body = (await res.json().catch(() => ({}))) as { data?: T; message?: string; error?: string };
    if (!res.ok) throw new Error(body.message || body.error || `OpenNode error ${res.status}`);
    if (!body.data) throw new Error('OpenNode returned no data');
    return body.data;
  }

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    const payload: Record<string, unknown> = {
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      ttl: input.expiresIn,
    };
    if (input.callbackUrl) payload.callback_url = input.callbackUrl;
    const data = await this.call<{
      id: string;
      status: string;
      lightning_invoice: { payreq: string; expires_at: number };
      hosted_checkout_url?: string;
    }>('/v1/charges', { method: 'POST', body: JSON.stringify(payload) });
    const payreq = data.lightning_invoice.payreq;
    const sats = decodeBolt11Sat(payreq);
    const exchangeRate = sats ? input.amount / sats : null;
    const expiresAt = data.lightning_invoice.expires_at
      ? Number(data.lightning_invoice.expires_at) * 1000
      : Date.now() + input.expiresIn * 1000;
    return {
      providerChargeId: data.id,
      payreq,
      amount: input.amount,
      currency: input.currency,
      sats,
      exchangeRate,
      status: mapStatus(data.status),
      expiresAt,
      hostedUrl: data.hosted_checkout_url ?? null,
    };
  }

  async getCharge(id: string): Promise<ChargeInfo> {
    const data = await this.call<{
      status: string;
      lightning_invoice?: { expires_at: number };
    }>(`/v1/charge/${encodeURIComponent(id)}`);
    return {
      status: mapStatus(data.status),
      expiresAt: data.lightning_invoice?.expires_at
        ? Number(data.lightning_invoice.expires_at) * 1000
        : undefined,
    };
  }

  verifyWebhook(input: WebhookInput): WebhookVerdict {
    const body = (input.parsedBody ?? {}) as Record<string, unknown>;
    const id = body.id != null ? String(body.id) : '';
    const status = body.status != null ? String(body.status) : '';
    const hashedOrder = body.hashed_order != null ? String(body.hashed_order) : '';
    if (!id || !hashedOrder) return { valid: false, reason: 'missing id or hashed_order' };
    const expected = hmacSha256Hex(this.apiKey, id);
    if (!timingSafeEqualHex(hashedOrder, expected)) {
      return { valid: false, reason: 'invalid hmac' };
    }
    return { valid: true, chargeId: id, status: mapStatus(status) };
  }
}
