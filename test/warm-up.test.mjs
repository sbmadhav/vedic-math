/* The projector warm-up's data and pick (openspec change teacher-warm-up, tasks 1.1 and 1.3; design D3 and D4):
   every problem is one its Trick takes, the three rise, each Trick is one of the 15 Trick pages, and the Trick of the
   day rotates through them by the local date with nothing stored. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { TRICKS } from '../js/vedic.js';
import { PAGES, TRICK_IDS, pageOf } from '../tools/trick-pages/pages.ts';
import { PROBLEMS, problemText, answerText, rises, sizeOf } from '../tools/trick-pages/warm-up-problems.ts';
import { dayNumber, trickOfDay, pickTrick } from '../tools/trick-pages/warm-up-pick.ts';

const trick = id => TRICKS.find(t => t.id === id);

test('the 15 Trick pages: ids from the catalog, unique slugs of lowercase words', () => {
  assert.equal(PAGES.length, 15);
  assert.deepEqual(TRICK_IDS, PAGES.map(p => p.id));
  for (const p of PAGES) {
    assert.ok(trick(p.id), `${p.id} is a Trick`);
    assert.match(p.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, p.slug);
  }
  assert.equal(new Set(PAGES.map(p => p.slug)).size, 15, 'slugs are unique');
  assert.equal(new Set(TRICK_IDS).size, 15, 'ids are unique');
  assert.equal(pageOf('sq5')?.slug, 'square-numbers-ending-in-5');
  assert.equal(pageOf('recip'), undefined, 'a Trick without a page');
});

test('every warm-up is for one of the 15, with a worked example and three problems its Trick takes', () => {
  assert.deepEqual(Object.keys(PROBLEMS).sort(), [...TRICK_IDS].sort());
  for (const [id, w] of Object.entries(PROBLEMS)) {
    const t = trick(id);
    assert.equal(w.problems.length, 3, id);
    for (const vals of [w.example, ...w.problems]) {
      assert.equal(vals.length, t.inputs.length, `${id} ${vals}: as many numbers as the Trick has inputs`);
      assert.equal(t.valid(vals), null, `${id} ${vals} passes valid()`);
      const a = t.answer(vals);
      assert.ok(Number.isFinite(a), `${id} ${vals}: answer() is a number`);
      assert.ok(t.steps(vals).length >= 3, `${id} ${vals}: steps to show`);
      const words = problemText(id, vals), shown = answerText(id, vals, a);
      assert.ok(words && shown, `${id} ${vals}: words for the class`);
      assert.doesNotMatch(words + shown, /—/, 'no em dash');
    }
    assert.ok(!w.problems.some(p => p.join() === w.example.join()), `${id}: the example is not one of the class problems`);
  }
});

test("each Trick's three problems rise: more digits, or the same digits and a larger number", () => {
  for (const [id, w] of Object.entries(PROBLEMS)) assert.ok(rises(w.problems), `${id}: ${w.problems.map(p => p.join('×')).join(' < ')}`);
  assert.deepEqual(sizeOf([97, 96]), [4, 97]);
  assert.equal(rises([[65], [25]]), false, 'a smaller number does not rise');
  assert.equal(rises([[46, 5], [36, 25]]), true, 'more digits rise even when the first number is smaller');
  assert.equal(rises([[48, 47], [48, 47]]), false, 'the same problem twice does not rise');
});

test('the question and the answer as the class reads them (design D3)', () => {
  assert.equal(problemText('sq5', [65]), '65²');
  assert.equal(problemText('near-base', [97, 96]), '97 × 96');
  assert.equal(problemText('from9', [368]), '1000 − 368');
  assert.equal(problemText('from9', [37]), '100 − 37');
  assert.equal(problemText('by11', [4352]), '4352 × 11');
  assert.equal(problemText('div9', [142]), '142 ÷ 9');
  assert.equal(problemText('sqroot', [2304]), '√2304');
  assert.equal(problemText('cuberoot', [59319]), '∛59319');
  assert.equal(problemText('square-near', [1004]), '1004²');
  assert.equal(answerText('sq5', [65], trick('sq5').answer([65])), '4225');
  assert.equal(answerText('div9', [142], trick('div9').answer([142])), '15 r 7');
  assert.equal(answerText('check9', [23, 14], trick('check9').answer([23, 14])), '322', 'the product the class checks, not the digit sum');
  assert.equal(answerText('cuberoot', [59319], trick('cuberoot').answer([59319])), '39');
});

test('the Trick of the day rotates through the 15 by the local date: a new one each day, every 15 days all of them', () => {
  const days = Array.from({ length: 30 }, (_, i) => new Date(2026, 10, 1 + i, 9, 30)); // local 09:30 on 30 consecutive dates
  const ids = days.map(d => trickOfDay(d, TRICK_IDS));
  for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1], `${days[i].toDateString()} differs from the day before`);
  for (let i = 0; i + 15 <= ids.length; i++) assert.equal(new Set(ids.slice(i, i + 15)).size, 15, `15 days from ${days[i].toDateString()} show every Trick`);
  assert.deepEqual(ids.slice(0, 15).sort(), [...TRICK_IDS].sort());
  // the same calendar date, morning or night, is the same day
  assert.equal(dayNumber(new Date(2026, 10, 3, 0, 1)), dayNumber(new Date(2026, 10, 3, 23, 59)));
  assert.equal(dayNumber(new Date(2026, 10, 4, 0, 0)), dayNumber(new Date(2026, 10, 3)) + 1);
  assert.equal(trickOfDay(new Date(2026, 10, 3, 7), TRICK_IDS), trickOfDay(new Date(2026, 10, 3, 15), TRICK_IDS));
  assert.throws(() => trickOfDay(new Date(), []));
});

test('a bookmarked Trick opens from ?trick=<id>; an unknown id or none falls back to the Trick of the day', () => {
  const day = new Date(2026, 10, 3, 9);
  assert.equal(pickTrick('?trick=by11', day, TRICK_IDS), 'by11');
  assert.equal(pickTrick('?utm=x&trick=cuberoot', day, TRICK_IDS), 'cuberoot');
  assert.equal(pickTrick('?trick=recip', day, TRICK_IDS), trickOfDay(day, TRICK_IDS), 'a Trick without a page');
  assert.equal(pickTrick('?trick=', day, TRICK_IDS), trickOfDay(day, TRICK_IDS));
  assert.equal(pickTrick('', day, TRICK_IDS), trickOfDay(day, TRICK_IDS));
});
