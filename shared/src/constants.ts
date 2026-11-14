import type { LanguageCode, OrderStatus } from './types.js';

export const ORDER_STATES: OrderStatus[] = [
  'created',
  'pending',
  'paid',
  'crediting',
  'credited',
  'completed',
  'expired',
  'failed',
  'credit_failed',
  'refunded_needed',
];

// Allowed transitions. Anything not listed is illegal and rejected.
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: ['pending', 'failed'],
  pending: ['paid', 'expired', 'failed'],
  paid: ['crediting', 'refunded_needed'],
  crediting: ['credited', 'paid', 'credit_failed'],
  credited: ['completed'],
  completed: [],
  expired: [],
  failed: [],
  credit_failed: ['crediting', 'refunded_needed'],
  refunded_needed: [],
};

export const TERMINAL_STATES: OrderStatus[] = ['completed', 'expired', 'failed', 'refunded_needed'];

export const NEEDS_OPERATOR_STATES: OrderStatus[] = ['credit_failed', 'refunded_needed'];

export const PAID_LIKE_STATES: OrderStatus[] = ['paid', 'crediting', 'credited', 'completed'];

export const SUPPORTED_LANGUAGES: { code: LanguageCode; label: string; rtl: boolean }[] = [
  { code: 'en', label: 'English', rtl: false },
  { code: 'ur', label: 'اردو', rtl: true },
  { code: 'es', label: 'Español', rtl: false },
];

export const RTL_LANGUAGES: LanguageCode[] = ['ur'];

export function isRtl(lang: LanguageCode): boolean {
  return RTL_LANGUAGES.includes(lang);
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}
