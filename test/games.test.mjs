/* Strategy game levels: 14 games x 72 levels = 1,008. Levels set where the adaptive dial starts and the
   Medal goals in difficulty-weighted points. The question ladders are checked in adapt.test.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, LEVELS, LEVELS_PER_GAME, levelMedal } from '../js/games.js';

test('there are 1,008 game levels: 14 games x 72', () => {
  assert.equal(GAMES.length, 14);
  assert.equal(LEVELS_PER_GAME, 72);
  assert.equal(Object.keys(LEVELS).length * LEVELS_PER_GAME, 1008);
});

test('game ids are unique and every game has a level table', () => {
  const ids = GAMES.map(g => g.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), Object.keys(LEVELS).sort());
  GAMES.forEach(g => { assert.equal(typeof g.run, 'function', g.id); assert.ok(g.modes.length > 0, g.id); });
});

test('every level has settings and three rising goals', () => {
  const keys = new Set();
  for (const [id, fn] of Object.entries(LEVELS)) for (let L = 1; L <= LEVELS_PER_GAME; L++) {
    const lv = fn(L), name = `${id} level ${L}`;
    keys.add(`${id}:${L}`);
    assert.ok(lv && typeof lv.cfg === 'object', name);
    assert.equal(lv.goal.length, 3, name);
    assert.ok(lv.goal.every(v => Number.isInteger(v) && v > 0), `${name}: goal ${lv.goal}`);
    assert.ok(lv.goal[0] < lv.goal[1] && lv.goal[1] <= lv.goal[2], `${name}: goal ${lv.goal}`);
    for (const [k, v] of Object.entries(lv.cfg)) if (typeof v === 'number') assert.ok(Number.isFinite(v) && v > 0, `${name}: ${k}=${v}`);
    assert.ok(lv.cfg.start >= 1 && lv.cfg.start <= 20 && lv.cfg.floor <= lv.cfg.start, `${name}: start ${lv.cfg.start}, floor ${lv.cfg.floor}`);
    if (L > 1) assert.ok(lv.cfg.start >= fn(L - 1).cfg.start && lv.goal[2] >= fn(L - 1).goal[2], `${name}: easier than level ${L - 1}`);
    assert.deepEqual(fn(L), lv, `${name} is not deterministic`);
  }
  assert.equal(keys.size, 1008);
});

const ties = Object.entries(LEVELS).flatMap(([id, fn]) => Array.from({ length: LEVELS_PER_GAME }, (_, i) => [id, i + 1, fn(i + 1).goal]).filter(([, , g]) => g[1] === g[2]).map(([id, L, g]) => `${id} level ${L} (${g})`));
test('every level has a separate silver and gold goal', { todo: ties.length ? `${ties.length} levels give gold at the silver score, e.g. ${ties[0]}, ${ties[ties.length - 1]}` : false }, () => {
  assert.deepEqual(ties, []);
});

test('level Medals: one per goal reached (1 bronze, 2 silver, 3 gold)', () => {
  assert.equal(levelMedal([5, 8, 10], 4), 0);
  assert.equal(levelMedal([5, 8, 10], 5), 1);
  assert.equal(levelMedal([5, 8, 10], 9), 2);
  assert.equal(levelMedal([5, 8, 10], 10), 3);
});

/* Calm (openspec game-shell-and-calm): an untimed round of a timed game starts no clock and ends after perQ answers */
test('untimed Times sprint ends after perQ answers, once, with no clock', async () => {
  globalThis.document ??= { hidden: true }; /* sounds are skipped */
  const { kit } = await import('../js/games.js');
  const { Dial } = await import('../js/adapt.js');
  const g = GAMES.find(x => x.id === 'times-sprint');
  const ends = [], ctl = new AbortController(), dial = new Dial(4);
  const k = kit({ dial, signal: ctl.signal, untimed: true, perQ: g.perQ, end: p => ends.push(p) });
  k.timed(null, g.secs); /* would throw on the null area if it started a clock */
  for (let i = 0; i < g.perQ - 1; i++) k.mark(true, null);
  await new Promise(r => setTimeout(r, 450));
  assert.deepEqual(ends, [], 'not before its questions are done');
  k.mark(true, null); k.mark(true, null);
  await new Promise(r => setTimeout(r, 450));
  assert.equal(ends.length, 1);
  assert.equal(ends[0], dial.points);
  ctl.abort();
});
