/* Try a trick inside each Mode (openspec try-trick-in-modes): each Mode's lesson is on a Trick that truly belongs to the
   Sutra it names (js/vedic.js and js/sutras.js agree), the worked example and every question have the right answer,
   no question is the worked example, Explorer's sums need no carry, and the copy follows the house rules. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRY, tryFor, sutraOf, choicesFor, QUESTIONS, SPARKS } from '../js/try.js';
import { TRICKS } from '../js/vedic.js';
import { SUTRAS } from '../js/sutras.js';

const MODES = ['explorer', 'challenger', 'pro'];
const plain = h => String(h).replace(/<sup>2<\/sup>/g, '²').replace(/<[^>]+>/g, '').replace(/&minus;/g, '−').replace(/\s+/g, ' ').trim();

test('one Try a trick per Mode, each on a different Sutra, and an unknown Mode falls back to Challenger', () => {
  assert.deepEqual(Object.keys(TRY).sort(), [...MODES].sort());
  assert.equal(new Set(MODES.map(m => TRY[m].sutra)).size, 3);
  assert.equal(tryFor('wizard'), TRY.challenger);
  assert.equal(QUESTIONS, 3);
  assert.equal(SPARKS, 10);
});

test('the Sutra named is the one the Trick belongs to in the app\'s own data (vedic.js sutraId and sutras.js tricks)', () => {
  const expect = { explorer: ['by11', 's3', 'Ūrdhva-Tiryagbhyām'], challenger: ['sq5', 's1', 'Ekādhikena Pūrveṇa'], pro: ['near-base', 's2', 'Nikhilaṃ Navataścaramaṃ Daśataḥ'] };
  for (const m of MODES) {
    const [trick, id, name] = expect[m], T = TRY[m], t = TRICKS.find(x => x.id === T.trick), s = sutraOf(m);
    assert.equal(T.trick, trick, m);
    assert.equal(T.sutra, id, m);
    assert.equal(t.sutraId, id, `${m}: vedic.js files ${trick} under ${id}`);
    assert.equal(s.name, name, m);
    assert.ok(SUTRAS.find(x => 's' + x.n === id).tricks.includes(trick), `${m}: sutras.js lists ${trick} under ${id}`);
  }
  assert.equal(TRY.challenger.mean, SUTRAS[0].meaning);
  assert.equal(TRY.pro.mean, SUTRAS[1].meaning);
});

test('the worked examples: 23 × 11 = 253, 35² = 1225, 97 × 96 = 9312, each last step giving the result', () => {
  const ex = { explorer: [[23], 253, '23 × 11 = 253'], challenger: [[35], 1225, '35² = 1225'], pro: [[97, 96], 9312, '97 × 96 = 9312'] };
  for (const m of MODES) {
    const [vals, whole, last] = ex[m], T = TRY[m];
    assert.deepEqual(T.example, vals, m);
    assert.equal(T.product(vals), whole, m);
    const steps = T.steps(vals);
    assert.ok(steps.length >= 3, m);
    assert.ok(plain(steps.at(-1).say).includes(last), `${m}: "${steps.at(-1).say}" ends in ${last}`);
  }
  assert.equal(TRY.explorer.answer([23]), 5, 'the middle of the 11 sandwich');
});

test('three questions each, none of them the worked example, with answers that are true', () => {
  for (const m of MODES) {
    const T = TRY[m];
    assert.equal(T.questions.length, QUESTIONS, m);
    assert.ok(T.questions.every(q => q.join() !== T.example.join()), `${m}: no question is the worked example`);
    assert.equal(new Set(T.questions.map(q => q.join())).size, QUESTIONS, `${m}: three different questions`);
  }
  for (const [n] of TRY.explorer.questions) assert.equal(TRY.explorer.product([n]), n * 11);
  for (const [n] of TRY.challenger.questions) { assert.equal(n % 10, 5); assert.equal(TRY.challenger.answer([n]), n * n); }
  for (const [a, b] of TRY.pro.questions) { assert.equal(TRY.pro.answer([a, b]), a * b); assert.ok(Math.abs(a - 100) <= 10 && Math.abs(b - 100) <= 10, 'near 100'); }
  assert.deepEqual(TRY.challenger.questions.map(v => TRY.challenger.answer(v)), [625, 2025, 4225]);
  assert.deepEqual(TRY.pro.questions.map(v => TRY.pro.answer(v)), [9506, 9024, 10918]);
});

test('Explorer: two-digit numbers whose digits add to under 10, so the sandwich never carries', () => {
  for (const vals of [TRY.explorer.example, ...TRY.explorer.questions]) {
    const [n] = vals, mid = TRY.explorer.answer(vals);
    assert.ok(n >= 10 && n <= 99, String(n));
    assert.ok(mid < 10, `${n}: ${mid}`);
    assert.equal(Number(`${Math.floor(n / 10)}${mid}${n % 10}`), n * 11, `${n} × 11 is the digits with the sum between`);
  }
});

test('Explorer choices: three different numbers, never below 0, one of them the sum', () => {
  let a = 1; const rand = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  for (let sum = 0; sum <= 9; sum++) for (let i = 0; i < 20; i++) {
    const c = choicesFor(sum, rand);
    assert.equal(c.length, 3); assert.equal(new Set(c).size, 3); assert.ok(c.includes(sum)); assert.ok(c.every(x => x >= 0));
  }
});

test('the copy: no em dashes, no Vedas claim, short Explorer sentences, and the 1965 book credited', () => {
  const src = readFileSync(new URL('../js/try.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('—'), 'no em dash');
  assert.doesNotMatch(src, /from the Vedas|Vedic source|ancient/i);
  assert.match(src, /Bharati Krishna Tirtha's 1965 book/);
  const E = TRY.explorer, lines = [E.title, E.lede, E.mean, E.why, E.ask, E.start, ...E.steps(E.example).map(s => s.say)];
  for (const l of lines) for (const sentence of l.split(/(?<=[.!?])\s+/)) assert.ok(sentence.split(/\s+/).length <= 10, `Explorer sentence too long: "${sentence}"`);
});

test('nothing new is spoken: the only literal lines try.js speaks are the two already recorded', () => {
  const src = readFileSync(new URL('../js/try.js', import.meta.url), 'utf8');
  const spoken = [...src.matchAll(/\bspeak\w*\(([^)]*)\)/g)].map(m => m[1].trim());
  assert.deepEqual([...new Set(spoken)].sort(), ["'Not quite. Try again!'", "'You got it!'"]);
  assert.doesNotMatch(src, /const PRAISE = /, 'no praise list for the voice line scan to pick up');
});
