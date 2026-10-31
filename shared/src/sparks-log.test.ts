/* The Sparks history's rules and words (openspec change muse-review-polish, design D4): newest first, 50 kept,
   consecutive answers in one round group into one row, and each why has a readable label and a short when. */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { withAward, label, ago, LOG_CAP, LOG_GAP, type SparksAward } from './sparks-log.ts';

const T0 = 1_700_000_000_000;

test('awards go in newest first, and 60 of them keep the newest 50', () => {
  let log: SparksAward[] = [];
  for (let i = 0; i < 60; i++) log = withAward(log, 10 + i, 'kata', T0 + i * 1000);
  assert.equal(log.length, LOG_CAP);
  assert.deepEqual(log[0], { n: 69, why: 'kata', at: T0 + 59_000 });
  assert.deepEqual(log[49], { n: 20, why: 'kata', at: T0 + 10_000 });
});

test('consecutive answers within one round are one row; another award or a long gap starts a new one', () => {
  let log = withAward([], 10, 'answer', T0);
  log = withAward(log, 12, 'answer', T0 + 5000);
  log = withAward(log, 13, 'answer', T0 + 9000);
  assert.deepEqual(log, [{ n: 35, why: 'answer', at: T0 + 9000, k: 3 }]);
  log = withAward(log, 25, 'quest', T0 + 9500);
  log = withAward(log, 10, 'answer', T0 + 10_000);
  assert.deepEqual(log.map(e => [e.why, e.n, e.k ?? 1]), [['answer', 10, 1], ['quest', 25, 1], ['answer', 35, 3]]);
  log = withAward(log, 10, 'answer', T0 + 10_000 + LOG_GAP);
  assert.deepEqual(log.map(e => [e.why, e.n]), [['answer', 10], ['answer', 10], ['quest', 25], ['answer', 35]], 'half an hour later is another round');
  // A Star's questions group the same way; a kata does not
  let star = withAward([], 10, 'star', T0); star = withAward(star, 15, 'star', T0 + 3000);
  assert.deepEqual(star, [{ n: 25, why: 'star', at: T0 + 3000, k: 2 }]);
  let kata = withAward([], 30, 'kata', T0); kata = withAward(kata, 30, 'kata', T0 + 3000);
  assert.equal(kata.length, 2);
});

test('withAward never changes the log it was given', () => {
  const was: SparksAward[] = [{ n: 10, why: 'answer', at: T0 }], copy = JSON.stringify(was);
  withAward(was, 10, 'answer', T0 + 1000);
  assert.equal(JSON.stringify(was), copy);
});

test('labels: a readable name for every why, the experience for play:<id>, and the answer count of a group', () => {
  assert.equal(label({ n: 30, why: 'kata', at: T0 }), 'Kata');
  assert.equal(label({ n: 5, why: 'trick', at: T0 }), 'Watched a speed trick');
  assert.equal(label({ n: 25, why: 'quest', at: T0 }), 'Quest complete');
  assert.equal(label({ n: 130, why: 'answer', at: T0, k: 12 }), 'Practice: 12 answers');
  assert.equal(label({ n: 40, why: 'star', at: T0, k: 4 }), 'Star round: 4 answers');
  assert.equal(label({ n: 10, why: 'play:locks', at: T0 }, id => ({ locks: 'Discovery Locks' })[id]), 'Discovery Locks');
  assert.equal(label({ n: 10, why: 'play:gone', at: T0 }, () => undefined), 'Play');
  assert.equal(label({ n: 10, why: 'play', at: T0 }), 'Play');
  assert.equal(label({ n: 3, why: '', at: T0 }), 'Sparks');
  assert.equal(label({ n: 3, why: 'something-new', at: T0 }), 'Sparks');
});

test('ago: just now, minutes, hours, yesterday, days, then the date', () => {
  const now = T0 + 10 * 864e5;
  assert.equal(ago(now - 20_000, now), 'just now');
  assert.equal(ago(now - 5 * 60_000, now), '5 min ago');
  assert.equal(ago(now - 2 * 3_600_000, now), '2 h ago');
  assert.equal(ago(now - 30 * 3_600_000, now), 'yesterday');
  assert.equal(ago(now - 3 * 864e5, now), '3 days ago');
  assert.match(ago(now - 9 * 864e5, now), /^[A-Z][a-z]{2} \d{1,2}$/);
  assert.equal(ago(now + 5000, now), 'just now', 'a clock set back reads as now');
});
