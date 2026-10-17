/* Pattern Wall: every catalog pattern's generator matches its own predicate and canonical rule, near
   misses do not match, rule tiles evaluate honestly (with counterexamples), names come only from the word
   lists, and share codes round trip. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../../js/play/exp/wall-core.js';
import { rng, b64url } from '../../js/play/kit.js';

const grids = Object.fromEntries(Object.keys(W.GRIDS).map(id => [id, W.makeGrid(id, { y: 2026, m: 10 })]));

test('grids have the right numbers', () => {
  assert.equal(grids.hundred.cells.length, 100); assert.equal(grids.times.cells[99].n, 100); assert.equal(grids.times.cells[23].n, 3 * 4);
  assert.equal(grids.meru.cells.length, 78); assert.deepEqual(grids.meru.cells.filter(c => c.r === 4).map(c => c.n), [1, 4, 6, 4, 1]);
  assert.equal(grids.calendar.cells.length, 31); assert.equal(grids.calendar.start, 4, 'October 1, 2026 is a Thursday');
  assert.deepEqual(grids.spiral.cells.map(c => c.n).sort((a, b) => a - b), Array.from({ length: 121 }, (_, i) => i + 1));
  const at = n => grids.spiral.cells.find(c => c.n === n);
  assert.deepEqual([at(1).r, at(1).c], [5, 5]);
  const odd = [1, 9, 25, 49, 81, 121].map(at); odd.forEach((c, i) => assert.deepEqual([c.r, c.c], [5 + i, 5 + i]), 'odd squares on one diagonal');
  for (let n = 1; n < 121; n++) { const a = at(n), b = at(n + 1); assert.equal(Math.abs(a.r - b.r) + Math.abs(a.c - b.c), 1, `spiral step ${n}`); }
  assert.equal(grids.roots.cells.length, 81);
});

test('the catalog has at least 30 patterns with unique ids, blurbs and rules', () => {
  assert.ok(W.PATTERNS.length >= 30, `${W.PATTERNS.length} patterns`);
  assert.equal(new Set(W.PATTERNS.map(p => p.id)).size, W.PATTERNS.length);
  for (const p of W.PATTERNS) {
    assert.ok(p.title && p.blurb && W.GRIDS[p.grid], p.id);
    assert.ok(W.variantsOf(p, grids[p.grid]).length >= 1, `${p.id} has a variant`);
    for (const d of p.decoys) assert.ok(W.CLAIMS[d], `${p.id} decoy ${d}`);
    assert.ok(!JSON.stringify([p.title, p.blurb, p.history || '']).includes('—'));
  }
  assert.ok(W.PATTERNS.filter(p => p.history).length >= 5, 'a famous shelf');
});

test('each pattern matches its own cells, and its canonical rule is true and fits', () => {
  for (const p of W.PATTERNS) {
    const g = grids[p.grid];
    for (const v of W.variantsOf(p, g)) {
      const m = W.match(g, v.set);
      assert.ok(m.some(x => x.pattern.id === p.id && x.variant.key === v.key), `${p.id}/${v.key} matches itself`);
      const r = W.evalRule(W.ruleFor(p, v.key), g, v.set);
      assert.ok(r.ok && r.fits, `${p.id}/${v.key} rule ${JSON.stringify(r)}`);
    }
  }
});

/* Every calendar month for three years, since the Calendar grid is the current month */
const gridsOf = id => (id === 'calendar' ? Array.from({ length: 36 }, (_, i) => W.makeGrid('calendar', { y: 2026 + Math.floor(i / 12), m: (i % 12) + 1 })) : [grids[id]]);

test('decoy tiles are false for every variant of their pattern, while the true rule holds', () => {
  for (const p of W.PATTERNS) for (const g of gridsOf(p.grid)) for (const v of W.variantsOf(p, g)) {
    const r = W.ruleFor(p, v.key), canon = W.evalRule(r, g, v.set);
    assert.ok(canon.ok && canon.fits, `${p.id}/${v.key} true rule`);
    for (const d of p.decoys) {
      assert.notEqual(d, r.c, `${p.id}/${v.key}: decoy ${d} is the true rule`);
      for (const s of new Set([r.s, 'painted'])) { const e = W.evalRule({ s, c: d }, g, v.set); assert.ok(!(e.ok && e.fits), `${p.id}/${v.key}: decoy "${W.ruleText({ s, c: d })}" is true`); }
    }
  }
});

test('near misses (one cell more or less) do not match the same pattern variant', () => {
  for (const p of W.PATTERNS) {
    const g = grids[p.grid];
    for (const v of W.variantsOf(p, g).slice(0, 4)) {
      const less = new Set(v.set); less.delete([...v.set][0]);
      assert.ok(!W.match(g, less).some(x => x.pattern.id === p.id && x.variant.key === v.key), `${p.id}/${v.key} minus one`);
      const extra = g.cells.find(c => !v.set.has(c.i));
      if (extra) { const more = new Set([...v.set, extra.i]); assert.ok(!W.match(g, more).some(x => x.pattern.id === p.id && x.variant.key === v.key), `${p.id}/${v.key} plus one`); }
    }
  }
});

test('paint tools select by value and combine with add and overlap', () => {
  const g = grids.hundred;
  const m9 = W.applyTool(g, new Set(), 'mult', 9);
  assert.equal(m9.size, 11);
  assert.equal(W.match(g, m9)[0].pattern.id, 'h-mult9');
  const primes = W.applyTool(g, new Set(), 'prime');
  assert.equal(primes.size, 25);
  const odd = W.applyTool(g, new Set(), 'rem', [1, 2]);
  const both = W.applyTool(g, primes, 'rem', [1, 2], 'overlap');
  assert.equal(both.size, 24); assert.ok([...both].every(i => odd.has(i)));
  const p3 = new Set(primes); p3.delete(1); p3.delete(2);
  assert.equal(W.match(g, p3)[0].pattern.id, 'h-prime3');
  assert.equal(W.applyTool(g, new Set([0]), 'square', null, 'add').size, 10);
  assert.equal(W.applyTool(g, new Set(), 'dsum', 9).size, 10);
});

test('rule tiles: evaluation, counterexamples and fit', () => {
  const g = grids.hundred, all = W.applyTool(g, new Set(), 'mult', 9);
  assert.equal(W.evalRule({ s: 'mult:9', c: 'ds:9' }, g, all).counter, 99, 'digit sum 9 breaks at 99');
  assert.equal(W.evalRule({ s: 'prime', c: 'odd' }, g, new Set()).counter, 2);
  assert.equal(W.evalRule({ s: 'even', c: 'twoprimes' }, g, new Set()).counter, 2);
  const gb = W.evalRule({ s: 'even2', c: 'twoprimes' }, g, new Set(), 1000); assert.ok(gb.ok); assert.equal(gb.tested, 499);
  assert.equal(W.evalRule({ s: 'odd', c: 'prime' }, g, new Set()).counter, 1);
  const r = W.evalRule({ s: 'square', c: 'oddsum' }, g, all); assert.ok(r.ok); assert.ok(!r.fits, 'true but about other numbers');
  assert.equal(W.evalRule({ s: 'mult:9', c: 'step:9' }, g, all).reason, 'list-needs-painted');
  assert.ok(W.evalRule({ s: 'painted', c: 'step:9' }, g, new Set([8, 17, 26, 35])).ok);
  assert.ok(!W.evalRule({ s: 'painted', c: 'step:9' }, g, new Set([8, 17, 27])).ok);
  for (const [n, want] of [[8, true], [27, true], [12, true], [2, false], [6, false]]) assert.equal(W.oddRun(n), want, `oddRun ${n}`);
  assert.equal(W.ruleText({ s: 'mult:9', c: 'dr:9' }), 'Every multiple of 9 has digital root 9 (add the digits until one is left).');
  assert.equal(W.ruleText({ s: 'painted', c: 'prime' }), 'The painted numbers are all prime.');
  /* every number claim has both wordings, every list claim a plural one */
  for (const [id, c] of Object.entries(W.CLAIMS)) assert.ok(c.many && (c.list || (c.one && c.f)), id);
});

test('calendar boxes: 2 by 2 diagonals agree and 3 by 3 sums are nine times the middle', () => {
  const g = grids.calendar;
  for (const v of W.variantsOf(W.patternById('c-box2'), g)) assert.ok(W.evalRule({ s: 'painted', c: 'cross' }, g, v.set).ok);
  for (const v of W.variantsOf(W.patternById('c-box3'), g)) assert.ok(W.evalRule({ s: 'painted', c: 'box9' }, g, v.set).ok);
});

test('names only use the fixed word lists', () => {
  const r = rng(7);
  for (let i = 0; i < 500; i++) {
    const n = W.suggestName(r, i % W.NICKS.length), s = W.nameOf(n);
    const m = s.match(/^(.+)'s (\S+) (\S+)$/);
    assert.ok(m, s); assert.ok(W.NICKS.includes(m[1]) && W.ADJ.includes(m[2]) && W.NOUN.includes(m[3]), s);
  }
  assert.equal(W.nameOf([0, 0, 0]), "Meera's Sparkling Staircase");
  assert.equal(W.nameOf([999, -5, 999]), "Meera's Sparkling Staircase", 'out of range falls back to the lists');
});

test('cards round trip through a share link and reject junk', () => {
  const g = grids.hundred, set = W.applyTool(g, new Set(), 'mult', 9);
  const card = { p: 'h-mult9', k: '', g: 'hundred', gp: null, cells: [...set].sort((a, b) => a - b), name: [3, 4, 5], rule: { s: 'mult:9', c: 'dr:9' }, test: null };
  const back = W.decodeCard(b64url.dec(b64url.enc(W.encodeCard(card))));
  assert.deepEqual(back, card);
  const conj = { p: null, k: '', g: 'calendar', gp: { y: 2026, m: 10 }, cells: [0, 7, 14], name: [1, 2, 3], rule: { s: 'prime', c: 'odd' }, test: { ok: false, counter: 2, tested: 1 } };
  assert.deepEqual(W.decodeCard(b64url.dec(b64url.enc(W.encodeCard(conj)))), conj);
  const evil = W.decodeCard(JSON.stringify({ v: 1, g: 'hundred', x: '1.2.999.-4.x', n: [500, 1, 1], r: ['<script>', 'nope'] }));
  assert.deepEqual(evil.cells, [1, 2]); assert.equal(evil.name[0], W.NICKS.length - 1); assert.equal(evil.rule.s, 'painted');
  assert.throws(() => W.decodeCard(JSON.stringify({ v: 2, g: 'hundred' })));
  assert.throws(() => W.decodeCard(JSON.stringify({ v: 1, g: 'mars', n: [0, 0, 0] })));
});
