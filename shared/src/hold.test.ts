/* The wait indicator's thresholds (openspec change muse-review-polish, design D1): no bar at 1.2 s or less, a bar
   above it, Next only in a skippable hold of 2 s or more, and the time left in whole seconds. */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { holdPlan, holdLeftText, BAR_AFTER, NEXT_FROM, HOLD_SAID } from './hold.ts';

test('a hold of 1.2 s or less shows nothing; longer holds show the bar', () => {
  assert.equal(BAR_AFTER, 1200);
  for (const ms of [0, 700, 900, 1100, 1200]) assert.deepEqual(holdPlan(ms, { skippable: true }), { bar: false, next: false }, `${ms} ms`);
  assert.deepEqual(holdPlan(1201), { bar: true, next: false });
  assert.deepEqual(holdPlan(2300), { bar: true, next: false }, 'a timed round: the bar, never Next');
});

test('Next from 2 s, only when the round lets the Player skip the hold', () => {
  assert.equal(NEXT_FROM, 2000);
  assert.deepEqual(holdPlan(1999, { skippable: true }), { bar: true, next: false });
  assert.deepEqual(holdPlan(2000, { skippable: true }), { bar: true, next: true });
  assert.deepEqual(holdPlan(7500, { skippable: true }), { bar: true, next: true }, "a Star's worked method, four steps");
  assert.deepEqual(holdPlan(7500), { bar: true, next: false });
});

test('the time left reads in whole seconds and never says 0', () => {
  assert.equal(holdLeftText(1100), 'Next question in 2 s');
  assert.equal(holdLeftText(1000), 'Next question in 1 s');
  assert.equal(holdLeftText(0), 'Next question in 1 s');
  assert.equal(HOLD_SAID, 'Next question in a moment.');
});
