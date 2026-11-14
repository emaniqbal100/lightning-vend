// Minimal BOLT11 amount decoder. Only the human-readable amount is read; the
// signature/data part is not validated. Returns satoshis or null when the
// invoice carries no amount (zero-amount invoice) or cannot be parsed.

const COIN_PREFIXES = ['lnbcrt', 'lntb', 'lnbc'];
const MULTIPLIER_MSAT: Record<string, number> = {
  m: 100_000_000, // milli-BTC -> 1e8 msat
  u: 100_000, // micro-BTC -> 1e5 msat
  n: 100, // nano-BTC -> 1e2 msat
  p: 0.1, // pico-BTC -> 1e-1 msat
};

/** Decode the amount of a BOLT11 invoice into satoshis, or null if none. */
export function decodeBolt11Sat(payreq: string): number | null {
  if (typeof payreq !== 'string' || payreq.length < 8) return null;
  const sep = payreq.lastIndexOf('1');
  if (sep <= 4) return null; // need at least the coin prefix before the separator
  const hrp = payreq.slice(0, sep);
  let amountStr: string | null = null;
  for (const p of COIN_PREFIXES) {
    if (hrp.startsWith(p)) {
      amountStr = hrp.slice(p.length);
      break;
    }
  }
  if (amountStr == null || amountStr.length === 0) return null; // no amount in HRP

  const last = amountStr[amountStr.length - 1] as string;
  let numeric: string;
  let multiplier: number;
  if (last in MULTIPLIER_MSAT) {
    numeric = amountStr.slice(0, -1);
    multiplier = MULTIPLIER_MSAT[last]!;
  } else {
    numeric = amountStr; // plain BTC amount
    multiplier = 100_000_000_000; // 1 BTC -> 1e11 msat
  }
  const value = Number(numeric);
  if (!Number.isFinite(value) || value <= 0) return null;
  const msat = value * multiplier;
  return Math.round(msat / 1000);
}
