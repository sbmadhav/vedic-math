/* Scores (openspec change react-typescript, task 3.1): the caps match cloud/firestore.rules, a board takes only what
   the rules accept, and the Arena's combo gain is the one the rules describe (even, 10 plus 2 per answer in the
   streak, at most +20). */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_SCORE, MAX_GAME_SCORE, MAX_WEEK_SPARKS, KEEP_DAYS, boardScore, comboGain, pointsAt, DMIN, DMAX } from './scoring.ts';

const rules = readFileSync(new URL('../../cloud/firestore.rules', import.meta.url), 'utf8');

test('the caps are the ones cloud/firestore.rules enforces', () => {
  const m = rules.match(/return kind\(\) == 'game' \? (\d+) : kind\(\) == 'xp' \? (\d+)\s*: \{ 'explorer': (\d+), 'challenger': (\d+), 'pro': (\d+) \}/)!;
  assert.ok(m, 'maxScore() found in the rules');
  assert.deepEqual(m.slice(1).map(Number), [MAX_GAME_SCORE, MAX_WEEK_SPARKS, MAX_SCORE.explorer, MAX_SCORE.challenger, MAX_SCORE.pro]);
  assert.match(rules, new RegExp(`duration\\.value\\(${KEEP_DAYS - 1}, 'd'\\).*duration\\.value\\(${KEEP_DAYS + 1}, 'd'\\)`), 'the rules take KEEP_DAYS give or take a day');
});

test('boardScore: whole numbers from 10 to the cap, even on Arena boards, 0 when the board takes none', () => {
  assert.equal(boardScore('daily-2026-10-21-challenger', 1601), 1600);
  assert.equal(boardScore('daily-2026-10-21-challenger', 37), 36);
  assert.equal(boardScore('daily-2026-10-21-pro', 9), 0);
  assert.equal(boardScore('week-2026-W43-explorer', '250'), 250);
  assert.equal(boardScore('g_rain-daily-2026-10-21-pro', 12345), 12000);
  assert.equal(boardScore('g_rain-daily-2026-10-21-pro', 37), 37);
  assert.equal(boardScore('xp-week-2026-W43-pro', 70000), 60000);
  assert.equal(boardScore('daily-2026-10-21-nowhere', 500), 0);
  assert.equal(boardScore('daily-2026-10-21-pro', 'x'), 0);
});

test('the combo gain is even, 10 at the first answer and 30 from the eleventh', () => {
  assert.deepEqual([1, 2, 3, 10, 11, 12, 40].map(comboGain), [10, 12, 14, 28, 30, 30, 30]);
  // n straight right answers (n >= 11) score 30n - 110, as the rules' comment says
  for (const n of [11, 20, 44]) assert.equal(Array.from({ length: n }, (_, i) => comboGain(i + 1)).reduce((a, b) => a + b, 0), 30 * n - 110);
});

test('points per right answer: 10 at the easiest difficulty, 143 at the hardest, clamped outside the dial', () => {
  assert.equal(pointsAt(DMIN), 10);
  assert.equal(pointsAt(DMAX), 143);
  assert.equal(pointsAt(0), 10);
  assert.equal(pointsAt(99), 143);
  assert.equal(pointsAt(9.6), pointsAt(10));
});
