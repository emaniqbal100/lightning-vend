// Thin typed wrapper around Node's built-in `node:sqlite`. The interface mirrors
// better-sqlite3 closely enough that the persistence layer could be swapped to
// better-sqlite3 where its prebuilt binaries are available.
import { DatabaseSync } from 'node:sqlite';

export type BindValue = string | number | bigint | Uint8Array | null;

export interface StatementResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface PreparedStatement {
  run(...params: BindValue[]): StatementResult;
  get<T = unknown>(...params: BindValue[]): T | undefined;
  all<T = unknown>(...params: BindValue[]): T[];
}

export class Database {
  private readonly db: DatabaseSync;
  private readonly stmts = new Map<string, ReturnType<DatabaseSync['prepare']>>();

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
    this.db.exec('PRAGMA busy_timeout = 5000;');
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): PreparedStatement {
    let raw = this.stmts.get(sql);
    if (!raw) {
      raw = this.db.prepare(sql);
      this.stmts.set(sql, raw);
    }
    return {
      run: (...params: BindValue[]) => raw.run(...params) as StatementResult,
      get: <T>(...params: BindValue[]) => raw.get(...params) as T | undefined,
      all: <T>(...params: BindValue[]) => raw.all(...params) as T[],
    };
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        /* ignore rollback failures */
      }
      throw err;
    }
  }

  transactionImmediate<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw err;
    }
  }

  close(): void {
    for (const s of this.stmts.values()) {
      // @ts-expect-error - finalize exists at runtime on node:sqlite statements
      try { s.finalize?.(); } catch { /* ignore */ }
    }
    this.stmts.clear();
    this.db.close();
  }
}
