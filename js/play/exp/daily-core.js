/* Daily Number logic (no DOM): puzzle generation seeded by the local date, the rules of a move, the
   exhaustive solver (subset dynamic programming over every way to combine the numbers), stars and the
   spoiler-free share grid. Imported by daily.js and by test/daily.test.mjs. */
import { rng, int, shuffle, seedOf, dayNumber } from '../kit.js';

export const VERSION = 1;
export const ALL_OPS = ['+', '-', 'x', '/'];
export const OP_SIGN = { '+': '+', '-': '−', 'x': '×', '/': '÷' };
export const OP_NAME = { '+': 'plus', '-': 'minus', 'x': 'times', '/': 'divided by' };
export const OP_EMOJI = { '+': '➕', '-': '➖', 'x': '✖️', '/': '➗' };
/* Intermediate results above this are never needed for these targets; the solver ignores them */
export const CAP = 20000;

/* One move: a op b. Only positive whole numbers are allowed, so the result is null otherwise. */
export function apply(a, op, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return null;
  if (op === '+') return a + b;
  if (op === 'x') return a * b;
  if (op === '-') return a > b ? a - b : null;
  if (op === '/') return a % b === 0 ? a / b : null;
  return null;
}
/* Why a move is not allowed, in friendly words */
export function whyNot(a, op, b) {
  if (op === '-' && a <= b) return a === b ? `${a} − ${b} is zero. Every number here stays above zero.` : `${a} − ${b} would go below zero. Try the bigger number first.`;
  if (op === '/') return b > a ? `${a} ÷ ${b} is less than one. Try the bigger number first.` : `${a} ÷ ${b} is not a whole number.`;
  return 'That move is not allowed.';
}

/* ---------- Board state: the numbers plus the moves made so far ---------- */
/* A move is [i, op, j]: slots i and j combine, the result goes to slot j and slot i empties (like Digits) */
export function replay(nums, moves) {
  const slots = nums.slice();
  for (const [i, op, j] of moves) {
    const r = slots[i] != null && slots[j] != null && i !== j ? apply(slots[i], op, slots[j]) : null;
    if (r == null) throw new Error(`bad move ${slots[i]} ${op} ${slots[j]}`);
    slots[j] = r; slots[i] = null;
  }
  return slots;
}
export const closest = (slots, target) => slots.filter(v => v != null).reduce((best, v) => (best == null || Math.abs(v - target) < Math.abs(best - target) ? v : best), null);

/* ---------- Stars ---------- */
export const TOL = { explorer: [1, 3], challenger: [5, 15], pro: [10, 25] };
export function stars(target, value, lv = 'challenger') {
  if (value == null) return 0;
  const d = Math.abs(target - value), [two, one] = TOL[lv] || TOL.challenger;
  return d === 0 ? 3 : d <= two ? 2 : d <= one ? 1 : 0;
}

/* ---------- The solver ---------- */
/* Elegance: fewer moves first, then gentler operations and smaller in-between numbers */
const PENALTY = { '+': 1, 'x': 1.2, '-': 1.5, '/': 2.5 };
const popcount = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

/* Explores every way to combine the numbers. Returns tables[mask] = Map(value -> node), where a node is
   { w: number of distinct expression trees, s: elegance score, m: biggest number along the way,
     A, a, B, b, op } (A and B are the sub-masks combined; leaves have op ''). Options:
   maxSize: only subsets up to this many numbers; only: for full-size subsets keep just this value. */
export function explore(nums, ops = ALL_OPS, { maxSize = nums.length, only = null, cap = CAP } = {}) {
  const n = nums.length, full = (1 << n) - 1, T = new Array(full + 1);
  const has = Object.fromEntries(ALL_OPS.map(o => [o, ops.includes(o)]));
  const bySize = Array.from({ length: n + 1 }, () => []);
  for (let m = 1; m <= full; m++) bySize[popcount(m)].push(m);
  for (let i = 0; i < n; i++) T[1 << i] = new Map([[nums[i], { w: 1, s: 0, m: nums[i], A: 0, a: 0, B: 0, b: 0, op: '' }]]);
  for (let k = 2; k <= Math.min(maxSize, n); k++) {
    for (const S of bySize[k]) {
      const out = new Map(), keep = only != null && k === n ? only : null;
      const low = S & -S;
      /* every split of S into two non-empty halves, counted once (A holds the lowest number) */
      for (let A = (S - 1) & S; A; A = (A - 1) & S) {
        if (!(A & low)) continue;
        const B = S ^ A, TA = T[A], TB = T[B];
        if (!TA || !TB) continue;
        for (const [a, na] of TA) for (const [b, nb] of TB) {
          const big = Math.max(a, b), w = na.w * nb.w, base = na.s + nb.s, mm = Math.max(na.m, nb.m);
          const add = (v, op, x, y, X, Y) => {
            if (v > cap || (keep != null && v !== keep)) return;
            const s = base + PENALTY[op], cur = out.get(v), m = Math.max(mm, v);
            if (!cur) out.set(v, { w, s, m, A: X, a: x, B: Y, b: y, op });
            else { cur.w += w; if (s < cur.s - 1e-9 || (Math.abs(s - cur.s) < 1e-9 && m < cur.m)) Object.assign(cur, { s, m, A: X, a: x, B: Y, b: y, op }); }
          };
          if (has['+']) add(a + b, '+', big, Math.min(a, b), a >= b ? A : B, a >= b ? B : A);
          if (has.x && a !== 1 && b !== 1) add(a * b, 'x', big, Math.min(a, b), a >= b ? A : B, a >= b ? B : A);
          if (has['-']) { if (a > b) add(a - b, '-', a, b, A, B); else if (b > a) add(b - a, '-', b, a, B, A); }
          if (has['/']) {
            if (b !== 1 && a % b === 0) add(a / b, '/', a, b, A, B);
            if (a !== 1 && a !== b && b % a === 0) add(b / a, '/', b, a, B, A);
          }
        }
      }
      T[S] = out;
    }
  }
  return T;
}

/* The moves of the node for value v in subset S, in the order they are played: [{ a, op, b, r }] */
function steps(T, S, v, out = []) {
  const node = T[S].get(v);
  if (!node.op) return out;
  steps(T, node.A, node.a, out); steps(T, node.B, node.b, out);
  out.push({ a: node.a, op: node.op, b: node.b, r: v });
  return out;
}

/* The shortest, most elegant way to reach target, searching subsets from small to large so it stops as
   soon as the target appears. Returns { steps, size } or null. */
export function solve(nums, target, ops = ALL_OPS) {
  if (nums.includes(target)) return { steps: [], size: 1 };
  for (let k = 2; k <= nums.length; k++) {
    const T = explore(nums, ops, { maxSize: k, only: target });
    let best = null, bestS = 0;
    for (let S = 1; S < T.length; S++) {
      if (popcount(S) !== k || !T[S] || !T[S].has(target)) continue;
      const nd = T[S].get(target);
      if (!best || nd.s < best.s - 1e-9 || (Math.abs(nd.s - best.s) < 1e-9 && nd.m < best.m)) { best = nd; bestS = S; }
    }
    if (best) return { steps: steps(T, bestS, target), size: k };
  }
  return null;
}

/* How many distinct expression trees reach target (any number of the numbers used, each at most once).
   Multiplying or dividing by 1 is not counted as a new way. */
export function countWays(nums, target, ops = ALL_OPS) {
  const T = explore(nums, ops, { only: target });
  let w = 0;
  for (let S = 1; S < T.length; S++) if (T[S] && T[S].has(target)) w += T[S].get(target).w;
  return w;
}

/* Checks a list of steps against the numbers: each step uses numbers still on the board */
export function validSteps(nums, target, list) {
  const pool = nums.slice();
  if (!list.length) return pool.includes(target);
  for (const { a, op, b, r } of list) {
    const ia = pool.indexOf(a); if (ia < 0) return false; pool.splice(ia, 1);
    const ib = pool.indexOf(b); if (ib < 0) return false; pool.splice(ib, 1);
    if (apply(a, op, b) !== r) return false;
    pool.push(r);
  }
  return list[list.length - 1].r === target;
}

/* ---------- Puzzle generation ---------- */
/* Each tier: how to draw six numbers, the target range and exactly how many moves the shortest path takes */
const TIERS = {
  explorer: [
    { name: 'Today', ops: ['+', '-'], draw: r => distinct(r, 6, () => int(r, 1, 9)), range: [10, 20], need: 2 }
  ],
  challenger: [
    { name: 'Easy', ops: ALL_OPS, draw: r => distinct(r, 6, () => int(r, 1, 10)), range: [20, 60], need: 2 },
    { name: 'Medium', ops: ALL_OPS, draw: r => distinct(r, 6, i => (i < 5 ? int(r, 1, 10) : int(r, 11, 15))), range: [60, 150], need: 3 },
    { name: 'Hard', ops: ALL_OPS, draw: r => distinct(r, 6, i => (i < 4 ? int(r, 2, 10) : int(r, 11, 20))), range: [120, 300], need: 4 }
  ],
  pro: [
    { name: 'Easy', ops: ALL_OPS, draw: r => distinct(r, 6, i => (i < 5 ? int(r, 1, 11) : int(r, 12, 20))), range: [40, 120], need: 2 },
    { name: 'Medium', ops: ALL_OPS, draw: r => distinct(r, 6, i => (i < 4 ? int(r, 2, 12) : int(r, 13, 25))), range: [150, 350], need: 3 },
    { name: 'Hard', ops: ALL_OPS, draw: r => distinct(r, 6, i => (i < 3 ? int(r, 2, 11) : i < 5 ? int(r, 12, 25) : int(r, 15, 30))), range: [300, 500], need: 4 }
  ]
};
export const TIER_COUNT = lv => (TIERS[lv] || TIERS.challenger).length;
function distinct(r, n, f) {
  const out = [];
  for (let guard = 0; out.length < n && guard < 500; guard++) { const v = f(out.length); if (!out.includes(v)) out.push(v); }
  return out.sort((a, b) => a - b);
}

/* The smallest number of moves for every value reachable with at most `moves` moves */
export function minMoves(nums, ops, moves) {
  const T = explore(nums, ops, { maxSize: moves + 1 }), best = new Map();
  for (let S = 1; S < T.length; S++) {
    if (!T[S]) continue;
    const k = popcount(S) - 1;
    for (const v of T[S].keys()) if (!best.has(v) || best.get(v) > k) best.set(v, k);
  }
  return best;
}

function makeTier(r, tier, lv) {
  for (let tries = 0; tries < 200; tries++) {
    const nums = tier.draw(r);
    const best = minMoves(nums, tier.ops, tier.need);
    const pool = [...best].filter(([v, k]) => k === tier.need && v >= tier.range[0] && v <= tier.range[1] && v % 10 !== 0).map(([v]) => v).sort((a, b) => a - b);
    if (!pool.length) continue;
    const target = pool[Math.floor(r() * pool.length)];
    return { name: tier.name, ops: tier.ops, nums: shuffle(r, nums), target, need: tier.need, solution: solve(nums, target, tier.ops).steps };
  }
  throw new Error(`no ${lv} ${tier.name} puzzle`);
}

/* The day's puzzles for a local date key (YYYY-MM-DD) and level. Same date and level, same puzzles. */
export function dailyPuzzles(key, lv = 'challenger') {
  const L = TIERS[lv] ? lv : 'challenger';
  const r = rng(seedOf('daily', `${key}:${L}`, VERSION));
  return { key, num: dayNumber(key), level: L, tiers: TIERS[L].map(tier => makeTier(r, tier, L)) };
}

/* ---------- Dates, streaks and sharing ---------- */
export const addDays = (key, n) => { const d = new Date(key + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const validKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k) && !Number.isNaN(Date.parse(k + 'T12:00:00')) && addDays(k, 0) === k;
/* Current streak: consecutive days played up to today (or up to yesterday, if today is not played yet) */
export function streak(playedKeys, today) {
  const set = new Set(playedKeys);
  let d = set.has(today) ? today : addDays(today, -1), n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
export function bestStreak(playedKeys) {
  const keys = [...new Set(playedKeys)].sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) { run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  return best;
}
export const LEVEL_NAME = { explorer: 'Explorer', challenger: 'Challenger', pro: 'Pro' };
/* Spoiler-free share text: the operations used and the stars, never the numbers */
export function shareText({ num, level, results, streakDays = 0, practice = false, warmup = false }) {
  const lines = [`Vedic Math Daily ${warmup ? 'warm-up' : '#' + num} · ${LEVEL_NAME[level] || level}${practice ? ' (practice)' : ''}`];
  const dot = ['🟢', '🟡', '🔴'];
  results.forEach((res, i) => {
    const ops = res && res.ops && res.ops.length ? res.ops.map(o => OP_EMOJI[o]).join('') : '⬜';
    const st = res ? '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars) : '☆☆☆';
    lines.push(`${results.length > 1 ? dot[i] + ' ' : ''}${ops} ${st}`);
  });
  if (streakDays > 1 && !practice) lines.push(`🔥 ${streakDays} day streak`);
  return lines.join('\n');
}

/* ---------- Saved progress and rewards ---------- */
/* Which fixed action a finished tier reports (js/app.js turns 'daily/solve' into Sparks). Today's puzzle pays
   once per tier and day, and only for at least one star, whatever the Mode; paid holds today's "<day>:<tier>" ids. */
export function finishAction({ official, stars, key, tier, paid = [] }) {
  if (!official) return { action: 'daily/practice', paid };
  const id = `${key}:${tier}`, today = (Array.isArray(paid) ? paid : []).filter(x => typeof x === 'string' && x.startsWith(key + ':'));
  if (stars >= 1 && !today.includes(id)) return { action: 'daily/solve', paid: [...today, id] };
  return { action: 'daily/finish', paid: today };
}
