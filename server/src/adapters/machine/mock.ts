import type { MachineAdapter } from './types.js';
import type { CreditInput, CreditResult, MachineStatus, PingResult } from '@lightning-vend/shared';

export interface MockMachineOptions {
  /** Return an error string to fail this credit call, or null/undefined to succeed. */
  fail?: (orderId: string, attempt: number) => string | null | undefined;
  reachable?: boolean;
}

export class MockMachine implements MachineAdapter {
  readonly name = 'mock' as const;
  private readonly calls = new Map<string, number>();
  private readonly okCount = new Map<string, number>();

  constructor(private readonly opts: MockMachineOptions = {}) {}

  async credit(input: CreditInput): Promise<CreditResult> {
    const attempt = (this.calls.get(input.orderId) ?? 0) + 1;
    this.calls.set(input.orderId, attempt);
    const err = this.opts.fail?.(input.orderId, attempt);
    if (err) return { ok: false, error: err };
    this.okCount.set(input.orderId, (this.okCount.get(input.orderId) ?? 0) + 1);
    return { ok: true, raw: `mock-credit-${attempt}` };
  }

  async ping(): Promise<PingResult> {
    return this.opts.reachable === false
      ? { ok: false, error: 'mock machine offline' }
      : { ok: true, latencyMs: 1 };
  }

  async status(): Promise<MachineStatus> {
    const r = await this.ping();
    return { reachable: r.ok, lastError: r.ok ? null : (r.ok ? null : r.error ?? null) };
  }

  /** Test helpers. */
  callsFor(orderId: string): number {
    return this.calls.get(orderId) ?? 0;
  }
  okFor(orderId: string): number {
    return this.okCount.get(orderId) ?? 0;
  }
  totalOk(): number {
    let n = 0;
    for (const v of this.okCount.values()) n += v;
    return n;
  }
  reset(): void {
    this.calls.clear();
    this.okCount.clear();
  }
}
