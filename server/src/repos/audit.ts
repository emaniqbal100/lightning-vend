import type { Database } from '../db/sqlite.js';

export interface AuditEntry {
  id: number;
  ts: number;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
}

/** Append-only audit writer. Safe to call inside a transaction on the same db. */
export class AuditLog {
  private readonly stmt;

  constructor(db: Database) {
    this.stmt = db.prepare(
      'INSERT INTO audit_log (ts, actor, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)',
    );
  }

  log(ts: number, actor: string, action: string, entity: string, entityId: string | null, details?: unknown): void {
    const d = details == null ? null : typeof details === 'string' ? details : JSON.stringify(details);
    this.stmt.run(ts, actor, action, entity, entityId, d);
  }
}

export function listAudit(
  db: Database,
  opts: { entity?: string; entityId?: string; action?: string; limit?: number; offset?: number } = {},
): AuditEntry[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.entity) {
    where.push('entity = ?');
    params.push(opts.entity);
  }
  if (opts.entityId) {
    where.push('entity_id = ?');
    params.push(opts.entityId);
  }
  if (opts.action) {
    where.push('action = ?');
    params.push(opts.action);
  }
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  params.push(limit, offset);
  const sql = `SELECT id, ts, actor, action, entity, entity_id AS entityId, details FROM audit_log${
    where.length ? ' WHERE ' + where.join(' AND ') : ''
  } ORDER BY ts DESC, id DESC LIMIT ? OFFSET ?`;
  return db.prepare<AuditEntry>(sql).all(...params);
}
