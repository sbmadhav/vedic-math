/* Dojo katas: 1,050 seeded levels (50 per speed trick). Every stored answer is worked out
   again here from the question text with exact arithmetic. Run: pnpm test */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { TRICKS, BELTS } from '../js/vedic.js';
import { KATA_COUNT, KATAS_PER_TRICK, kata, kataKey, kataDoneFor, kataSparks } from '../js/levels.js';
import { checkOne } from '../js/check.js';
import { verifyQuestion, solveFields, toRat } from './support/verify.mjs';

const ALL = TRICKS.flatMap(t => Array.from({ length: KATAS_PER_TRICK }, (_, i) => kata(t.id, i + 1)));
const fmt = (k, i) => `${kataKey(k.trick.id, k.n)} problem ${i + 1}`;

test('there are 1,050 katas: 21 tricks x 50', () => {
  assert.equal(TRICKS.length, 21);
  assert.equal(KATAS_PER_TRICK, 50);
  assert.equal(KATA_COUNT, 1050);
  assert.equal(ALL.length, 1050);
});

test('trick ids and kata keys are unique, and every trick has a belt', () => {
  assert.equal(new Set(TRICKS.map(t => t.id)).size, TRICKS.length);
  assert.equal(new Set(ALL.map(k => kataKey(k.trick.id, k.n))).size, 1050);
  const belted = BELTS.flatMap(b => b.tricks);
  assert.equal(new Set(belted).size, belted.length, 'a trick is in two belts');
  assert.deepEqual([...belted].sort(), TRICKS.map(t => t.id).sort());
});

test('katas are deterministic and have the advertised size', () => {
  for (const k of ALL) {
    assert.equal(k.problems.length, k.n <= 10 ? 5 : k.n <= 30 ? 6 : 8, kataKey(k.trick.id, k.n));
    assert.ok(Number.isFinite(k.par) && k.par > 0);
  }
  for (const t of TRICKS) for (const n of [1, 25, 50]) assert.deepEqual(JSON.stringify(kata(t.id, n)), JSON.stringify(kata(t.id, n)));
});

test('every kata answer is mathematically correct', () => {
  const wrong = [], unverified = [];
  let checked = 0;
  ALL.forEach(k => k.problems.forEach((p, i) => {
    if (p.kind === 'fields') {
      const want = solveFields(p);
      if (!want) { unverified.push(`${fmt(k, i)}: ${p.q}`); return; }
      want.forEach((w, j) => {
        const got = p.fields[j];
        if (!got || got.label !== w.label || Math.abs(got.answer - w.answer.toNumber()) > 1e-9) wrong.push(`${fmt(k, i)}: ${w.label} should be ${w.answer}, stored ${got && got.answer}`);
      });
      checked++; return;
    }
    const r = verifyQuestion(p);
    if (r.status === 'wrong') wrong.push(`${fmt(k, i)}: ${r.text} -> ${r.why}`);
    else if (r.status !== 'ok') unverified.push(`${fmt(k, i)}: ${r.text}`);
    else checked++;
  }));
  assert.deepEqual(wrong, [], `wrong answers:\n${wrong.join('\n')}`);
  assert.deepEqual(unverified, [], `could not verify:\n${unverified.slice(0, 20).join('\n')}`);
  assert.ok(checked > 6000, `only ${checked} problems checked`);
});

test('answer checking accepts each kata answer and rejects near misses', () => {
  for (const k of ALL) k.problems.forEach((p, i) => {
    const id = fmt(k, i);
    if (p.kind === 'fields') {
      p.fields.forEach(f => {
        assert.ok(checkOne({ kind: 'num', answer: f.answer }, String(f.answer)).ok, `${id} ${f.label}`);
        assert.ok(!checkOne({ kind: 'num', answer: f.answer }, String(f.answer + 1)).ok, `${id} ${f.label} +1`);
      });
      return;
    }
    if (p.kind === 'choice') {
      assert.ok(p.choices.includes(p.answer), `${id}: answer not among the choices`);
      assert.ok(checkOne(p, p.answer).ok, id);
      p.choices.filter(c => c !== p.answer).forEach(c => assert.ok(!checkOne(p, c).ok, `${id}: accepted ${c}`));
      return;
    }
    assert.equal(p.kind, 'num', id);
    assert.ok(checkOne(p, String(p.answer)).ok, `${id}: rejected ${p.answer}`);
    assert.ok(checkOne(p, toRat(p.answer).toString()).ok, `${id}: rejected ${toRat(p.answer)}`);
    for (const miss of [p.answer + 1, p.answer - 1, p.answer * 10]) if (miss !== p.answer) assert.ok(!checkOne(p, String(miss)).ok, `${id}: accepted ${miss} for ${p.answer}`);
  });
});

test('kata done at 60% right, with no rating of its own', () => {
  assert.equal(kataDoneFor(5, 5), true);
  assert.equal(kataDoneFor(3, 5), true);
  assert.equal(kataDoneFor(2, 5), false);
  assert.equal(kataDoneFor(5, 8), true);
  assert.equal(kataDoneFor(4, 8), false);
  assert.equal(kataDoneFor(0, 0), false);
});

test('kata Sparks: 5 per right answer, plus 10 when done', () => {
  assert.equal(kataSparks(5, 6), 35); /* the medals spec scenario: 5 of 6 in Kata 3 */
  assert.equal(kataSparks(8, 8), 50);
  assert.equal(kataSparks(5, 5), 35);
  assert.equal(kataSparks(2, 5), 10);
  assert.equal(kataSparks(0, 5), 0);
});

/* Step and question text is clean signed math on screen and when read aloud (openspec voice-wording):
   no "1x", no "+ -", no "- -", no "+ −", no 0x terms */
test('speed trick steps and questions are written in clean form', async () => {
  const { lin } = await import('../js/vedic.js');
  assert.equal(lin([1, 'x'], [-12]), 'x − 12');
  assert.equal(lin([-1, 'x'], [0, 'y'], [5]), '−x + 5');
  assert.equal(lin([0, 'x']), '0');
  const bad = /(^|[^\d.])1[xy]\b|\b0[xy]\b|[+−-]\s*[-−]\s*[\dxy(]/;
  const clean = h => h.replace(/<br\s*\/?>/g, ' ; ').replace(/<[^>]+>/g, '').replace(/&minus;/g, '−');
  const fails = [];
  const look = (id, x) => { if (bad.test(clean(x))) fails.push(`${id}: ${clean(x)}`); };
  for (const k of ALL) for (const p of k.problems) { look(k.trick.id, p.q); p.steps.forEach(s => look(k.trick.id, s)); }
  // The animator takes any numbers a Player types, so try the edges too: 1 and -1 coefficients, zeros, negatives
  const edges = { transpose: [[1, -12, -1, 0], [2, 0, 1, 5], [-1, 3, 1, -7], [3, -4, 0, 8]], 'add-sub': [[1, 2, -3, 0], [2, 1, 4, 5]], 'ratio-zero': [[1, 1, 3, 2]], 'zero-sum': [[1, 12, 3, 4]] };
  for (const t of TRICKS) {
    for (let i = 0; i < 40; i++) t.steps(t.random()).forEach(s => look(t.id, s.say));
    for (const v of edges[t.id] || []) t.steps(v).forEach(s => look(t.id, s.say));
  }
  assert.deepEqual(fails.slice(0, 10), [], `${fails.length} lines`);
});
