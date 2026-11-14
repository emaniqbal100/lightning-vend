import type { Database } from '../db/sqlite.js';
import type { AppConfig } from '@lightning-vend/shared/config';

export const SETTING_KEYS = [
  'price',
  'currency',
  'invoiceExpirySeconds',
  'pollIntervalMs',
  'defaultLanguage',
  'provider',
  'machine',
  'alertWebhookUrl',
  'alertEmailTo',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export function defaultSettings(config: AppConfig): Record<SettingKey, string> {
  return {
    price: String(config.DEFAULT_PRICE),
    currency: config.DEFAULT_CURRENCY,
    invoiceExpirySeconds: String(config.INVOICE_EXPIRY_SECONDS),
    pollIntervalMs: String(config.POLL_INTERVAL_MS),
    defaultLanguage: config.defaultLanguage,
    provider: config.provider,
    machine: config.machine,
    alertWebhookUrl: config.ALERT_WEBHOOK_URL ?? '',
    alertEmailTo: config.ALERT_EMAIL_TO ?? '',
  };
}

export class SettingsRepo {
  private readonly getAllStmt;
  private readonly getStmt;
  private readonly setStmt;

  constructor(private readonly db: Database) {
    this.getAllStmt = db.prepare<{ key: string; value: string }>('SELECT key, value FROM settings');
    this.getStmt = db.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?');
    this.setStmt = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    );
  }

  getAll(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const row of this.getAllStmt.all()) out[row.key] = row.value;
    return out;
  }

  get(key: string): string | undefined {
    return this.getStmt.get(key)?.value;
  }

  set(key: string, value: string): void {
    this.setStmt.run(key, value);
  }

  setMany(map: Record<string, string>): void {
    this.db.transaction(() => {
      for (const [k, v] of Object.entries(map)) this.setStmt.run(k, v);
    });
  }

  ensureSeeded(config: AppConfig): Record<string, string> {
    const current = this.getAll();
    const defaults = defaultSettings(config);
    const merged = { ...defaults, ...current };
    const missing = Object.entries(merged).filter(([k]) => !(k in current));
    if (missing.length || Object.keys(current).length === 0) this.setMany(merged);
    return merged;
  }
}
