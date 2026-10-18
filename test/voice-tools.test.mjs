/* Spend guard of the recording tools (openspec better-voice, task 2.5): every paid request is counted in a ledger by
   month at list price, and refused before it is sent when it would pass the monthly cap ($300 by default) or the
   per-run cap. Runs on a temp ledger with no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
  const g = makeGuard({ ledger: join(dir, 'd.json'), perMin: 6000 }); // 10 ms apart
  const times = [];
  await Promise.all([1, 2, 3].map(() => g.pace().then(() => times.push(performance.now()))));
  assert.equal(times.length, 3);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 9, `gap ${times[i] - times[i - 1]} ms`);
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
  const index = { voice: 'en-US-Chirp3-HD-Aoede', base: '/vedic-math/voice/', tag: 'voice-' + sha256.slice(0, 10), sha256, lineSet: 'l/set.0123456789.bin', dir: 'p/dir.0123456789.json',
    packs: [{ name: 'core', audio: 'p/core.0123456789.m4a', map: 'p/core.0123456789.json' }], counts: { lines: 1, clips: 1 } };
  const idx = join(root, 'index.mjs'); writeFileSync(idx, `export const STUDIO = ${JSON.stringify(index)};`);
  const run = () => spawnSync(process.execPath, [new URL('../tools/voice/ci-fetch.mjs', import.meta.url).pathname, site], { env: { ...process.env, VOICE_ARCHIVE: tar, VOICE_INDEX: idx }, encoding: 'utf8' });
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
