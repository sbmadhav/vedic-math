/* Sutra Spellbook: every spell's generator, board and judge produce correct math for thousands of seeds,
   stroke recognition is forgiving but exact, and wrong strokes fizzle with what they computed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../../js/play/kit.js';
import {
  SPELLS, ORDER, spellById, fitting, assemble, pathNodes, pathEdges, newCast, applyEdge, visibleNodes, partsDone,
  castDone, solution, fizzleText, nextTier, ek, baseNear, nearPair, answerOf, show
} from '../../js/play/exp/spells-core.js';

const LEVELS = ['explorer', 'challenger', 'pro'];

test('at least six spells, each with a sutra name and meaning, taught in every level order', () => {
  assert.ok(SPELLS.length >= 6);
  for (const s of SPELLS) { assert.ok(s.sutra && s.meaning && s.title && s.why && s.needs, s.id); assert.ok(!/—/.test(JSON.stringify(s))); }
  for (const lv of LEVELS) assert.deepEqual([...ORDER[lv]].sort(), SPELLS.map(s => s.id).sort(), lv);
});

test('generators fit their own spell and a perfect cast assembles the true product (thousands of seeds)', () => {
  for (const s of SPELLS) for (const lv of LEVELS) for (let tier = 0; tier <= 3; tier++) {
    const r = rng(`${s.id}:${lv}:${tier}`);
    for (let i = 0; i < 400; i++) {
      const p = s.gen(r, tier, lv);
      assert.ok(s.fits(p), `${s.id} ${lv} t${tier}: ${show(p)} should fit`);
      const board = s.board(p), cast = newCast(board);
      for (const { edges } of solution(board)) for (const e of edges) assert.equal(applyEdge(board, cast, e).kind, 'ok', `${s.id} ${show(p)} ${e}`);
      assert.ok(castDone(cast));
      const out = assemble(board.parts, partsDone(board, cast));
      assert.ok(out.complete);
      assert.equal(out.value, answerOf(p), `${s.id} ${show(p)} parts`);
      assert.equal(Number(out.cells.map(c => c.text).reverse().join('')), answerOf(p), `${s.id} ${show(p)} digits`);
      for (const c of out.cells.slice(0, -1)) assert.ok(/^\d+$/.test(c.text), `${s.id} ${show(p)} cell ${c.text}`);
    }
  }
});

test('explorer problems stay gentle: small numbers, times 11 without carries at first', () => {
  const r = rng('gentle');
  for (let i = 0; i < 500; i++) {
    const p = spellById('by11').gen(r, 0, 'explorer'); const n = p.a;
    assert.ok(Math.floor(n / 10) + (n % 10) <= 9, `${n} carries`);
    const q = spellById('nikhilam').gen(r, 0, 'explorer'); assert.ok(q.a < 10 && q.b < 10);
  }
});

test('assembly shows carries flowing left and holds raw values until lower parts are done', () => {
  /* 47 x 11: 7 | 4+7=11 | 4 -> 517 */
  const parts = [{ v: 7, w: 1 }, { v: 11, w: 1 }, { v: 4, w: Infinity }];
  const all = assemble(parts);
  assert.deepEqual(all.cells.map(c => c.text), ['7', '1', '5']);
  assert.equal(all.cells[1].carryOut, 1);
  const partial = assemble(parts, [false, true, true]);
  assert.equal(partial.cells[0].state, 'empty');
  assert.equal(partial.cells[1].state, 'raw');
  assert.equal(partial.cells[1].text, '11');
  /* 88 squared: 76 | 144 -> 7744 */
  assert.equal(assemble([{ v: 144, w: 2 }, { v: 76, w: Infinity }]).value, 7744);
});

test('stroke recognition: forgiving radius, fills in fast flicks, ignores hidden nodes', () => {
  const nodes = [{ id: 'a', label: '4', x: 0, y: 0 }, { id: 'b', label: '7', x: 100, y: 0 }, { id: 'c', label: '2', x: 200, y: 0 }, { id: 'h', label: '9', x: 100, y: 100, hidden: true }];
  assert.deepEqual(pathNodes([[3, 20], [97, -25]], nodes), ['a', 'b']);
  assert.deepEqual(pathNodes([[0, 0], [200, 0]], nodes), ['a', 'b', 'c'], 'a flick across touches the middle node');
  assert.deepEqual(pathNodes([[0, 60], [200, 60]], nodes), [], 'too far away');
  assert.deepEqual(pathNodes([[100, 100], [100, 0]], nodes), ['b'], 'hidden nodes are not hit');
  assert.deepEqual(pathNodes([[0, 0], [5, 3], [0, 1], [100, 0], [96, 4]], nodes), ['a', 'b'], 'jitter on a node counts once');
  assert.deepEqual(pathEdges(['a', 'b', 'c']), [ek('a', 'b'), ek('b', 'c')]);
  assert.equal(ek('b0', 'a1'), ek('a1', 'b0'));
});

test('stroke recognition on a real crosswise board: diagonals do not clip other digits', () => {
  const b = spellById('crosswise').board({ a: 43, b: 27 });
  assert.deepEqual(pathNodes([[110, 62], [210, 178]], b.nodes), ['a1', 'b0']);
  assert.deepEqual(pathNodes([[210, 62], [110, 178]], b.nodes), ['a0', 'b1']);
  assert.deepEqual(pathNodes([[210, 50], [212, 190]], b.nodes), ['a0', 'b0']);
  const n = spellById('nikhilam').board({ a: 97, b: 94 });
  assert.deepEqual(pathNodes([[70, 54], [70, 186]], n.nodes), ['a', 'B', 'b'], 'one swipe down through the base');
});

test('crosswise judge: order matters, diagonals in either order and direction, wrong strokes fizzle with their value', () => {
  const s = spellById('crosswise'), p = { a: 43, b: 27 }, b = s.board(p), c = newCast(b);
  const early = applyEdge(b, c, ek('a1', 'b1'));
  assert.equal(early.kind, 'early');
  assert.match(fizzleText(b, c, early).hint, /comes after/);
  const stray = applyEdge(b, c, ek('a1', 'a0'));
  assert.equal(stray.kind, 'stray');
  assert.equal(fizzleText(b, c, stray).calc, '3 × 4 = 12');
  assert.equal(applyEdge(b, c, ek('b0', 'a0')).complete, true);
  assert.equal(applyEdge(b, c, ek('b0', 'a0')).kind, 'dup');
  const d1 = applyEdge(b, c, ek('b1', 'a0'));
  assert.deepEqual([d1.kind, d1.complete], ['ok', false]);
  assert.equal(applyEdge(b, c, ek('a1', 'b0')).complete, true);
  assert.equal(applyEdge(b, c, ek('a1', 'b1')).complete, true);
  assert.ok(castDone(c));
  assert.equal(assemble(b.parts, partsDone(b, c)).value, 43 * 27);
});

test('fives squared: the cross fizzles and explains the one more; the twin morphs', () => {
  const b = spellById('sq5').board({ a: 65, b: 65 }), c = newCast(b);
  const f = applyEdge(b, c, ek('a1', 'b0'));
  assert.equal(f.kind, 'stray');
  const t = fizzleText(b, c, f);
  assert.equal(t.calc, '6 × 5 + 5 × 6 = 60');
  /* the cross is in the tens column: 60 tens is 6 hundreds, the extra 6 that turns 6 x 6 into 6 x 7 */
  assert.match(t.hint, /60 tens, which is 6 more hundreds/);
  assert.match(t.hint, /6 × 6 into 6 × 7/);
  assert.doesNotMatch(t.hint, /more tens/);
  assert.equal(visibleNodes(b, c).find(n => n.id === 'b1').label, '6');
  applyEdge(b, c, ek('a1', 'b1'));
  assert.equal(visibleNodes(b, c).find(n => n.id === 'b1').label, '7');
  assert.deepEqual(assemble(b.parts, partsDone(b, c)).cells.map(x => x.state), ['empty', 'raw']);
  applyEdge(b, c, ek('a0', 'b0'));
  assert.equal(assemble(b.parts, partsDone(b, c)).value, 4225);
});

test('near base: gaps appear only after visiting the base, either cross works', () => {
  const b = spellById('nikhilam').board({ a: 97, b: 94 });
  for (const cross of [ek('a', 'db'), ek('b', 'da')]) {
    const c = newCast(b);
    assert.ok(visibleNodes(b, c).filter(n => n.hidden).length === 2);
    pathEdges(['a', 'B', 'b']).forEach(e => assert.equal(applyEdge(b, c, e).kind, 'ok'));
    assert.ok(visibleNodes(b, c).every(n => !n.hidden));
    assert.equal(visibleNodes(b, c).find(n => n.id === 'db').label, '−6');
    assert.equal(applyEdge(b, c, cross).kind, 'ok');
    assert.equal(applyEdge(b, c, ek('da', 'db')).kind, 'ok');
    assert.equal(assemble(b.parts, partsDone(b, c)).value, 9118);
  }
  const own = applyEdge(b, newCast(b), ek('a', 'b'));
  assert.equal(own.kind, 'stray');
  assert.equal(baseNear(97), 100); assert.equal(baseNear(8), 10); assert.equal(baseNear(40), 0);
  assert.equal(nearPair(97, 104), 0, 'mixed sides are not cast');
  assert.equal(nearPair(104, 107), 100);
});

test('times 11 on three digits: neighbor sums in any order, one long swipe does both', () => {
  const b = spellById('by11').board({ a: 386, b: 11 }), c = newCast(b);
  pathEdges(pathNodes([[70, 120], [250, 120]], b.nodes)).forEach(e => assert.equal(applyEdge(b, c, e).kind, 'ok'));
  assert.ok(castDone(c));
  assert.equal(assemble(b.parts, partsDone(b, c)).value, 386 * 11);
  assert.equal(applyEdge(b, newCast(b), ek('d0', 'd2')).kind, 'stray');
});

test('right spell for the right monster: fits is exact math', () => {
  assert.deepEqual(fitting({ a: 65, b: 65 }).sort(), ['crosswise', 'ends10', 'sq5', 'yavad'].sort());
  assert.deepEqual(fitting({ a: 97, b: 94 }).sort(), ['crosswise', 'nikhilam'].sort());
  assert.deepEqual(fitting({ a: 47, b: 99 }).sort(), ['by9s', 'crosswise', 'nikhilam'].filter(id => spellById(id).fits({ a: 47, b: 99 })).sort());
  assert.ok(!spellById('by9s').fits({ a: 7, b: 99 }), 'digits must match the nines');
  assert.ok(spellById('by11').fits({ a: 47, b: 11 }));
  assert.ok(!spellById('sq5').fits({ a: 64, b: 64 }));
  assert.ok(spellById('yavad').fits({ a: 96, b: 96 }));
  assert.ok(!spellById('yavad').fits({ a: 50, b: 50 }));
});

test('difficulty adapts: up after a clean streak, down after misses, within 0..3', () => {
  assert.deepEqual(nextTier(0, 3, 0), { tier: 1, streak: 0, misses: 0 });
  assert.deepEqual(nextTier(3, 3, 0).tier, 3);
  assert.deepEqual(nextTier(2, 0, 2).tier, 1);
  assert.deepEqual(nextTier(0, 0, 2).tier, 0);
  assert.deepEqual(nextTier(1, 1, 1), { tier: 1, streak: 1, misses: 1 });
});

test('the cross hint is true place value for every fives square and ten buddies pair', () => {
  for (const [id, pairs] of [['sq5', [15, 25, 45, 95, 115].map(n => [n, n])], ['ends10', [[23, 27], [41, 49], [86, 84]]]]) {
    for (const [a, b] of pairs) {
      const bd = spellById(id).board({ a, b }), t = Math.floor(a / 10), u1 = a % 10, u2 = b % 10;
      const h = fizzleText(bd, newCast(bd), applyEdge(bd, newCast(bd), ek('a1', 'b0'))).hint;
      const [, tens, hundreds] = h.match(/makes (\d+) tens, which is (\d+) more hundreds/);
      assert.equal(+tens * 10, (t * u2 + u1 * t) * 10, `${a} x ${b}`);
      assert.equal(+hundreds * 100, +tens * 10, `${a} x ${b}`);
      /* t x t hundreds plus the carry is t x (t + 1) hundreds: the left part of the answer */
      assert.equal((t * t + +hundreds) * 100 + u1 * u2, a * b, `${a} x ${b}`);
    }
  }
});
