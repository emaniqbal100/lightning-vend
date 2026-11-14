import type { Database } from '../db/sqlite.js';

export class SessionRepo {
  private readonly insertStmt;
  private readonly validStmt;
  private readonly deleteStmt;
  private readonly pruneStmt;
  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(
      'INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)',
    );
    this.validStmt = db.prepare(
      'SELECT 1 FROM admin_sessions WHERE token_hash = ? AND expires_at > ?',
    );
    this.deleteStmt = db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?');
    this.pruneStmt = db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?');
  }

  create(tokenHash: string, createdAt: number, expiresAt: number): void {
    this.insertStmt.run(tokenHash, createdAt, expiresAt);
  }

  isValid(tokenHash: string, now: number): boolean {
    return this.validStmt.get(tokenHash, now) !== undefined;
  }

  delete(tokenHash: string): void {
    this.deleteStmt.run(tokenHash);
  }

  prune(now: number): void {
    this.pruneStmt.run(now);
  }
}
