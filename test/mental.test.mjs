/* Mental arithmetic families for the Pro Arena (openspec arena spec): every answer is a whole number of at most
   7 digits, worked out again from the question text by the independent checker, and questions get bigger as
   the difficulty rises. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { FAMILIES, mentalQ, sutraOfProduct, sutraOfSquare } from '../js/mental.js';
import { verifyQuestion, plain } from './support/verify.mjs';

/* A seeded Math.random, so every run checks the same questions */
function seeded(seed, fn) {
  const real = Math.random; let a = seed;
  Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = real; }
}
const N = 200;
const draws = {};
for (const f of FAMILIES) for (let d = 1; d <= 20; d++) draws[`${f} ${d}`] = seeded(d * 1000 + FAMILIES.indexOf(f), () => Array.from({ length: N }, () => mentalQ(f, d)));

test('five families, as the arena spec names them', () => {
  assert.deepEqual(FAMILIES, ['mul2x2', 'square', 'percent', 'nearBase', 'divide']);
  assert.throws(() => mentalQ('logs', 5));
});

test('200 questions per family and difficulty: whole answers of at most 7 digits, re-computed from the text', () => {
  for (const [k, qs] of Object.entries(draws)) {
    const [f, d] = k.split(' ');
    qs.forEach((p, i) => {
      const id = `${k} #${i + 1}: ${plain(p.q)}`;
      assert.equal(p.family, f, id); assert.equal(p.d, +d, id);
      assert.ok(Number.isInteger(p.answer) && p.answer > 0, `${id}: answer ${p.answer}`);
      assert.ok(String(p.answer).length <= 7, `${id}: ${p.answer} does not fit the keypad`);
      const r = verifyQuestion({ ...p, kind: 'num' });
      assert.equal(r.status, 'ok', `${id}: ${r.why || 'not checked'}`);
      assert.equal(verifyQuestion({ ...p, kind: 'num', answer: p.answer + 1 }).status, 'wrong', `${id}: checker missed a wrong answer`);
    });
  }
});

test('the questions are the families they claim, with no algebra, powers above 2 or logarithms', () => {
  const shape = { mul2x2: /^\d{2} \* \d{2} = \?$/, square: /^\d{2,3}\^\(2\) = \?$/, percent: /^What is \d+(\.5)?% of \d+\?$/, nearBase: /^\d{2,4} \* \d{2,4} = \?$/, divide: /^\d+ \/ \d+ = \?$/ };
  for (const [k, qs] of Object.entries(draws)) qs.forEach(p => assert.match(plain(p.q), shape[p.family], k));
  for (const qs of Object.values(draws)) qs.forEach(p => assert.doesNotMatch(p.q, /x|log|<sup>(?!2<)/));
  for (let d = 1; d <= 20; d++) draws[`nearBase ${d}`].forEach(p => { const [a, b] = plain(p.q).match(/\d+/g).map(Number); for (const n of [a, b]) assert.ok(n !== 100 && n !== 1000 && (Math.abs(n - 100) <= 20 || Math.abs(n - 1000) <= 99), `nearBase ${d}: ${n}`); });
});

test('the median answer rises with difficulty: bottom, middle and top thirds of each ladder', () => {
  const med = (f, d) => { const xs = draws[`${f} ${d}`].map(p => p.answer).sort((a, b) => a - b); return xs[N / 2]; };
  const avg = (f, a, b) => { let s = 0; for (let d = a; d <= b; d++) s += med(f, d); return s / (b - a + 1); };
  for (const f of FAMILIES) {
    const lo = avg(f, 1, 7), mid = avg(f, 8, 14), hi = avg(f, 15, 20);
    assert.ok(lo < mid && mid < hi, `${f}: ${lo}, ${mid}, ${hi}`);
    assert.ok(med(f, 20) > med(f, 1), `${f}: d20 ${med(f, 20)} vs d1 ${med(f, 1)}`);
  }
});

test('the same seed gives the same questions', () => {
  for (const f of FAMILIES) assert.deepEqual(seeded(7, () => mentalQ(f, 12)), seeded(7, () => mentalQ(f, 12)));
});

/* openspec change sutras-first: each Pro question names the Sutra card that answers it in a line, or none. The
   helpers draw no random numbers, so a seeded daily set keeps its questions (test/arena.test.mjs pins them). */
test('each Pro question names the Sutra that answers it, from its own numbers', () => {
  assert.equal(sutraOfProduct(47, 43), 'u8', 'same tens, units add to 10');
  assert.equal(sutraOfProduct(17, 13), 'u8');
  assert.equal(sutraOfProduct(47, 38), 's3');
  assert.equal(sutraOfSquare(85), 's1'); assert.equal(sutraOfSquare(115), 's1');
  assert.equal(sutraOfSquare(96), 's10'); assert.equal(sutraOfSquare(112), 's10');
  assert.equal(sutraOfSquare(47), 's3'); assert.equal(sutraOfSquare(237), 's3');
  for (const [k, qs] of Object.entries(draws)) for (const q of qs) {
    const f = k.split(' ')[0];
    if (f === 'nearBase') assert.equal(q.sutra, 's2', k);
    else if (f === 'percent' || f === 'divide') assert.equal(q.sutra, null, k);
    else if (f === 'square') { const n = Number(plain(q.q).match(/^(\d+)/)[1]); assert.equal(q.sutra, sutraOfSquare(n), k); }
    else { const [a, b] = plain(q.q).match(/\d+/g).map(Number); assert.equal(q.sutra, sutraOfProduct(a, b), k); }
  }
});
