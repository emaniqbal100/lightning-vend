import type {
  Charge,
  ChargeStatus,
  CreateChargeInput,
  ProviderName,
  WebhookInput,
  WebhookVerdict,
} from '@lightning-vend/shared';

export type ChargeInfo = { status: ChargeStatus; expiresAt?: number };

export interface PaymentProvider {
  readonly name: ProviderName;
  createCharge(input: CreateChargeInput): Promise<Charge>;
  getCharge(providerChargeId: string): Promise<ChargeInfo>;
  verifyWebhook(input: WebhookInput): WebhookVerdict;
  /** Mock-only: force the charge to paid immediately. Real providers throw. */
  simulatePaid?(providerChargeId: string): Promise<void>;
}
