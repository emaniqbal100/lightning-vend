import type { MachineAdapter } from './types.js';
import type { CreditInput, CreditResult, MachineStatus, PingResult } from '@lightning-vend/shared';

export interface CryptoVendOptions {
  baseUrl: string;
  user: string;
  pass: string;
  timeoutMs: number;
}

/**
 * CryptoVend adapter implementing the verified protocol from the upstream
 * `cryptovend-tablet-ui` repo: `POST {base}/add/pay` with a form-encoded
 * `amt=<fiatAmount>` body and HTTP Basic Auth. `ping`/`status` are best-effort
 * and marked UNVERIFIED (no endpoint is documented upstream).
 */
function basicAuth(user: string, pass: string): string {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

export class CryptoVendMachine implements MachineAdapter {
  readonly name = 'cryptovend' as const;
  constructor(private readonly opts: CryptoVendOptions) {}

  async credit(input: CreditInput): Promise<CreditResult> {
    const url = this.opts.baseUrl.replace(/\/$/, '') + '/add/pay';
    const body = `amt=${encodeURIComponent(String(input.amount))}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: basicAuth(this.opts.user, this.opts.pass),
        },
        body,
        signal: AbortSignal.timeout(this.opts.timeoutMs),
      });
      const raw = await res.text().catch(() => '');
      if (res.ok) return { ok: true, raw: raw || `HTTP ${res.status}` };
      return { ok: false, error: `HTTP ${res.status}: ${raw.slice(0, 200)}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async ping(): Promise<PingResult> {
    const start = Date.now();
    try {
      const res = await fetch(this.opts.baseUrl, {
        method: 'GET',
        headers: { Authorization: basicAuth(this.opts.user, this.opts.pass) },
        signal: AbortSignal.timeout(Math.min(2000, this.opts.timeoutMs)),
      });
      // Any HTTP response means the device is reachable (auth may be required).
      void res;
      return { ok: true, latencyMs: Date.now() - start };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async status(): Promise<MachineStatus> {
    const r = await this.ping();
    return { reachable: r.ok, lastError: r.ok ? null : r.error ?? null };
  }
}
