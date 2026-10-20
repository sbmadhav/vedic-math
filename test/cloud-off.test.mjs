/* The device-only launch (change learnvedicmath, tasks 1.8 and 8.5): js/cloud-config.js ships with FIREBASE = null and no
   App Check key, so World boards are off for everyone. Then js/cloud.js never loads a Firebase file, never reads and
   never posts, whatever the Player's Age answer. test/cloud.test.mjs covers the same module with a sample config. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
globalThis.location ??= { hostname: 'learnvedicmath.com' };
globalThis.self ??= globalThis;
const cfg = readFileSync(new URL('../js/cloud-config.js', import.meta.url), 'utf8');
const off = /export const FIREBASE = null;/.test(cfg);
const cloud = await import('../js/cloud.js');

test('the committed config has World boards off and no App Check key (task 8.5 turns them on)', { skip: !off && 'World boards are configured' }, () => {
  assert.match(cfg, /export const appCheckSiteKey = '';/);
  assert.equal(cloud.enabled(), false);
  assert.equal(cloud.appCheckOn(), false);
});

test('with World boards off nobody may view one, and nothing loads, reads or posts, even for a Player 13 or over', { skip: !off && 'World boards are configured' }, async () => {
  const files = [];
  cloud._setLoader(async url => { files.push(url); throw new Error('no SDK in this test'); });
  try {
    for (const age of ['adult', 15, 10, undefined]) {
      const p = { id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode: 'challenger', age };
      assert.equal(cloud.canViewWorld(p), false, String(age));
      await assert.rejects(cloud.top('daily-2026-10-20-challenger', 10, p), /off/);
      assert.deepEqual(await cloud.submit('daily-2026-10-20-challenger', { name: p.name, avatar: p.avatar, score: 100 }, p), { posted: false, reason: 'off' }, String(age));
      assert.deepEqual(await cloud.postWeekSparks('challenger', 500, p), { posted: false, reason: 'off' }, String(age));
      await cloud.forget(p);
    }
    assert.deepEqual(files, [], 'no Firebase file was loaded');
  } finally { cloud._setLoader(null); }
});
