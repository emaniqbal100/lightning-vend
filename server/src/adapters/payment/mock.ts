import type { PaymentProvider, ChargeInfo } from './types.js';
import type {
  Charge,
  CreateChargeInput,
  WebhookInput,
  WebhookVerdict,
} from '@lightning-vend/shared';
import { newMockChargeId, newMockPayreq } from '../../util/id.js';

interface MockCharge {
  id: string;
  createdAt: number;
  expiresAt: number;
  amount: number;
  currency: string;
  payreq: string;
  sats: number | null;
  exchangeRate: number | null;
  paidAt: number | null;
}

export interface MockProviderOptions {
  payDelayMs: number;
  mockRate: number | null; // sats per 1 unit of fiat, for display only
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;
  private readonly charges = new Map<string, MockCharge>();

  constructor(private readonly opts: MockProviderOptions) {}

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    const id = newMockChargeId();
    const payreq = newMockPayreq();
    const createdAt = Date.now();
    const expiresAt = createdAt + input.expiresIn * 1000;
    const sats = this.opts.mockRate ? Math.round(input.amount * this.opts.mockRate) : null;
    const charge: MockCharge = {
      id,
      createdAt,
      expiresAt,
      amount: input.amount,
      currency: input.currency,
      payreq,
      sats,
      exchangeRate: this.opts.mockRate,
      paidAt: null,
    };
    this.charges.set(id, charge);
    return {
      providerChargeId: id,
      payreq,
      amount: input.amount,
      currency: input.currency,
      sats,
      exchangeRate: this.opts.mockRate,
      status: 'unpaid',
      expiresAt,
      hostedUrl: null,
    };
  }

  async getCharge(id: string): Promise<ChargeInfo> {
    const c = this.charges.get(id);
    if (!c) return { status: 'expired' };
    const now = Date.now();
    if (c.paidAt != null && now >= c.paidAt) return { status: 'paid', expiresAt: c.expiresAt };
    if (c.paidAt == null && now >= c.createdAt + this.opts.payDelayMs) {
      c.paidAt = now; // auto-pay on first poll after the delay
      return { status: 'paid', expiresAt: c.expiresAt };
    }
    if (now >= c.expiresAt) return { status: 'expired', expiresAt: c.expiresAt };
    return { status: 'unpaid', expiresAt: c.expiresAt };
  }

  async simulatePaid(id: string): Promise<void> {
    const c = this.charges.get(id);
    if (!c) throw new Error(`unknown mock charge ${id}`);
    c.paidAt = Date.now();
  }

  verifyWebhook(_input: WebhookInput): WebhookVerdict {
    return { valid: false, reason: 'mock provider does not use webhooks' };
  }

  /** Test helper. */
  getChargeCount(): number {
    return this.charges.size;
  }
}
