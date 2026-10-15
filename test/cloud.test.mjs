/* cloud.boardScore must send what cloud/firestore.rules accept: Arena boards take an even score up to
   the league cap, Ranked game boards up to 12000 and weekly XP boards up to 60000 (any integer). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boardScore, MAX_SCORE, MAX_GAME_SCORE, MAX_WEEK_XP } from '../js/cloud.js';

const rules = readFileSync(new URL('../cloud/firestore.rules', import.meta.url), 'utf8');

test('the caps match cloud/firestore.rules', () => {
  assert.match(rules, new RegExp(`kind\\(\\) == 'game' \\? ${MAX_GAME_SCORE} : kind\\(\\) == 'xp' \\? ${MAX_WEEK_XP}`));
  for (const [league, cap] of Object.entries(MAX_SCORE)) assert.match(rules, new RegExp(`'${league}': ${cap}`));
});

test('Arena boards: even, from 10 to the league cap', () => {
  assert.equal(boardScore('daily-2026-10-14-challenger', 121), 120);
  assert.equal(boardScore('week-2026-W42-pro', 5000), 1200);
  assert.equal(boardScore('daily-2026-10-14-explorer', 9999), 2000);
  assert.equal(boardScore('daily-2026-10-14-challenger', 9), 0);
  assert.equal(boardScore('daily-2026-10-14-challenger', 11), 10);
});

test('Ranked game boards: any integer from 10 to 12000, whatever the league', () => {
  assert.equal(boardScore('g_times_sprint-daily-2026-10-14-pro', 1501), 1501);
  assert.equal(boardScore('g_times_sprint-week-2026-W42-challenger', 2500), 2500);
  assert.equal(boardScore('g_rain-daily-2026-10-14-explorer', 20000), 12000);
  assert.equal(boardScore('g_rain-daily-2026-10-14-explorer', 9.4), 0);
});

test('weekly XP boards: any integer from 10 to 60000', () => {
  assert.equal(boardScore('xp-week-2026-W42-challenger', 15), 15);
  assert.equal(boardScore('xp-week-2026-W42-pro', 4321), 4321);
  assert.equal(boardScore('xp-week-2026-W42-explorer', 70000), 60000);
  assert.equal(boardScore('xp-week-2026-W42-explorer', 5), 0);
});

test('unknown boards take nothing', () => {
  assert.equal(boardScore('daily-2026-10-14-nobody', 500), 0);
});
