/* Reading bands (openspec change age-bands, task 1.1): every grade and age maps as in the design table, no answer
   gives no band, RULES has choices 3, 4, 4, the Mode suggestions follow the MODES grade ranges (js/fx.js: Explorer
   K to 2, Challenger 3 to 8, Pro 8 to 12), and the module imports nothing (pure). */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRADES, AGES, BANDS, RULES, bandOf, suggestedMode, validReading, HELP_WORDS, readingLabel, gradeLabel, ageLabel, choicesAround, trimChoices, rulesFor } from './bands.ts';

test('the module is pure: no import, no DOM, no storage', () => {
  const src = readFileSync(new URL('./bands.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /^import\b/m);
  assert.doesNotMatch(src, /\b(document|window|localStorage|sessionStorage)\b/);
});

test('every grade maps as in the design table', () => {
  const want: Record<string, string> = { 'pre-k': 'early', k: 'early', 1: 'early', 2: 'growing', 3: 'growing', 4: 'growing', 5: 'fluent', 6: 'fluent', 7: 'fluent', 8: 'fluent', 9: 'fluent', 10: 'fluent', 11: 'fluent', 12: 'fluent', adult: 'fluent' };
  assert.deepEqual([...GRADES], ['pre-k', 'k', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'adult'], 'the buttons in order');
  assert.deepEqual([...GRADES].sort(), Object.keys(want).sort());
  for (const g of GRADES) assert.equal(bandOf({ grade: g }), want[g], g);
  assert.equal(bandOf({ grade: 'K' }), 'early', 'case does not matter');
  assert.equal(bandOf({ grade: 3 }), 'growing', 'a number is a grade too');
});

test('every age maps as in the design table: 3 to 6 early, 7 to 9 growing, 10 and up and Grown-up fluent', () => {
  assert.deepEqual([...AGES], [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 'adult']);
  for (const a of AGES) assert.equal(bandOf({ age: a }), a === 'adult' || a >= 10 ? 'fluent' : a >= 7 ? 'growing' : 'early', String(a));
  assert.equal(bandOf({ age: 2 }), 'early', 'an age under 3 from elsewhere still reads early');
  assert.equal(bandOf({ age: 40 }), 'fluent');
});

test('no answer gives no band, and a bad answer is no answer', () => {
  for (const r of [null, undefined, {}, { grade: 'x' }, { age: 0 }, { age: 9.5 }, { age: '9' }, { grade: '3', age: 9 }, 'k', 7]) {
    assert.equal(bandOf(r), null, JSON.stringify(r));
    assert.equal(validReading(r), false, JSON.stringify(r));
    assert.equal(suggestedMode(r), null, JSON.stringify(r));
  }
  for (const g of GRADES) assert.ok(validReading({ grade: g, at: 1 }), g);
  for (const a of AGES) assert.ok(validReading({ age: a, at: 1 }), String(a));
  assert.equal(rulesFor(null), null);
  assert.equal(rulesFor('early'), RULES.early);
});

test('RULES: three bands with choices 3, 4, 4; Early reads aloud and taps, Growing a bar with no ticks, Fluent as the Mode', () => {
  assert.deepEqual(Object.keys(RULES), [...BANDS]);
  assert.deepEqual(BANDS.map(b => RULES[b].choices), [3, 4, 4]);
  assert.deepEqual(BANDS.map(b => RULES[b].voice), [true, false, false]);
  assert.deepEqual(BANDS.map(b => RULES[b].tap), [true, false, false]);
  assert.deepEqual(BANDS.map(b => RULES[b].copy), ['early', 'growing', null]);
  assert.deepEqual(BANDS.map(b => RULES[b].clock), ['none', 'bar', 'mode']);
  assert.deepEqual(BANDS.map(b => RULES[b].ticks), [false, false, true]);
  assert.deepEqual(BANDS.map(b => RULES[b].race), [false, true, true]);
  assert.ok(Object.isFrozen(RULES) && Object.isFrozen(RULES.early));
});

test('the Mode suggestion follows the MODES grade ranges: Pre-K to 2 Explorer, 3 to 7 Challenger, 8 and up Pro', () => {
  const byGrade: Record<string, string> = { 'pre-k': 'explorer', k: 'explorer', 1: 'explorer', 2: 'explorer', 3: 'challenger', 4: 'challenger', 5: 'challenger', 6: 'challenger', 7: 'challenger', 8: 'pro', 9: 'pro', 10: 'pro', 11: 'pro', 12: 'pro', adult: 'pro' };
  for (const g of GRADES) assert.equal(suggestedMode({ grade: g }), byGrade[g], g);
  for (const a of AGES) assert.equal(suggestedMode({ age: a }), a === 'adult' || a >= 13 ? 'pro' : a >= 8 ? 'challenger' : 'explorer', String(a));
});

test('words for grown-ups and buttons: lots, some, a little; labels for every answer', () => {
  assert.deepEqual(HELP_WORDS, { early: 'lots', growing: 'some', fluent: 'a little' });
  assert.equal(readingLabel({ grade: 'pre-k' }), 'Pre-K');
  assert.equal(readingLabel({ grade: 'k' }), 'Kindergarten');
  assert.equal(readingLabel({ grade: '3' }), 'Grade 3');
  assert.equal(readingLabel({ grade: 'adult' }), 'Grown-up');
  assert.equal(readingLabel({ age: 7 }), 'Age 7');
  assert.equal(readingLabel({ age: 'adult' }), 'Grown-up');
  assert.equal(readingLabel(null), '');
  assert.deepEqual(GRADES.map(gradeLabel), ['Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'Grown-up']);
  assert.deepEqual(AGES.map(ageLabel), ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', 'Grown-up']);
});

/* A seeded random for repeatable draws */
const rng = (a = 1) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
test('choicesAround: n distinct whole numbers in ascending order, the answer among them, none negative for a non-negative answer', () => {
  for (const n of [3, 4]) for (const ans of [0, 1, 7, 25, 7225, 100, -4]) for (let s = 1; s <= 50; s++) {
    const c = choicesAround(ans, n, rng(s));
    assert.equal(c.length, n, `${ans} x${n}`);
    assert.equal(new Set(c).size, n, 'distinct');
    assert.ok(c.includes(ans), 'the answer is there');
    assert.deepEqual(c, [...c].sort((x, y) => x - y), 'ascending');
    if (ans >= 0) assert.ok(c.every(v => v >= 0), 'none negative');
    assert.ok(c.every(Number.isInteger));
  }
});
test('trimChoices keeps the answer and the first others in their order; fewer choices are left alone', () => {
  assert.deepEqual(trimChoices(['<', '=', '>'], '=', 3), ['<', '=', '>']);
  assert.deepEqual(trimChoices(['a', 'b', 'c', 'd'], 'd', 3), ['a', 'b', 'd']);
  assert.deepEqual(trimChoices(['a', 'b', 'c', 'd', 'e'], 'b', 3), ['a', 'b', 'c']);
  assert.deepEqual(trimChoices([1, 2, 3, 4], 4, 4), [1, 2, 3, 4]);
});
