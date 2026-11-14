import type { Database } from '../db/sqlite.js';
import { assertTransition } from '../state/machine.js';
import type {
  LanguageCode,
  MachineName,
  OrderRecord,
  OrderStatus,
  ProviderName,
} from '@lightning-vend/shared';

export interface NewOrderInput {
  id: string;
  status: OrderStatus;
  provider: ProviderName;
  amount: number;
  currency: string;
  payreq: string;
  sats: number | null;
  exchangeRate: number | null;
  productLabel: string | null;
  language: LanguageCode;
  expiresAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface OrderRow {
  id: string;
  status: string;
  provider: string;
  provider_charge_id: string | null;
  amount: number;
  currency: string;
  sats: number | null;
  payreq: string;
  exchange_rate: number | null;
  product_label: string | null;
  language: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
  paid_at: number | null;
  credit_attempts: number;
  credit_claimed_at: number | null;
  credited_at: number | null;
  credit_error: string | null;
}

function mapRow(r: OrderRow): OrderRecord {
  return {
    id: r.id,
    status: r.status as OrderStatus,
    provider: r.provider as ProviderName,
    providerChargeId: r.provider_charge_id,
    amount: r.amount,
    currency: r.currency,
    sats: r.sats,
    payreq: r.payreq,
    exchangeRate: r.exchange_rate,
    productLabel: r.product_label,
    language: (r.language ?? null) as LanguageCode | null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    expiresAt: r.expires_at,
    paidAt: r.paid_at,
    creditAttempts: r.credit_attempts,
    creditClaimedAt: r.credit_claimed_at,
    creditedAt: r.credited_at,
    creditError: r.credit_error,
  };
}

export interface ListFilter {
  status?: OrderStatus;
  search?: string;
  fromTs?: number;
  toTs?: number;
  limit?: number;
  offset?: number;
}

export interface Metrics {
  fromTs: number;
  toTs: number;
  countsByStatus: Record<string, number>;
  salesCount: number;
  salesAmount: number;
  paidCount: number;
  expiredCount: number;
  failedCount: number;
  creditFailedCount: number;
  avgTimeToPayMs: number | null;
}

export class OrdersRepo {
  private readonly audit;
  constructor(private readonly db: Database, audit: { log: (ts: number, actor: string, action: string, entity: string, entityId: string | null, details?: unknown) => void }) {
    this.audit = audit;
  }

  create(input: NewOrderInput): void {
    this.db
      .prepare(
        `INSERT INTO orders (id, status, provider, provider_charge_id, amount, currency, sats, payreq,
         exchange_rate, product_label, language, created_at, updated_at, expires_at, paid_at, credit_attempts,
         credit_claimed_at, credited_at, credit_error)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, NULL, NULL, NULL)`,
      )
      .run(
        input.id,
        input.status,
        input.provider,
        input.amount,
        input.currency,
        input.sats,
        input.payreq,
        input.exchangeRate,
        input.productLabel,
        input.language,
        input.createdAt,
        input.updatedAt,
        input.expiresAt,
      );
    this.audit.log(input.createdAt, 'system', 'order_created', 'order', input.id, { status: input.status });
  }

  get(id: string): OrderRecord | undefined {
    const row = this.db.prepare<OrderRow>('SELECT * FROM orders WHERE id = ?').get(id);
    return row ? mapRow(row) : undefined;
  }

  getByChargeId(chargeId: string): OrderRecord | undefined {
    const row = this.db.prepare<OrderRow>('SELECT * FROM orders WHERE provider_charge_id = ?').get(chargeId);
    return row ? mapRow(row) : undefined;
  }

  hasMachineCredit(orderId: string): boolean {
    return this.db.prepare('SELECT 1 FROM machine_credits WHERE order_id = ?').get(orderId) !== undefined;
  }

  /** Atomic CAS: paid -> crediting. Exactly one caller wins. */
  claimForCredit(id: string, now: number, actor: string): boolean {
    return this.db.transaction(() => {
      const r = this.db
        .prepare('UPDATE orders SET status = ?, credit_claimed_at = ?, updated_at = ? WHERE id = ? AND status = ?')
        .run('crediting', now, now, id, 'paid');
      if (r.changes === 1) {
        this.audit.log(now, actor, 'credit_claimed', 'order', id, { from: 'paid', to: 'crediting' });
        return true;
      }
      return false;
    });
  }

  /** Re-claim a stale crediting order (crashed claimer). Only if no credit recorded yet. */
  reclaimCrediting(id: string, now: number, actor: string, staleMs: number): boolean {
    return this.db.transaction(() => {
      const r = this.db
        .prepare(
          'UPDATE orders SET credit_claimed_at = ?, updated_at = ? WHERE id = ? AND status = ? AND credit_claimed_at < ?',
        )
        .run(now, now, id, 'crediting', now - staleMs);
      if (r.changes === 1) {
        this.audit.log(now, actor, 'credit_reclaimed', 'order', id, {});
        return true;
      }
      return false;
    });
  }

  /** Record a successful credit. Returns {first} false if a concurrent path already recorded it. */
  recordCredit(id: string, now: number, actor: string, raw: string | null): { first: boolean } {
    return this.db.transactionImmediate(() => {
      const existing = this.db.prepare('SELECT 1 FROM machine_credits WHERE order_id = ?').get(id);
      const first = !existing;
      if (first) {
        this.db
          .prepare('INSERT INTO machine_credits (order_id, attempted_at, result, raw) VALUES (?, ?, ?, ?)')
          .run(id, now, 'success', raw);
      }
      this.db
        .prepare('UPDATE orders SET status = ?, credited_at = ?, updated_at = ? WHERE id = ? AND status = ?')
        .run('credited', now, now, id, 'crediting');
      this.audit.log(now, actor, 'credit_succeeded', 'order', id, { first });
      return { first };
    });
  }

  incrementCreditAttempts(id: string, now: number): number {
    return this.db.transaction(() => {
      this.db.prepare('UPDATE orders SET credit_attempts = credit_attempts + 1, updated_at = ? WHERE id = ?').run(now, id);
      const row = this.db.prepare<{ credit_attempts: number }>('SELECT credit_attempts FROM orders WHERE id = ?').get(id);
      return row?.credit_attempts ?? 0;
    });
  }

  /** On recoverable credit failure: crediting -> paid (retryable). */
  failCreditRetry(id: string, now: number, actor: string): void {
    this.db.transaction(() => {
      this.db
        .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
        .run('paid', now, now, id, 'crediting');
      this.audit.log(now, actor, 'credit_retryable', 'order', id, { to: 'paid' });
    });
  }

  markCreditFailed(id: string, now: number, actor: string, error: string): void {
    this.db.transaction(() => {
      this.db
        .prepare('UPDATE orders SET status = ?, credit_error = ?, updated_at = ? WHERE id = ? AND status = ?')
        .run('credit_failed', error, now, now, id, 'crediting');
      this.audit.log(now, actor, 'credit_failed', 'order', id, { error });
    });
  }

  markPaid(id: string, now: number, actor: string, providerChargeId?: string): void {
    this.db.transaction(() => {
      this.db
        .prepare(
          'UPDATE orders SET status = ?, paid_at = ?, provider_charge_id = COALESCE(?, provider_charge_id), updated_at = ? WHERE id = ? AND status = ?',
        )
        .run('paid', now, providerChargeId ?? null, now, id, 'pending');
      this.audit.log(now, actor, 'payment_paid', 'order', id, { providerChargeId });
    });
  }

  markExpired(id: string, now: number, actor: string): void {
    this.db.transaction(() => {
      this.db
        .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
        .run('expired', now, now, id, 'pending');
      this.audit.log(now, actor, 'order_expired', 'order', id, {});
    });
  }

  markFailed(id: string, now: number, actor: string, reason: string): void {
    this.db.transaction(() => {
      this.db
        .prepare('UPDATE orders SET status = ?, credit_error = ?, updated_at = ? WHERE id = ? AND status IN (?, ?)')
        .run('failed', reason, now, now, id, 'created', 'pending');
      this.audit.log(now, actor, 'order_failed', 'order', id, { reason });
    });
  }

  complete(id: string, now: number, actor: string): void {
    this.db.transaction(() => {
      this.db
        .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
        .run('completed', now, now, id, 'credited');
      this.audit.log(now, actor, 'order_completed', 'order', id, {});
    });
  }

  /** Update the charge details when an invoice is created: created -> pending. */
  activateOrder(id: string, now: number, actor: string, charge: { providerChargeId: string; payreq: string; sats: number | null; exchangeRate: number | null; expiresAt: number | null }): void {
    this.db.transaction(() => {
      const order = this.get(id);
      if (!order) throw new Error('order not found');
      assertTransition(order.status, 'pending');
      this.db
        .prepare(
          'UPDATE orders SET status = ?, provider_charge_id = ?, payreq = ?, sats = ?, exchange_rate = ?, expires_at = ?, updated_at = ? WHERE id = ?',
        )
        .run('pending', charge.providerChargeId, charge.payreq, charge.sats, charge.exchangeRate, charge.expiresAt, now, id);
      this.audit.log(now, actor, 'order_activated', 'order', id, { providerChargeId: charge.providerChargeId });
    });
  }

  list(filter: ListFilter = {}): OrderRecord[] {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (filter.status) {
      where.push('status = ?');
      params.push(filter.status);
    }
    if (filter.search) {
      where.push('(id LIKE ? OR provider_charge_id LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    if (filter.fromTs != null) {
      where.push('created_at >= ?');
      params.push(filter.fromTs);
    }
    if (filter.toTs != null) {
      where.push('created_at < ?');
      params.push(filter.toTs);
    }
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    params.push(limit, offset);
    const sql = `SELECT * FROM orders${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    return this.db.prepare<OrderRow>(sql).all(...params).map(mapRow);
  }

  count(filter: ListFilter = {}): number {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (filter.status) {
      where.push('status = ?');
      params.push(filter.status);
    }
    if (filter.search) {
      where.push('(id LIKE ? OR provider_charge_id LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    if (filter.fromTs != null) {
      where.push('created_at >= ?');
      params.push(filter.fromTs);
    }
    if (filter.toTs != null) {
      where.push('created_at < ?');
      params.push(filter.toTs);
    }
    const sql = `SELECT COUNT(*) AS c FROM orders${where.length ? ' WHERE ' + where.join(' AND ') : ''}`;
    const row = this.db.prepare<{ c: number }>(sql).get(...params);
    return row?.c ?? 0;
  }

  listPendingPastExpiry(now: number): OrderRecord[] {
    return this.db
      .prepare<OrderRow>('SELECT * FROM orders WHERE status = ? AND expires_at IS NOT NULL AND expires_at < ?')
      .all('pending', now)
      .map(mapRow);
  }

  listCreditedBefore(ts: number): OrderRecord[] {
    return this.db
      .prepare<OrderRow>('SELECT * FROM orders WHERE status = ? AND credited_at IS NOT NULL AND credited_at < ?')
      .all('credited', ts)
      .map(mapRow);
  }

  listStaleCrediting(now: number, staleMs: number): OrderRecord[] {
    return this.db
      .prepare<OrderRow>('SELECT * FROM orders WHERE status = ? AND credit_claimed_at IS NOT NULL AND credit_claimed_at < ?')
      .all('crediting', now - staleMs)
      .map(mapRow);
  }

  listPaid(): OrderRecord[] {
    return this.db.prepare<OrderRow>('SELECT * FROM orders WHERE status = ?').all('paid').map(mapRow);
  }

  listCreatedBefore(ts: number): OrderRecord[] {
    return this.db
      .prepare<OrderRow>('SELECT * FROM orders WHERE status = ? AND created_at < ?')
      .all('created', ts)
      .map(mapRow);
  }

  metrics(fromTs: number, toTs: number): Metrics {
    const counts: Record<string, number> = {};
    for (const row of this.db
      .prepare<{ status: string; c: number }>('SELECT status, COUNT(*) AS c FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY status')
      .all(fromTs, toTs)) {
      counts[row.status] = row.c;
    }
    const sales = this.db
      .prepare<{ s: number; c: number }>(
        "SELECT COALESCE(SUM(amount), 0) AS s, COUNT(*) AS c FROM orders WHERE status IN ('credited','completed') AND created_at >= ? AND created_at < ?",
      )
      .get(fromTs, toTs) ?? { s: 0, c: 0 };
    const avg = this.db
      .prepare<{ a: number | null }>(
        'SELECT AVG(paid_at - created_at) AS a FROM orders WHERE paid_at IS NOT NULL AND created_at >= ? AND created_at < ?',
      )
      .get(fromTs, toTs);
    return {
      fromTs,
      toTs,
      countsByStatus: counts,
      salesCount: sales.c,
      salesAmount: sales.s,
      paidCount: counts['paid'] ?? 0,
      expiredCount: counts['expired'] ?? 0,
      failedCount: counts['failed'] ?? 0,
      creditFailedCount: counts['credit_failed'] ?? 0,
      avgTimeToPayMs: avg?.a ?? null,
    };
  }
}
