import type { AppConfig } from '@lightning-vend/shared/config';
import type { MachineName } from '@lightning-vend/shared';
import type { MachineAdapter } from './types.js';
import { MockMachine } from './mock.js';
import { CryptoVendMachine } from './cryptovend.js';

export function createMachineAdapter(name: MachineName, config: AppConfig): MachineAdapter {
  switch (name) {
    case 'mock':
      return new MockMachine({});
    case 'cryptovend':
      if (!config.CRYPTOVEND_BASE_URL)
        throw new Error('CRYPTOVEND_BASE_URL is required to use the cryptovend machine');
      return new CryptoVendMachine({
        baseUrl: config.CRYPTOVEND_BASE_URL,
        user: config.CRYPTOVEND_USER ?? '',
        pass: config.CRYPTOVEND_PASS ?? '',
        timeoutMs: config.CRYPTOVEND_REQUEST_TIMEOUT_MS,
      });
  }
}
