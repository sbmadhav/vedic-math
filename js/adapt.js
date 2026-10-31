/* Adaptive difficulty for the games.
   Every game has one difficulty dial from 1 (a first counting game) to 20 (hard enough for strong adults).
   A right answer turns it up, a miss turns it down, so each player settles where they get about 3 in 4 right.
   Points are weighted by difficulty, so scores compare fairly across players working at different levels.
   The dial each player reaches is saved per game as their rating and becomes their next starting point. */
import * as store from './store.js';
/* The dial's range, pointsAt and levelFor moved to shared/ (openspec change react-typescript, task 3.1) */
import { DMIN, DMAX, pointsAt } from '../shared/src/scoring.ts';
/* What a Placement level sets (openspec placement, ADR 0007): where Practice starts with no Rating yet */
import { LEVEL_START, skillStart, skillGrade } from '../shared/src/placement-level.ts';

export { DMIN, DMAX, pointsAt } from '../shared/src/scoring.ts';
export { levelFor } from '../shared/src/scoring.ts';
/* Where a first-time player starts, by play mode */
export const START = { explorer: 1, challenger: 5, pro: 9 };
/* Level n (1 to 72) starts at this difficulty */
export const levelStart = (n, perGame = 72) => Math.min(DMAX, 1 + Math.round(((n - 1) * (DMAX - 1)) / (perGame - 1)));
export const levelForDifficulty = (d, perGame = 72) => 1 + Math.round(((Math.max(DMIN, Math.min(DMAX, d)) - 1) * (perGame - 1)) / (DMAX - 1));

/* The Placement level (openspec placement, ADR 0007): where Practice starts for a Player who has a Placement level and
   no Rating yet (shared/src/placement-level.ts: LEVEL_START is anchored so each Mode's first grade gives that Mode's
   START, so a Player placed at their Mode's start gets today's behavior). Only Practice callers pass { practice: true };
   Ranked rounds (the daily Arena, Ranked game rounds) keep the Mode's start, so the Placement level never reaches a Board. */
export { LEVEL_START, skillStart } from '../shared/src/placement-level.ts';
const placed = () => { const p = store.placement(); return p ? p.grade : null; };

/* Ratings (GLOSSARY.md): one 1 to 20 number per Player for each game, the Arena in each League and each Skill,
   kept with the rest of progress on this device. key is the full key: 'game:<id>', 'arena:<league>' or 'skill:<id>'.
   A Player with no Rating yet starts at their Mode's start (fallback, when given, replaces that start); in Practice
   (practice: true) a Player with a Placement level starts at the level's start instead. */
export const rating = (key, mode, fallback = 0, { practice = false } = {}) =>
  store.rating(key) || fallback || (practice && placed() ? LEVEL_START[placed()] : 0) || START[mode] || START.challenger;

/* A Skill Rating for a Player who practiced the Skill before Skill Ratings existed: the middle of the band for
   their mastery level (js/store.js level), so their questions stay at the level they had */
export const ratingFromLevel = lv => ({ 1: 4, 2: 10, 3: 17 })[lv] || 4;
/* A Player's Rating for a Skill: saved, else from their mastery level if they have started it, else (in Practice, with a
   Placement level) where the level puts the Skill's grade, else their Mode's start */
export const skillRating = (id, mode, { practice = false } = {}) => {
  const band = store.started(id) ? ratingFromLevel(store.level(id)) : 0, g = practice && placed() ? skillGrade(id) : null;
  return rating('skill:' + id, mode, band || (g !== null ? skillStart(g, placed()) : 0));
};

export class Dial {
  constructor(start, { floor = DMIN, ceil = DMAX } = {}) {
    this.floor = Math.max(DMIN, floor); this.ceil = Math.min(DMAX, ceil);
    this.d = this.clamp(start); this.peak = this.d; this.n = 0; this.right = 0; this.streak = 0; this.points = 0;
    this.seen = new Set(); this.history = [];
  }
  clamp(v) { return Math.max(this.floor, Math.min(this.ceil, v)); }
  /* Current whole-number level for generators */
  get lv() { return Math.round(this.d); }
  /* Record an answer. Returns the points earned (0 for a miss). */
  hit(ok) {
    const before = this.lv, pts = ok ? pointsAt(before) : 0;
    this.n++; this.history.push(before);
    if (ok) {
      this.right++; this.streak++; this.points += pts;
      // Climb fast while finding the right level (first five answers), then by streak
      this.d = this.clamp(this.d + (this.n <= 5 ? 1.5 : this.streak >= 3 ? 1 : 0.6));
    } else {
      this.streak = 0;
      this.d = this.clamp(this.d - (this.n <= 5 ? 2 : 1.4));
    }
    this.peak = Math.max(this.peak, this.d);
    return pts;
  }
  /* Draw a question that has not appeared yet this round: gen() returns [key, question]. */
  fresh(gen, tries = 40) {
    let last;
    for (let i = 0; i < tries; i++) { last = gen(); if (!this.seen.has(last[0])) { this.seen.add(last[0]); return last[1]; } }
    return last[1];
  }
  /* Trend arrow for the UI */
  get trend() { const h = this.history; return h.length < 2 ? 0 : Math.sign(this.lv - h[h.length - 1]); }
  /* The level the player held over the round, weighted toward the end */
  settled() {
    if (!this.history.length) return this.d;
    let w = 0, s = 0; this.history.concat(this.lv).forEach((v, i) => { const k = 1 + i; w += k; s += v * k; });
    return Math.round((s / w) * 10) / 10;
  }
}

/* Save the round's settled level as the Player's new Rating under key (a moving average, so one bad round does not
   erase progress). A round with fewer than 4 answers changes nothing. */
export function saveRating(key, dial) {
  if (dial.n < 4) return store.rating(key);
  const prev = store.rating(key), now = dial.settled();
  const next = prev ? Math.round((prev * 0.4 + now * 0.6) * 10) / 10 : now;
  store.setRating(key, next);
  return next;
}
