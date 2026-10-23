/* Spend guard of the recording tools (openspec better-voice, task 2.5): every paid request is counted in a ledger by
   month at list price, and refused before it is sent when it would pass the monthly cap ($300 by default) or the
   per-run cap. Runs on a temp ledger with no network. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

test('a limit that is not a positive number refuses to make the guard', () => {
  for (const bad of [{ budget: NaN }, { runCap: 0 }, { perMin: -1 }, { budget: Infinity }]) assert.throws(() => makeGuard({ ledger: join(dir, 'x.json'), ...bad }), /must be a positive number/);
  const env = process.env.BUDGET_USD; process.env.BUDGET_USD = 'oops';
  try { assert.throws(() => makeGuard({ ledger: join(dir, 'x.json') }), /BUDGET_USD must be a positive number/); } finally { if (env === undefined) delete process.env.BUDGET_USD; else process.env.BUDGET_USD = env; }
});

test('record.mjs leaves out only a line the provider refused (400) and stops on any other failure', () => {
  const src = readFileSync(new URL('../tools/voice/record.mjs', import.meta.url), 'utf8');
  assert.match(src, /if \(!String\(e\.message\)\.startsWith\('400 '\)\) throw e;/);
});

test('the month carries across runs; each run starts its own run total', () => {
  const ledger = join(dir, 'c.json');
  makeGuard({ ledger }).charge('google', 1000);
  const g = makeGuard({ ledger });
  assert.equal(g.runUsd(), 0);
  assert.ok(Math.abs(g.spent() - 0.03) < 1e-9);
});

test('requests are paced, also when several workers ask at once', async t => {
  /* The mark of when a request left is the last clock read before its pace() settles. The marks must be at least the
     full 10 ms apart, even when a timer fires early (pace() then waits again). Virtual time, so the result does not
     depend on how busy the machine is: setTimeout is a fake that fires every timer 2 ms early, and the clock moves
     1 ms at a time with the promise chains drained after each step. */
  let clock = 1000, last = 0, done = false; const left = [], timers = [];
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => { timers.push({ at: clock + Math.max(0, ms - 2), fn }); return 0; });
  const g = makeGuard({ ledger: join(dir, 'd.json'), perMin: 6000, now: () => (last = clock) });
  const all = Promise.all([1, 2, 3].map(() => g.pace().then(() => left.push(last)))).then(() => { done = true; });
  const flush = () => new Promise(r => setImmediate(r));
  for (let ms = 0; ms < 1000 && !done; ms++) {
    await flush(); clock++;
    for (const due of timers.filter(x => x.at <= clock)) { timers.splice(timers.indexOf(due), 1); due.fn(); }
  }
  await all;
  assert.equal(left.length, 3);
  for (let i = 1; i < left.length; i++) assert.ok(left[i] - left[i - 1] >= 10, `gap ${left[i] - left[i - 1]} ms`);
});

test('the default caps are the owner\'s: $300 a month, $50 a run', () => {
  const src = readFileSync(new URL('../tools/voice/voice-lib.mjs', import.meta.url), 'utf8');
  assert.match(src, /BUDGET_USD \|\| 300/);
  assert.match(src, /RUN_USD \|\| 50/);
  assert.doesNotMatch(src, /AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_-]{20,}/); // keys only ever come from the environment
});

/* The CI deploy step (tools/voice/ci-fetch.mjs, task 2.4): an archive is unpacked into the site only when its SHA-256
   matches js/voice-index.js and it holds every file the index names. Runs on a local archive (VOICE_ARCHIVE). */

function fakeRelease(name, { files = ['l/set.0123456789.bin', 'p/dir.0123456789.json', 'p/core.0123456789.m4a', 'p/core.0123456789.json', 'l/00000000000001.m4a'], hash } = {}) {
  const root = join(dir, name), src = join(root, 'src'), site = join(root, 'site');
  for (const f of files) { mkdirSync(join(src, f, '..'), { recursive: true }); writeFileSync(join(src, f), f); }
  mkdirSync(site, { recursive: true }); writeFileSync(join(site, 'index.html'), '<!doctype html>');
  const tar = join(root, 'voice.tar');
  execFileSync('tar', ['-C', src, '-cf', tar, '.'], { env: { ...process.env, COPYFILE_DISABLE: '1' } });
  const sha256 = hash || createHash('sha256').update(readFileSync(tar)).digest('hex');
  const index = { voice: 'en-US-Chirp3-HD-Aoede', base: 'https://voice.learnvedicmath.com/', tag: 'voice-' + sha256.slice(0, 10), sha256, lineSet: 'l/set.0123456789.bin', dir: 'p/dir.0123456789.json',
    packs: [{ name: 'core', audio: 'p/core.0123456789.m4a', map: 'p/core.0123456789.json' }], counts: { lines: 1, clips: 1 } };
  const idx = join(root, 'index.mjs'); writeFileSync(idx, `export const STUDIO = ${JSON.stringify(index)};`);
  const run = () => spawnSync(process.execPath, [fileURLToPath(new URL('../tools/voice/ci-fetch.mjs', import.meta.url)), site], { env: { ...process.env, VOICE_ARCHIVE: tar, VOICE_INDEX: idx }, encoding: 'utf8' });
  return { site, run };
}

test('ci-fetch unpacks a matching archive into <site>/voice/', () => {
  const { site, run } = fakeRelease('good'), r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(site, 'voice/p/core.0123456789.m4a')));
  assert.ok(existsSync(join(site, 'voice/l/00000000000001.m4a')));
});

test('ci-fetch fails on a wrong hash and unpacks nothing', () => {
  const { site, run } = fakeRelease('badhash', { hash: 'f'.repeat(64) }), r = run();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /expects f{64}/);
  assert.ok(!existsSync(join(site, 'voice')));
});

test('ci-fetch fails when the archive lacks a file the index names', () => {
  const { run } = fakeRelease('missing', { files: ['l/set.0123456789.bin', 'p/dir.0123456789.json', 'l/00000000000001.m4a'] }), r = run();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /p\/core\.0123456789\.(m4a|json) is named by js\/voice-index\.js but is not in the archive/);
});

/* The Family helpers' voice samples (openspec family-helpers, task 1.5): owner-run, a few lines per friend and band */
test('family-samples.mjs plans a few lines per friend and band in three distinct voices, and sends nothing without GO=1', async () => {
  const { samplePlan, planCost } = await import('../tools/voice/family-samples.mjs');
  const plan = samplePlan({});
  assert.equal(new Set(plan.map(s => s.voice)).size, 3);
  assert.deepEqual([...new Set(plan.map(s => s.voice))], ['en-US-Chirp3-HD-Puck', 'en-US-Chirp3-HD-Leda', 'en-US-Chirp3-HD-Charon']);
  for (const f of ['shunya', 'nava', 'eka']) for (const b of ['early', 'growing', 'fluent']) assert.ok(plan.some(s => s.friend === f && s.band === b), `${f} ${b}`);
  assert.ok(plan.every(s => !/\{\w+\}/.test(s.text) && s.text.length > 0));
  assert.ok(planCost(plan) < 0.1, 'well under ten cents');
  assert.equal(samplePlan({ NAVA: 'en-US-Chirp3-HD-Kore' }).find(s => s.friend === 'nava').voice, 'en-US-Chirp3-HD-Kore');
  const env = { ...process.env }; for (const k of ['GO', 'GOOGLE_TTS_TOKEN', 'GOOGLE_TTS_KEY']) delete env[k];
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/voice/family-samples.mjs', import.meta.url))], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Nothing sent/);
});
