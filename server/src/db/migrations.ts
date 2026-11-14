import type { Database } from './sqlite.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_charge_id TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  sats INTEGER,
  payreq TEXT NOT NULL,
  exchange_rate REAL,
  product_label TEXT,
  language TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER,
  paid_at INTEGER,
  credit_attempts INTEGER NOT NULL DEFAULT 0,
  credit_claimed_at INTEGER,
  credited_at INTEGER,
  credit_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_provider_charge ON orders(provider_charge_id);

CREATE TABLE IF NOT EXISTS machine_credits (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  attempted_at INTEGER NOT NULL,
  result TEXT NOT NULL,
  raw TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_seen (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_ts ON webhook_seen(ts);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expires ON admin_sessions(expires_at);
`;

export function migrate(db: Database): void {
  db.exec(SCHEMA);
}
