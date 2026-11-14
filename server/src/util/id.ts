import { randomBytes, randomUUID } from 'node:crypto';

/** Order ids are url-safe and sortable-ish by creation. */
export function newOrderId(): string {
  return 'ord_' + randomUUID().replace(/-/g, '').slice(0, 24);
}

export function newMockChargeId(): string {
  return 'mock_' + randomBytes(6).toString('hex');
}

export function newMockPayreq(): string {
  // Deliberately NOT a real BOLT11; decoders return null for this.
  return 'lnbc' + randomBytes(12).toString('hex') + '_MOCK_NOT_A_REAL_INVOICE';
}

export function newSessionToken(): string {
  return randomBytes(32).toString('hex');
}
