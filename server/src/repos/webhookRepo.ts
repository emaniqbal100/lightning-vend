import type { Database } from '../db/sqlite.js';

export class WebhookRepo {
  private readonly insertStmt;
  private readonly pruneStmt;
  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare('INSERT OR IGNORE INTO webhook_seen (id, ts) VALUES (?, ?)');
    this.pruneStmt = db.prepare('DELETE FROM webhook_seen WHERE ts < ?');
  }

  /** Returns true the first time this id is seen, false on replays. */
  markSeen(id: string, now: number): boolean {
    return this.insertStmt.run(id, now).changes === 1;
  }

  prune(now: number): void {
    this.pruneStmt.run(now);
  }
}
