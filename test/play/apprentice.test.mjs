/* Teach the Apprentice: every template in the mistake bank, for thousands of seeds, gives correct clean work
   that reaches the true answer, and slipped work with exactly one wrong step whose result really differs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from '../../js/play/kit.js';
import { BANK, makeRound, same, N, F, R, beltOf, BELTS, PER_BELT } from '../../js/play/exp/apprentice-core.js';

const LEVELS = ['explorer', 'challenger', 'pro'];
const last = steps => steps[steps.length - 1].wrote;

test('at least 40 templates across all three levels, unique ids, a coaching fix each', () => {
  assert.ok(BANK.length >= 40, `${BANK.length} templates`);
  assert.equal(new Set(BANK.map(t => t.id)).size, BANK.length);
  for (const lv of LEVELS) assert.ok(BANK.filter(t => t.lv === lv).length >= 10, lv);
  for (const t of BANK) { assert.ok(t.fix.length > 10 && t.topic, t.id); assert.ok(!t.fix.includes('—'), t.id); }
  assert.equal(new Set(BANK.map(t => t.fix)).size, BANK.length, 'fixes are distinct so tips never repeat');
});

test('clean work: every step is right and the last step is the true answer (thousands of seeds)', () => {
  for (const t of BANK) for (let i = 0; i < 300; i++) {
    const w = t.gen(rng(`${t.id}:${i}`), false);
    assert.ok(w.q && w.steps.length >= 2, t.id);
    w.steps.forEach((s, k) => assert.ok(same(s.honest, s.wrote), `${t.id} seed ${i} step ${k}: ${s.t}`));
    assert.ok(same(last(w.steps), w.answer), `${t.id} seed ${i}: ${last(w.steps)} vs ${w.answer}`);
  }
});

test('slipped work: exactly one wrong step, later steps follow honestly, and the result is really wrong', () => {
  for (const t of BANK) for (let i = 0; i < 300; i++) {
    const seed = `${t.id}:${i}`, right = t.gen(rng(seed), false), slip = t.gen(rng(seed), true);
    assert.equal(slip.q, right.q, `${t.id}: same problem`);
    assert.equal(slip.steps.length, right.steps.length, t.id);
    const bad = slip.steps.map((s, k) => (same(s.honest, s.wrote) ? -1 : k)).filter(k => k >= 0);
    assert.equal(bad.length, 1, `${t.id} seed ${i}: wrong steps ${bad}`);
    assert.ok(!same(slip.steps[bad[0]].wrote, right.steps[bad[0]].wrote), `${t.id}: the mistake differs from the right step`);
    assert.ok(!same(last(slip.steps), right.answer), `${t.id} seed ${i}: slipped answer equals the right one`);
    for (let k = 0; k < bad[0]; k++) assert.equal(slip.steps[k].t, right.steps[k].t, `${t.id}: steps before the mistake are identical`);
  }
});

test('step text shows the value the apprentice wrote', () => {
  for (const t of BANK) for (let i = 0; i < 60; i++) for (const slip of [false, true]) {
    for (const s of t.gen(rng(`txt:${t.id}:${i}`), slip).steps) {
      if (s.noCheck || typeof s.wrote !== 'number') continue;
      assert.ok(s.t.includes(N(s.wrote)), `${t.id}: "${s.t}" should show ${N(s.wrote)}`);
      assert.ok(!s.t.includes('NaN') && !s.t.includes('undefined'), s.t);
    }
  }
});

test('rounds: wrong step located, tips include the fix and two different ones, clean rounds exist', () => {
  for (const lv of LEVELS) {
    const r = rng('rounds:' + lv); let clean = 0;
    for (let i = 0; i < 400; i++) {
      const rd = makeRound(r, lv);
      assert.equal(rd.tpl.lv, lv);
      assert.equal(rd.tips.length, 3); assert.ok(rd.tips.includes(rd.fix)); assert.equal(new Set(rd.tips).size, 3);
      if (rd.wrongAt < 0) { clean++; rd.steps.forEach(s => assert.ok(same(s.honest, s.wrote))); }
      else assert.ok(!same(rd.steps[rd.wrongAt].honest, rd.steps[rd.wrongAt].wrote));
    }
    assert.ok(clean > 40 && clean < 200, `${lv} clean rounds ${clean}`);
  }
  const r = rng('avoid'); const ids = new Set();
  for (let i = 0; i < 5; i++) ids.add(makeRound(r, 'pro', { avoid: [...ids] }).tpl.id);
  assert.equal(ids.size, 5, 'avoid list prevents repeats');
});

test('formatting and belts', () => {
  assert.equal(N(-5), '−5'); assert.equal(N(0.1 + 0.2), '0.3'); assert.equal(F(6, 8), '3/4'); assert.equal(F(4, 2), '2'); assert.equal(R(1 / 3 * 3), 1);
  assert.equal(beltOf(0).id, 'white'); assert.equal(beltOf(PER_BELT).id, 'yellow');
  assert.equal(beltOf(999).id, 'black'); assert.equal(BELTS.length, 7);
});

test('singular place values read "1 ten" and "1 one", never "1 tens" or "1 ones"', () => {
  for (const t of BANK) for (let i = 0; i < 300; i++) for (const slip of [false, true]) {
    const w = t.gen(rng(`${t.id}:${i}`), slip);
    for (const text of [w.q, ...w.steps.map(s => s.t)]) assert.ok(!/(^|[^\d.])1 (tens|ones|hundreds)\b/.test(text), `${t.id} seed ${i}: ${text}`);
  }
});
