/* VoiceLedger, the one Durable Object (SQLite) that counts what the paid endpoints may spend (openspec change
   react-typescript, design D16 and "Turnstile before the server voice"; family-helpers design D15 and D18; ADRs 0014 and
   0015). One instance for the site, so every count is strongly consistent: concurrent requests can never pass a cap.
   Today it holds the Family conversation's counts: turns an hour per connection address (kept only as a keyed hash
   whose key changes daily, workers/src/session.ts addrHash), turns a UTC day and turns a month (the $5 and $50 caps as
   request counts, family-helpers design D18, "What a turn costs"), and the session tickets issued an hour per address.
   Every row carries its expiry and is deleted at the first call after it, so an hourly count is gone when its hour
   ends and nothing is kept longer than its period. The server voice (react-typescript task 11.2) adds its spend here. */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from './index.ts';

/* One unit from each counter, or none: the key, the most it may reach, and when the row expires (ms since the epoch) */
export interface Want { key: string; limit: number; expires: number }

export class VoiceLedger extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS counts (key TEXT PRIMARY KEY, n INTEGER NOT NULL, expires INTEGER NOT NULL)');
  }
  /* Counts one unit on every counter at once, in one transaction, or on none of them. Returns null when all were
     under their limit (and are now counted), else the key of the first counter that was full. Expired rows go first. */
  take(wants: Want[], now: number = Date.now()): string | null {
    return this.ctx.storage.transactionSync(() => {
      this.sweep(now);
      for (const w of wants) if (this.read(w.key) >= w.limit) return w.key;
      for (const w of wants) this.ctx.storage.sql.exec('INSERT INTO counts (key, n, expires) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET n = n + 1', w.key, w.expires);
      return null;
    });
  }
  /* The count under a key now (0 when none or expired) */
  count(key: string, now: number = Date.now()): number {
    this.sweep(now);
    return this.read(key);
  }
  /* Every key still kept (the tests read it: no address, nothing past its period) */
  keys(now: number = Date.now()): string[] {
    this.sweep(now);
    return this.ctx.storage.sql.exec<{ key: string }>('SELECT key FROM counts ORDER BY key').toArray().map(r => r.key);
  }
  private read(key: string): number {
    const row = this.ctx.storage.sql.exec<{ n: number }>('SELECT n FROM counts WHERE key = ?', key).toArray()[0];
    return row ? row.n : 0;
  }
  private sweep(now: number): void {
    this.ctx.storage.sql.exec('DELETE FROM counts WHERE expires <= ?', now);
  }
}

/* The periods a count lives in, from a time in ms: the hour, the UTC day and the month, each with its end */
export const HOUR_MS = 3_600_000;
export function periods(now: number): { hour: string; hourEnd: number; day: string; dayEnd: number; month: string; monthEnd: number } {
  const d = new Date(now), y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  const h = Math.floor(now / HOUR_MS);
  return {
    hour: String(h), hourEnd: (h + 1) * HOUR_MS,
    day: d.toISOString().slice(0, 10), dayEnd: Date.UTC(y, m, day + 1),
    month: d.toISOString().slice(0, 7), monthEnd: Date.UTC(y, m + 1, 1),
  };
}
/* The one ledger instance */
export const ledgerOf = (env: Env): DurableObjectStub<VoiceLedger> => env.VOICE_LEDGER.get(env.VOICE_LEDGER.idFromName('ledger'));
