/* Sparks replace XP (docs/adr/0003, openspec sparks and medals specs): saved progress from before the change
   (schema v2: xp, weekXp, stars) carries over 1:1 for every Player on the device and from old backup codes,
   a second load changes nothing, and the new Sparks, Medal and Kata calls keep the rules they replace. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { vi } from 'vitest';

const mem = {};
globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const clear = () => { for (const k of Object.keys(mem)) delete mem[k]; };
/* A new page load: a fresh copy of the store module over whatever this device has saved (Vitest's module registry is
   reset, as a new ?load= query did under node --test) */
const boot = () => { vi.resetModules(); return import('../js/store.js'); };
const saved = id => JSON.parse(mem['mathquest.v1.' + id]);

const { isoWeek } = await boot();
const WK = isoWeek();
const v2 = (xp, week, stars = {}) => ({ v: 2, skills: {}, xp, days: {}, best: {}, last: null, grade: null, badges: { level5: 1 }, counts: { answers: 3 }, seen: {}, stars, ratings: {}, weekXp: { [WK]: week }, questDay: null });
const STARS = { 'k:sq5:1': 2, 'k:sq5:2': 0, 'g:rain:5': 3, 'a:7': 1 };
const family = () => {
  clear();
  mem['vm.players'] = JSON.stringify({ active: 'p1', list: [{ id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode: 'challenger' }, { id: 'p2', name: 'Lucky Otter 17', avatar: 'sun', mode: 'pro' }] });
  mem['mathquest.v1.p1'] = JSON.stringify(v2(2340, 410, STARS));
  mem['mathquest.v1.p2'] = JSON.stringify(v2(900, 0, { 'g:times-sprint:3': 2 }));
};

test('a v2 Player with 2,340 XP, 410 this week, loads with 2,340 Sparks and 410 this week (Titles: gamify.test.mjs)', async () => {
  family();
  const store = await boot();
  assert.equal(store.sparks(), 2340);
  assert.equal(store.weekSparks(), 410);
  assert.equal(store.load().v, 3);
  assert.ok(store.badges().level5, 'earned badges stay');
});

test('stars become Medals (game Levels and tower) and done Katas; stars itself is left untouched', async () => {
  family();
  const store = await boot();
  const d = store.load();
  assert.deepEqual(d.medals, { 'g:rain:5': 3, 'a:7': 1 });
  assert.deepEqual(d.katasDone, { 'k:sq5:1': 1 });
  assert.equal(store.medal('g:rain:5'), 3);
  assert.equal(store.medal('a:7'), 1);
  assert.equal(store.kataDone('k:sq5:1'), true);
  assert.equal(store.kataDone('k:sq5:2'), false, 'a Kata with 0 stars is not done');
  assert.deepEqual(saved('p1').stars, STARS, 'stars kept for a rollback');
});

test('every Player on the device is migrated at the first load, not only the active one', async () => {
  family();
  const store = await boot();
  store.load();
  const p2 = saved('p2');
  assert.equal(p2.v, 3);
  assert.equal(p2.sparks, 900);
  assert.deepEqual(p2.medals, { 'g:times-sprint:3': 2 });
  assert.equal(store.weekSparksOf('p2'), 0);
  assert.equal(store.weekSparksOf('p1'), 410);
  store.switchPlayer('p2');
  assert.equal(store.sparks(), 900);
  assert.equal(store.medal('g:times-sprint:3'), 2);
});

test('the weekly total of another Player is read through the migration even before it is saved', async () => {
  family();
  const store = await boot();
  mem['mathquest.v1.p2'] = JSON.stringify(v2(900, 75)); /* an old tab wrote it back after this load */
  assert.equal(store.weekSparksOf('p2'), 75);
});

test('a second load is a no-op: the same records', async () => {
  family();
  (await boot()).load();
  const once = { p1: mem['mathquest.v1.p1'], p2: mem['mathquest.v1.p2'] };
  const again = await boot();
  again.load(); again.save();
  assert.deepEqual(saved('p1'), JSON.parse(once.p1));
  assert.deepEqual(saved('p2'), JSON.parse(once.p2));
  assert.equal(again.sparks(), 2340);
});

test('migrate() run twice on the same record changes nothing the second time', async () => {
  const { migrate } = await boot();
  const d = migrate(v2(120, 30, STARS)), first = JSON.stringify(d);
  assert.equal(JSON.stringify(migrate(d)), first);
  assert.equal(d.sparks, 120);
});

test('Sparks earned after the update are never overwritten by the old xp field', async () => {
  family();
  const store = await boot();
  store.addSparks(50, 'test');
  const store2 = await boot();
  assert.equal(store2.sparks(), 2390);
  assert.equal(store2.weekSparks(), 460, 'the week of the update: 410 plus 50 on the same weekly total');
});

test('for one release xp and weekXp mirror Sparks, so a rollback keeps the totals', async () => {
  family();
  const store = await boot();
  store.addSparks(10, 'test');
  const d = saved('p1');
  assert.equal(d.xp, 2350);
  assert.deepEqual(d.weekXp, { [WK]: 420 });
});

test('restoring a backup code made before the update turns its XP into Sparks', async () => {
  family();
  const store = await boot();
  await store.loadBackup();
  store.importData(JSON.stringify({ player: { name: 'Swift Tiger 42' }, data: v2(900, 20, { 'a:3': 3, 'k:by11:4': 1 }) }));
  assert.equal(store.sparks(), 900);
  assert.equal(store.weekSparks(), 20);
  assert.equal(store.medal('a:3'), 3);
  assert.equal(store.kataDone('k:by11:4'), true);
  const back = JSON.parse(store.exportData()).records.p1;
  assert.equal(back.sparks, 900);
  assert.equal(back.v, 3);
});

test('a fresh device starts at v3 with 0 Sparks and nothing to migrate', async () => {
  clear();
  const store = await boot();
  assert.equal(store.sparks(), 0);
  assert.equal(store.load().v, 3);
  assert.deepEqual(store.load().medals, {});
});

test('the sparks event carries before, after, the amount and why', async () => {
  family();
  const store = await boot(), got = [];
  store.on((type, d) => { if (type === 'sparks') got.push(d); });
  store.record('3-mult', true, false);
  assert.deepEqual(got, [{ before: 2340, after: 2351, n: 11, why: 'answer' }]);
});

test('setMedal keeps the best Medal; medalsWhere counts bronze, silver and gold', async () => {
  clear();
  const store = await boot();
  assert.equal(store.setMedal('a:1', 3), true);
  assert.equal(store.setMedal('a:1', 1), false, 'a worse result later');
  assert.equal(store.medal('a:1'), 3);
  store.setMedal('a:2', 1); store.setMedal('a:3', 2); store.setMedal('g:rain:1', 3);
  assert.deepEqual(store.medalsWhere('a:'), { bronze: 1, silver: 1, gold: 1, any: 3 });
});

test('a done Kata stays done; katasDoneWhere counts them', async () => {
  clear();
  const store = await boot();
  assert.equal(store.setKataDone('k:sq5:1'), true);
  assert.equal(store.setKataDone('k:sq5:1'), false);
  store.setKataDone('k:sq5:2'); store.setKataDone('k:by11:1');
  assert.equal(store.kataDone('k:sq5:1'), true);
  assert.equal(store.katasDoneWhere('k:sq5:'), 2);
  assert.equal(store.katasDoneWhere('k:'), 3);
});
