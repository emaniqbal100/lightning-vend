import type { AppConfig } from '@lightning-vend/shared/config';
import type { ProviderName } from '@lightning-vend/shared';
import type { PaymentProvider } from './types.js';
import { MockPaymentProvider } from './mock.js';
import { OpenNodeProvider } from './opennode.js';
import { createBtcpayProvider, createLnbitsProvider } from './stubs.js';

export function createPaymentProvider(name: ProviderName, config: AppConfig): PaymentProvider {
  switch (name) {
    case 'mock':
      return new MockPaymentProvider({
        payDelayMs: config.MOCK_PAY_DELAY_MS,
        mockRate: config.BTC_EXCHANGE_RATE ?? null,
      });
    case 'opennode':
      if (!config.OPENNODE_API_KEY)
        throw new Error('OPENNODE_API_KEY is required to use the opennode provider');
      return new OpenNodeProvider({ apiKey: config.OPENNODE_API_KEY, env: config.OPENNODE_ENV });
    case 'lnbits':
      return createLnbitsProvider();
    case 'btcpay':
      return createBtcpayProvider();
  }
}
