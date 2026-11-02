/* Placement (openspec placement, tasks 1.1 to 1.4): the climb's state machine, the pool each Step draws from, Explorer's
   three choices, and what a Placement level sets (LEVEL_START, skillStart, beltFor, raiseOnly). The Mode starts are
   checked against js/fx.js MODES in test/placement.test.mjs (fx.js is a Legacy module). Run: pnpm test */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as P from './placement.ts';
import { byId } from './skills/index.ts';
import { BELTS, TRICKS } from './vedic.ts';
import type { Question } from './question.ts';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const START = { explorer: 1, challenger: 5, pro: 9 }; // js/adapt.js START
const grade = (st: P.Climb): string => String(P.STEPS[st.step]);
const gradeOfSkill = (id: string): string => String(byId[id]?.grade);
const current = (st: P.Climb): P.Drawn => { assert.ok(st.current, 'a question is on screen'); return st.current; };
/* A climb answered by a script: fn(i) says whether answer i is right */
const climb = (mode: string, fn: (i: number) => boolean, seed: string | number = 3): P.Climb => { let st = P.placementStart({ mode, rand: P.rng(seed) }); for (let i = 0; !st.done; i++) st = P.placementAnswer(st, fn(i)); return st; };
const otherThan = (step: P.Grade, id: string): string => P.PLACEMENT_POOL[String(step)]?.find(x => x !== id) as string;

/* ---------- 1.1 The climb ---------- */
test('STEPS are the 13 grades K to 12, and each Mode starts at its first grade: Explorer K, Challenger 3, Pro 8', () => {
  assert.deepEqual(P.STEPS.map(String), ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  assert.equal(P.startStep('explorer'), 'K'); assert.equal(P.startStep('challenger'), 3); assert.equal(P.startStep('pro'), 8); assert.equal(P.startStep('nowhere'), 3);
  for (const [m, g] of [['explorer', 'K'], ['challenger', '3'], ['pro', '8']] as const) { const st = P.placementStart({ mode: m, rand: P.rng(1) }); assert.equal(grade(st), g); assert.equal(String(current(st).grade), g); assert.equal(gradeOfSkill(current(st).skill), g); }
});

test('a right answer climbs one Step and the question comes from that grade; a miss stays, and the next Skill differs', () => {
  for (const seed of SEEDS.slice(0, 40)) {
    let st = P.placementStart({ mode: 'explorer', rand: P.rng(seed) });
    assert.equal(grade(st), 'K');
    st = P.placementAnswer(st, true); assert.equal(grade(st), '1'); assert.equal(st.rights, 1); assert.equal(gradeOfSkill(current(st).skill), '1');
    const missed = current(st).skill;
    st = P.placementAnswer(st, false); assert.equal(grade(st), '1'); assert.equal(st.misses, 1); assert.notEqual(current(st).skill, missed, 'a different Skill after a miss'); assert.equal(gradeOfSkill(current(st).skill), '1');
    st = P.placementAnswer(st, true); assert.equal(grade(st), '2'); assert.equal(st.misses, 0, 'a right answer clears the misses at the new Step');
  }
});

test('the second miss at a Step ends the climb; the result is the highest Step answered right', () => {
  const st = climb('pro', i => i < 2); // grades 8 and 9 right, two misses at 10
  assert.equal(st.done, true); assert.equal(st.answered, 4); assert.equal(st.current, null);
  assert.deepEqual(P.placementResult(st), { grade: '9', steps: 2 });
  const ch = climb('challenger', i => i < 3); // 3, 4, 5 right, two misses at 6
  assert.deepEqual(P.placementResult(ch), { grade: '5', steps: 3 });
});

test('12 questions end the climb, whatever the misses', () => {
  const st = climb('explorer', i => i % 2 === 0); // right, miss, right, miss: never two misses at one Step
  assert.equal(st.done, true); assert.equal(st.answered, 12);
  assert.deepEqual(P.placementResult(st), { grade: '5', steps: 6 });
  assert.equal(P.placementAnswer(st, true), st, 'a finished climb takes no more answers');
});

test('a right answer at grade 12 ends the climb; a Challenger with 9 rights is asked grade 12 tenth', () => {
  let st = P.placementStart({ mode: 'challenger', rand: P.rng(9) });
  for (let i = 0; i < 9; i++) st = P.placementAnswer(st, true);
  assert.equal(grade(st), '12'); assert.equal(st.done, false); assert.equal(gradeOfSkill(current(st).skill), '12');
  st = P.placementAnswer(st, true);
  assert.equal(st.done, true); assert.deepEqual(P.placementResult(st), { grade: '12', steps: 10 });
  const pro = climb('pro', () => true); // 8 to 12 right: 5 questions
  assert.equal(pro.answered, 5); assert.deepEqual(P.placementResult(pro), { grade: '12', steps: 5 });
});

test('nothing right: the Step below the start (Challenger 2, Pro 7), and K for a climb that started at K', () => {
  assert.deepEqual(P.placementResult(climb('challenger', () => false)), { grade: '2', steps: 0 });
  assert.deepEqual(P.placementResult(climb('pro', () => false)), { grade: '7', steps: 0 });
  assert.deepEqual(P.placementResult(climb('explorer', () => false)), { grade: 'K', steps: 0 });
  assert.equal(climb('pro', () => false).answered, 2);
});

test('steps equal the right answers, and placementAnswer returns a new state leaving its input unchanged', () => {
  const st = P.placementStart({ mode: 'challenger', rand: P.rng(5) }), snap = JSON.stringify({ ...st, rand: null, current: current(st).skill });
  const next = P.placementAnswer(st, true);
  assert.notEqual(next, st); assert.equal(JSON.stringify({ ...st, rand: null, current: current(st).skill }), snap);
  assert.equal(next.rights, 1); assert.equal(P.stepNumber(st), 1); assert.equal(P.stepNumber(next), 2);
  for (const seed of SEEDS.slice(0, 20)) { let rights = 0; const end = climb('explorer', i => { const ok = (i * seed) % 3 !== 0; if (ok) rights++; return ok; }, seed); assert.equal(P.placementResult(end).steps, rights); }
});

/* ---------- 1.2 The pool ---------- */
test('every Step has at least 2 school Skills of that grade, none a Trick, and each exists', () => {
  for (const s of P.STEPS) {
    const ids = P.PLACEMENT_POOL[String(s)];
    assert.ok(Array.isArray(ids) && ids.length >= 2, `Step ${s}`);
    for (const id of ids) { const sk = byId[id]; assert.ok(sk, id); assert.equal(String(sk.grade), String(s), id); assert.ok(!sk.trick && sk.grade !== 'V', `${id} is a Trick`); }
  }
  assert.deepEqual(Object.keys(P.PLACEMENT_POOL).sort(), P.STEPS.map(String).sort());
});

test('for 200 seeds every pool Skill\'s level-2 question (after the redraw) has a whole-number answer that is not negative, or is a choice question with its answer among 3 or more choices', () => {
  for (const s of P.STEPS) for (const id of P.PLACEMENT_POOL[String(s)] as string[]) for (const seed of SEEDS) {
    const q = P.drawQuestion(s, { rand: P.rng(`${id}:${seed}`), avoid: otherThan(s, id) });
    assert.ok(P.usable(q.p), `${id} seed ${seed}: ${q.p.kind} ${JSON.stringify(q.p.answer)}`);
    assert.equal(String(q.grade), String(s));
  }
  // and each Skill of the pool is reachable: over 60 seeds every id comes up
  for (const s of P.STEPS) {
    const seen = new Set<string>(); for (const seed of SEEDS.slice(0, 60)) seen.add(P.drawQuestion(s, { rand: P.rng(seed) }).skill);
    assert.deepEqual([...seen].sort(), (P.PLACEMENT_POOL[String(s)] as string[]).slice().sort(), `Step ${s}`);
  }
});

test('a miss never asks the same Skill twice in a row at a Step', () => {
  for (const s of P.STEPS) for (const id of P.PLACEMENT_POOL[String(s)] as string[]) for (const seed of SEEDS.slice(0, 30)) assert.notEqual(P.drawQuestion(s, { avoid: id, rand: P.rng(seed) }).skill, id);
});

/* ---------- 1.3 Three choices ---------- */
test('threeChoices: 3 distinct values with exactly one equal to the answer; numbers never negative and ascending; a choice question keeps the others\' order', () => {
  for (const s of P.STEPS) for (const id of P.PLACEMENT_POOL[String(s)] as string[]) for (const seed of SEEDS) {
    const rand = P.rng(`c:${id}:${seed}`), { p } = P.drawQuestion(s, { rand, avoid: otherThan(s, id) });
    const c = P.threeChoices(p, rand);
    assert.equal(c.length, 3, id); assert.equal(new Set(c).size, 3, `${id}: ${c.join()}`);
    assert.equal(c.filter(v => v === String(p.answer)).length, 1, `${id}: ${c.join()} has the answer ${String(p.answer)} once`);
    if (p.kind === 'num') {
      const n = c.map(Number); assert.ok(n.every(v => Number.isInteger(v) && v >= 0), `${id}: ${c.join()}`);
      assert.deepEqual(n, n.slice().sort((a, b) => a - b), `${id}: ascending ${c.join()}`);
    } else {
      assert.ok(P.isChoiceQ(p) && p.choices.length >= 3);
      const others = c.filter(v => v !== String(p.answer)), order = (p.choices as (string | number)[]).map(String).filter(v => others.includes(v));
      assert.deepEqual(others, order, `${id}: the 2 others keep their order`);
    }
    const q = P.asChoice(p, rand); assert.equal(q.kind, 'choice'); assert.equal(q.choices.length, 3); assert.ok(q.choices.map(String).includes(String(q.answer)));
  }
  const zero: Question = { q: '0', kind: 'num', answer: 0 };
  assert.deepEqual(P.threeChoices(zero, () => 0).map(Number).sort((a, b) => a - b)[0], 0);
});

/* ---------- 1.4 What the level sets ---------- */
test('LEVEL_START[the Mode\'s first grade] is that Mode\'s START, and skillStart is 10, 5, 1 below, at and above the level', () => {
  for (const m of ['explorer', 'challenger', 'pro'] as const) assert.equal(P.LEVEL_START[String(P.START_STEP[m])], START[m], m);
  assert.deepEqual(P.LEVEL_START, { K: 1, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 8, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 13 });
  assert.equal(P.skillStart(4, 6), 10); assert.equal(P.skillStart(6, 6), 5); assert.equal(P.skillStart(7, 6), 1);
  assert.equal(P.skillStart('K', 'K'), 5); assert.equal(P.skillStart('K', 1), 10); assert.equal(P.skillStart(12, 'K'), 1);
  assert.equal(P.skillGrade('v-sq5'), 4, 'a Trick\'s grade is the Trick\'s'); assert.equal(P.skillGrade('3-mult'), 3); assert.equal(P.skillGrade('no-such'), null);
});

test('beltFor follows BELTS and the Trick grades: K to 3 white, 4 and 5 yellow, 6 orange, 7 blue, 8 purple, 9 to 12 black', () => {
  const want: Record<string, string> = { K: 'white', 1: 'white', 2: 'white', 3: 'white', 4: 'yellow', 5: 'yellow', 6: 'orange', 7: 'blue', 8: 'purple', 9: 'black', 10: 'black', 11: 'black', 12: 'black' };
  for (const [g, b] of Object.entries(want)) assert.equal(P.beltFor(g), b, `grade ${g}`);
  // computed, not typed: the first Belt in order with a Trick at or above the grade
  const gradeOf = (id: string): number => TRICKS.find(t => t.id === id)?.grade ?? 0;
  for (const g of P.STEPS) { const L = P.gradeNum(g); const b = BELTS.find(b => b.tricks.some(t => gradeOf(t) >= L)) ?? BELTS[BELTS.length - 1]; assert.equal(P.beltFor(g), b?.id); }
  assert.equal(P.forwardBelt('white', 'orange'), 'orange'); assert.equal(P.forwardBelt('orange', 'white'), 'orange'); assert.equal(P.forwardBelt(undefined, 'yellow'), 'yellow'); assert.equal(P.forwardBelt('blue', 'blue'), 'blue');
  assert.deepEqual(P.suggestedGrades('K').map(String), ['K', '1']); assert.deepEqual(P.suggestedGrades(6).map(String), ['5', '6', '7']); assert.deepEqual(P.suggestedGrades('12').map(String), ['11', '12']); assert.deepEqual(P.suggestedGrades('V'), []);
});

test('raiseOnly raises only lower Ratings, never lowers, and leaves everything else deep-equal', () => {
  const rec = { v: 3, sparks: 120, skills: { '3-mult': { n: 9, c: 8, m: .9, streak: 3, last: 1 } }, medals: { 'g:times-sprint:1': 2 }, belts: { white: 1 }, sky: { lit: { 'from9:1': 1 }, skipped: {}, last: {} },
    ratings: { 'game:times-sprint': 12, 'game:make-ten': 2, 'arena:challenger': 4, 'skill:3-mult': 3, 'skill:4-mult2': 12, 'skill:9-seq': 3, 'skill:v-sq5': 2, 'skill:v-sqroot': 1 } };
  const snap = JSON.stringify(rec);
  const out = P.raiseOnly(rec, 5); // LEVEL_START[5] is 7
  assert.equal(JSON.stringify(rec), snap, 'the input is untouched');
  assert.deepEqual(out.ratings, { 'game:times-sprint': 12, 'game:make-ten': 7, 'arena:challenger': 7, 'skill:3-mult': 10, 'skill:4-mult2': 12, 'skill:9-seq': 3, 'skill:v-sq5': 10, 'skill:v-sqroot': 1 });
  for (const f of ['medals', 'sky', 'belts', 'skills', 'sparks'] as const) assert.deepEqual(out[f], rec[f], f);
  assert.equal(P.raiseOnly(out, 5), out, 'nothing to raise: the same record back');
  assert.equal(P.raiseOnly({ v: 3 } as { v: number; ratings?: Record<string, number> }, 9).ratings, undefined);
  // a Skill at the level starts at 5; a Trick's grade is the Trick's, not V
  assert.equal(P.raiseOnly({ ratings: { 'skill:5-order': 2, 'skill:v-ends10': 1 } }, 5).ratings['skill:5-order'], 5);
  assert.equal(P.raiseOnly({ ratings: { 'skill:v-ends10': 1 } }, 5).ratings['skill:v-ends10'], 5);
});
