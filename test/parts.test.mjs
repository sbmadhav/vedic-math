/* The parts of a Trick's answer (openspec working-memory-scaffolds, split-answer spec): the left and right part the
   Trick writes side by side, after any carry or borrow, so the two joined are the whole answer. Run: pnpm test */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { TRICKS, problemFor } from '../js/vedic.js';
import { KATAS_PER_TRICK, kata } from '../js/levels.js';

const SPLIT = ['sq5', 'near-base', 'square-near', 'by9s', 'ends10'];
const trick = id => TRICKS.find(t => t.id === id);
const valid = t => { let v; do { v = t.random(); } while (t.valid(v)); return v; };

test('exactly the five Tricks written as a left part and a right part have parts', () => {
  assert.deepEqual(TRICKS.filter(t => t.parts).map(t => t.id).sort(), [...SPLIT].sort());
});

test('the parts join to the answer for 2,000 random questions of each Trick', () => {
  for (const id of SPLIT) {
    const t = trick(id);
    for (let i = 0; i < 2000; i++) {
      const v = valid(t), [l, r] = t.parts(v);
      assert.equal(l + r, String(t.answer(v)), `${id} ${v}`);
      assert.ok(l.length > 0 && r.length > 0, `${id} ${v}: both parts have digits`);
    }
  }
});

test('every Kata of the five Tricks carries parts that join to its answer', () => {
  for (const id of SPLIT) for (let n = 1; n <= KATAS_PER_TRICK; n++) for (const p of kata(id, n).problems) {
    assert.ok(p.parts, `${id} kata ${n}`);
    assert.equal(p.parts.join(''), String(p.answer), `${id} kata ${n}: ${p.vals}`);
  }
});

test('the parts after a carry and after a borrow', () => {
  assert.deepEqual(trick('near-base').parts([112, 112]), ['125', '44']); /* 124 | 144: carry 1 */
  assert.deepEqual(trick('near-base').parts([98, 97]), ['95', '06']);
  assert.deepEqual(trick('near-base').parts([103, 97]), ['99', '91']); /* 100 | -9: borrow 1 */
  assert.deepEqual(trick('square-near').parts([1012]), ['1024', '144']);
  assert.deepEqual(trick('square-near').parts([88]), ['77', '44']); /* 76 | 144: carry 1 */
  assert.deepEqual(trick('sq5').parts([85]), ['72', '25']);
  assert.deepEqual(trick('by9s').parts([42, 999]), ['41', '958']);
  assert.deepEqual(trick('ends10').parts([51, 59]), ['30', '09']);
});

test('problemFor passes parts on only for those Tricks', () => {
  for (const t of TRICKS) {
    const p = problemFor(t, valid(t));
    assert.equal(!!p.parts, SPLIT.includes(t.id), t.id);
  }
});
