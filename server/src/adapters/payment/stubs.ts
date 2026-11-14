import type { PaymentProvider, ChargeInfo } from './types.js';
import type { Charge, CreateChargeInput, ProviderName, WebhookInput, WebhookVerdict } from '@lightning-vend/shared';

export class NotImplementedProvider implements PaymentProvider {
  readonly name: ProviderName;
  constructor(name: ProviderName, private readonly label: string) {
    this.name = name;
  }
  private err(): Error {
    return new Error(`${this.label} provider is a documented stub and is not implemented`);
  }
  async createCharge(_input: CreateChargeInput): Promise<Charge> {
    throw this.err();
  }
  async getCharge(_id: string): Promise<ChargeInfo> {
    throw this.err();
  }
  verifyWebhook(_input: WebhookInput): WebhookVerdict {
    return { valid: false, reason: `${this.label} stub` };
  }
}

export function createLnbitsProvider(): PaymentProvider {
  return new NotImplementedProvider('lnbits', 'LNbits');
}

export function createBtcpayProvider(): PaymentProvider {
  return new NotImplementedProvider('btcpay', 'BTCPay');
}
