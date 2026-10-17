/* Spend guard of the recording tools (openspec better-voice, task 2.5): every paid request is counted in a ledger by
   month at list price, and refused before it is sent when it would pass the monthly cap ($300 by default) or the
   per-run cap. Runs on a temp ledger with no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeGuard, PRICE_PER_CHAR } from '../tools/voice/voice-lib.mjs';

const dir = mkdtempSync(join(tmpdir(), 'voice-ledger-'));
test.after(() => rmSync(dir, { recursive: true, force: true }));
const month = new Date().toISOString().slice(0, 7);

test('Chirp 3 HD is counted at $30 per million characters', () => {
  assert.equal(PRICE_PER_CHAR.google, 30e-6);
});

test('a request past the monthly budget is refused and not counted', () => {
  const ledger = join(dir, 'a.json'), g = makeGuard({ ledger, budget: 0.0003, runCap: 50 });
  assert.ok(Math.abs(g.charge('google', 5) - 0.00015) < 1e-12);
  assert.throws(() => g.charge('google', 6), /budget: this month/);
  const led = JSON.parse(readFileSync(ledger, 'utf8'));
  assert.deepEqual(led[month].chars, { google: 5 });
});

test('a request past the per-run cap is refused', () => {
  const g = makeGuard({ ledger: join(dir, 'b.json'), budget: 300, runCap: 0.0001 });
  assert.throws(() => g.charge('google', 10), /RUN_USD/);
});

test('the month carries across runs; each run starts its own run total', () => {
  const ledger = join(dir, 'c.json');
  makeGuard({ ledger }).charge('google', 1000);
  const g = makeGuard({ ledger });
  assert.equal(g.runUsd(), 0);
  assert.ok(Math.abs(g.spent() - 0.03) < 1e-9);
});

test('requests are paced, also when several workers ask at once', async () => {
  let t = 0; const g = makeGuard({ ledger: join(dir, 'd.json'), perMin: 6000, now: () => t });
  const times = [];
  await Promise.all([1, 2, 3].map(() => g.pace().then(() => { times.push(t); t += 0; })));
  assert.equal(times.length, 3);
});

test('the default caps are the owner\'s: $300 a month, $50 a run', () => {
  const src = readFileSync(new URL('../tools/voice/voice-lib.mjs', import.meta.url), 'utf8');
  assert.match(src, /BUDGET_USD \|\| 300/);
  assert.match(src, /RUN_USD \|\| 50/);
  assert.doesNotMatch(src, /AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_-]{20,}/); // keys only ever come from the environment
});
