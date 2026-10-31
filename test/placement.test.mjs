/* Placement (openspec placement, tasks 1.1 to 1.4): the climb's state machine, the pool each Step draws from, Explorer's
   three choices, and what a Placement level sets (LEVEL_START, skillStart, beltFor, raiseOnly). Run: pnpm test */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
globalThis.matchMedia ??= () => ({ matches: false });
const mem = {};
globalThis.localStorage ??= { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i] ?? null, get length() { return Object.keys(mem).length; } };
const P = await import('../js/placement.js');
const { MODES } = await import('../js/fx.js');
const { START } = await import('../js/adapt.js');
const { byId } = await import('../js/skills/index.js');
const { BELTS, TRICKS } = await import('../js/vedic.js');

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const grade = st => String(P.STEPS[st.step]);
/* A climb answered by a script: fn(i) says whether answer i is right */
const climb = (mode, fn, seed = 3) => { let st = P.placementStart({ mode, rand: P.rng(seed) }); for (let i = 0; !st.done; i++) st = P.placementAnswer(st, fn(i)); return st; };

/* ---------- 1.1 The climb ---------- */
test('STEPS are the 13 grades K to 12, and each Mode starts at its first grade: Explorer K, Challenger 3, Pro 8', () => {
  assert.deepEqual(P.STEPS.map(String), ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  assert.equal(P.startStep('explorer'), 'K'); assert.equal(P.startStep('challenger'), 3); assert.equal(P.startStep('pro'), 8);
  for (const m of Object.keys(MODES)) assert.equal(P.startStep(m), MODES[m].grades[0]);
  for (const [m, g] of [['explorer', 'K'], ['challenger', '3'], ['pro', '8']]) { const st = P.placementStart({ mode: m, rand: P.rng(1) }); assert.equal(grade(st), g); assert.equal(String(st.current.grade), g); }
});

test('a right answer climbs one Step and the question comes from that grade; a miss stays, and the next Skill differs', () => {
  for (const seed of SEEDS.slice(0, 40)) {
    let st = P.placementStart({ mode: 'explorer', rand: P.rng(seed) });
    assert.equal(grade(st), 'K');
    st = P.placementAnswer(st, true); assert.equal(grade(st), '1'); assert.equal(st.rights, 1); assert.equal(String(byId[st.current.skill].grade), '1');
    const missed = st.current.skill;
    st = P.placementAnswer(st, false); assert.equal(grade(st), '1'); assert.equal(st.misses, 1); assert.notEqual(st.current.skill, missed, 'a different Skill after a miss'); assert.equal(String(byId[st.current.skill].grade), '1');
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
  assert.equal(grade(st), '12'); assert.equal(st.done, false); assert.equal(String(byId[st.current.skill].grade), '12');
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
  const st = P.placementStart({ mode: 'challenger', rand: P.rng(5) }), snap = JSON.stringify({ ...st, rand: null, current: st.current.skill });
  const next = P.placementAnswer(st, true);
  assert.notEqual(next, st); assert.equal(JSON.stringify({ ...st, rand: null, current: st.current.skill }), snap);
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
  for (const s of P.STEPS) for (const id of P.PLACEMENT_POOL[String(s)]) for (const seed of SEEDS) {
    const rand = P.rng(`${id}:${seed}`);
    const q = P.drawQuestion(s, { rand, avoid: P.PLACEMENT_POOL[String(s)].find(x => x !== id) });
    assert.ok(P.usable(q.p), `${id} seed ${seed}: ${q.p.kind} ${JSON.stringify(q.p.answer)}`);
    assert.equal(String(q.grade), String(s));
  }
  // and each Skill of the pool is reachable: with its neighbours avoided one at a time, every id comes up
  for (const s of P.STEPS) {
    const seen = new Set(); for (const seed of SEEDS.slice(0, 60)) seen.add(P.drawQuestion(s, { rand: P.rng(seed) }).skill);
    assert.deepEqual([...seen].sort(), P.PLACEMENT_POOL[String(s)].slice().sort(), `Step ${s}`);
  }
});

test('a miss never asks the same Skill twice in a row at a Step', () => {
  for (const s of P.STEPS) for (const id of P.PLACEMENT_POOL[String(s)]) for (const seed of SEEDS.slice(0, 30)) assert.notEqual(P.drawQuestion(s, { avoid: id, rand: P.rng(seed) }).skill, id);
});

/* ---------- 1.3 Three choices ---------- */
test('threeChoices: 3 distinct values with exactly one equal to the answer; numbers never negative and ascending; a choice question keeps the others\' order', () => {
  for (const s of P.STEPS) for (const id of P.PLACEMENT_POOL[String(s)]) for (const seed of SEEDS) {
    const rand = P.rng(`c:${id}:${seed}`), { p } = P.drawQuestion(s, { rand, avoid: P.PLACEMENT_POOL[String(s)].find(x => x !== id) });
    const c = P.threeChoices(p, rand);
    assert.equal(c.length, 3, id); assert.equal(new Set(c).size, 3, `${id}: ${c}`);
    assert.equal(c.filter(v => v === String(p.answer)).length, 1, `${id}: ${c} has the answer ${p.answer} once`);
    if (p.kind === 'num') {
      const n = c.map(Number); assert.ok(n.every(v => Number.isInteger(v) && v >= 0), `${id}: ${c}`);
      assert.deepEqual(n, n.slice().sort((a, b) => a - b), `${id}: ascending ${c}`);
    } else {
      assert.ok(p.choices.length >= 3);
      const others = c.filter(v => v !== String(p.answer)), order = p.choices.map(String).filter(v => others.includes(v));
      assert.deepEqual(others, order, `${id}: the 2 others keep their order`);
    }
    const q = P.asChoice(p, rand); assert.equal(q.kind, 'choice'); assert.equal(q.choices.length, 3); assert.ok(q.choices.includes(String(q.answer)));
  }
  assert.deepEqual(P.threeChoices({ kind: 'num', answer: 0 }, () => 0).map(Number).sort((a, b) => a - b)[0], 0);
});

/* ---------- 1.4 What the level sets ---------- */
test('LEVEL_START[the Mode\'s first grade] is that Mode\'s START, and skillStart is 10, 5, 1 below, at and above the level', () => {
  for (const m of Object.keys(MODES)) assert.equal(P.LEVEL_START[String(MODES[m].grades[0])], START[m], m);
  assert.deepEqual(P.LEVEL_START, { K: 1, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 8, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 13 });
  assert.equal(P.skillStart(4, 6), 10); assert.equal(P.skillStart(6, 6), 5); assert.equal(P.skillStart(7, 6), 1);
  assert.equal(P.skillStart('K', 'K'), 5); assert.equal(P.skillStart('K', 1), 10); assert.equal(P.skillStart(12, 'K'), 1);
});

test('beltFor follows BELTS and the Trick grades: K to 3 white, 4 and 5 yellow, 6 orange, 7 blue, 8 purple, 9 to 12 black', () => {
  const want = { K: 'white', 1: 'white', 2: 'white', 3: 'white', 4: 'yellow', 5: 'yellow', 6: 'orange', 7: 'blue', 8: 'purple', 9: 'black', 10: 'black', 11: 'black', 12: 'black' };
  for (const [g, b] of Object.entries(want)) assert.equal(P.beltFor(g), b, `grade ${g}`);
  // computed, not typed: the first Belt in order with a Trick at or above the grade
  const gradeOf = id => TRICKS.find(t => t.id === id).grade;
  for (const g of P.STEPS) { const L = g === 'K' ? 0 : g; const b = BELTS.find(b => b.tricks.some(t => gradeOf(t) >= L)) || BELTS[BELTS.length - 1]; assert.equal(P.beltFor(g), b.id); }
  assert.equal(P.forwardBelt('white', 'orange'), 'orange'); assert.equal(P.forwardBelt('orange', 'white'), 'orange'); assert.equal(P.forwardBelt(undefined, 'yellow'), 'yellow'); assert.equal(P.forwardBelt('blue', 'blue'), 'blue');
  assert.deepEqual(P.suggestedGrades('K').map(String), ['K', '1']); assert.deepEqual(P.suggestedGrades(6).map(String), ['5', '6', '7']); assert.deepEqual(P.suggestedGrades('12').map(String), ['11', '12']);
});

test('raiseOnly raises only lower Ratings, never lowers, and leaves everything else deep-equal', () => {
  const rec = { v: 3, sparks: 120, skills: { '3-mult': { n: 9, c: 8, m: .9, streak: 3, last: 1 } }, medals: { 'g:times-sprint:1': 2 }, belts: { white: 1 }, sky: { lit: { 'from9:1': 1 }, skipped: {}, last: {} },
    ratings: { 'game:times-sprint': 12, 'game:make-ten': 2, 'arena:challenger': 4, 'skill:3-mult': 3, 'skill:4-mult2': 12, 'skill:9-seq': 3, 'skill:v-sq5': 2, 'skill:v-sqroot': 1 } };
  const snap = JSON.stringify(rec);
  const out = P.raiseOnly(rec, 5); // LEVEL_START[5] is 7
  assert.equal(JSON.stringify(rec), snap, 'the input is untouched');
  assert.deepEqual(out.ratings, { 'game:times-sprint': 12, 'game:make-ten': 7, 'arena:challenger': 7, 'skill:3-mult': 10, 'skill:4-mult2': 12, 'skill:9-seq': 3, 'skill:v-sq5': 10, 'skill:v-sqroot': 1 });
  for (const f of ['medals', 'sky', 'belts', 'skills', 'sparks']) assert.deepEqual(out[f], rec[f], f);
  assert.equal(P.raiseOnly(out, 5), out, 'nothing to raise: the same record back');
  assert.equal(P.raiseOnly({ v: 3 }, 9).ratings, undefined);
  // a Skill at the level starts at 5; a Trick's grade is the Trick's, not V
  assert.equal(P.raiseOnly({ ratings: { 'skill:5-order': 2, 'skill:v-ends10': 1 } }, 5).ratings['skill:5-order'], 5);
  assert.equal(P.raiseOnly({ ratings: { 'skill:v-ends10': 1 } }, 5).ratings['skill:v-ends10'], 5);
});
