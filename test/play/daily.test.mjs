/* Daily Number: a year of puzzles at every level is solvable, the solver's paths are valid and as short as
   the tier promises, puzzles depend only on the date and level, and the share grid never spoils numbers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../../js/play/exp/daily-core.js';

const LEVELS = ['explorer', 'challenger', 'pro'];
const days = (from, n) => Array.from({ length: n }, (_, i) => D.addDays(from, i));

test('365 consecutive days at every level: solvable, and the solver path is valid and shortest', () => {
  for (const lv of LEVELS) for (const key of days('2026-10-16', 365)) {
    const P = D.dailyPuzzles(key, lv);
    assert.equal(P.tiers.length, lv === 'explorer' ? 1 : 3);
    for (const tr of P.tiers) {
      const where = `${lv} ${key} ${tr.name} ${tr.nums} -> ${tr.target}`;
      assert.equal(tr.nums.length, 6, where);
      assert.equal(new Set(tr.nums).size, 6, where);
      assert.ok(tr.nums.every(n => Number.isInteger(n) && n > 0), where);
      assert.ok(!tr.nums.includes(tr.target), where);
      assert.ok(D.validSteps(tr.nums, tr.target, tr.solution), where);
      assert.equal(tr.solution.length, tr.need, where);
      assert.ok(tr.solution.every(s => tr.ops.includes(s.op)), where);
      if (lv === 'explorer') assert.ok(tr.solution.every(s => s.op === '+' || s.op === '-'), where);
      /* the board accepts the same moves */
      const slots = tr.nums.slice(), moves = [];
      for (const s of tr.solution) { const i = slots.indexOf(s.a); const j = slots.findIndex((v, k) => v === s.b && k !== i); moves.push([i, s.op, j]); slots[j] = s.r; slots[i] = null; }
      assert.ok(D.replay(tr.nums, moves).includes(tr.target), where);
    }
    if (lv !== 'explorer') { const tg = P.tiers.map(x => x.target); assert.ok(tg[0] < tg[2], `${lv} ${key} easy below hard`); }
  }
});

test('puzzles are deterministic by date and level, and differ across days and levels', () => {
  const a = D.dailyPuzzles('2027-02-14', 'pro'), b = D.dailyPuzzles('2027-02-14', 'pro');
  assert.deepEqual(a, b);
  assert.notDeepEqual(D.dailyPuzzles('2027-02-15', 'pro').tiers, a.tiers);
  assert.notDeepEqual(D.dailyPuzzles('2027-02-14', 'challenger').tiers, a.tiers);
  assert.equal(a.num, 122);
  assert.equal(D.dailyPuzzles('2026-10-16').num, 1);
});

test('no shorter path exists than the tier promises (independent brute force on a sample)', () => {
  const brute = (nums, target, ops, depth) => {
    if (nums.includes(target)) return true; if (!depth) return false;
    for (let i = 0; i < nums.length; i++) for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      for (const o of ops) { const r = D.apply(nums[i], o, nums[j]); if (r == null) continue; const rest = nums.filter((_, k) => k !== i && k !== j); if (brute([...rest, r], target, ops, depth - 1)) return true; }
    }
    return false;
  };
  for (const lv of LEVELS) for (const key of days('2026-12-01', 6)) for (const tr of D.dailyPuzzles(key, lv).tiers) {
    assert.ok(!brute(tr.nums, tr.target, tr.ops, tr.need - 1), `${lv} ${key} ${tr.name} has a shorter path`);
    assert.ok(brute(tr.nums, tr.target, tr.ops, tr.need), `${lv} ${key} ${tr.name} brute force agrees`);
  }
});

test('counting ways: matches a brute force count of expression trees on small sets', () => {
  /* enumerate every tree over index subsets, as strings, to count distinct trees */
  const trees = (nums, ops) => {
    const n = nums.length, memo = new Map();
    const go = S => {
      if (memo.has(S)) return memo.get(S);
      const out = [];
      if ((S & (S - 1)) === 0) { const i = Math.log2(S); out.push([nums[i], `${i}`]); memo.set(S, out); return out; }
      const low = S & -S;
      for (let A = (S - 1) & S; A; A = (A - 1) & S) {
        if (!(A & low)) continue;
        for (const [a, ea] of go(A)) for (const [b, eb] of go(S ^ A)) {
          if (ops.includes('+')) out.push([a + b, `(${ea}+${eb})`]);
          if (ops.includes('x') && a !== 1 && b !== 1) out.push([a * b, `(${ea}x${eb})`]);
          if (ops.includes('-') && a !== b) out.push(a > b ? [a - b, `(${ea}-${eb})`] : [b - a, `(${eb}-${ea})`]);
          if (ops.includes('/')) { if (b !== 1 && a % b === 0) out.push([a / b, `(${ea}/${eb})`]); if (a !== 1 && a !== b && b % a === 0) out.push([b / a, `(${eb}/${ea})`]); }
        }
      }
      memo.set(S, out); return out;
    };
    let all = []; for (let S = 1; S < 1 << n; S++) all = all.concat(go(S));
    return all;
  };
  for (const [nums, target] of [[[2, 3, 5, 7], 17], [[1, 4, 6, 9, 10], 30], [[3, 8, 12, 2], 24]]) {
    const expect = trees(nums, D.ALL_OPS).filter(([v]) => v === target).length;
    assert.equal(D.countWays(nums, target), expect, `${nums} -> ${target}`);
  }
  for (const key of days('2026-10-16', 10)) for (const tr of D.dailyPuzzles(key, 'pro').tiers) assert.ok(D.countWays(tr.nums, tr.target, tr.ops) >= 1);
});

test('moves: positive whole numbers only, results replace the second number', () => {
  assert.equal(D.apply(7, '-', 7), null); assert.equal(D.apply(3, '-', 7), null); assert.equal(D.apply(7, '/', 2), null);
  assert.equal(D.apply(12, '/', 4), 3); assert.equal(D.apply(6, 'x', 7), 42); assert.equal(D.apply(6, '+', 7), 13);
  assert.deepEqual(D.replay([1, 2, 3, 4, 5, 6], [[0, '+', 1], [1, 'x', 2]]), [null, null, 9, 4, 5, 6]);
  assert.throws(() => D.replay([1, 2], [[0, '-', 1]]));
  assert.equal(D.closest([null, 40, 52], 45), 40);
});

test('stars: exact is three, close is two or one, far is none', () => {
  assert.equal(D.stars(100, 100, 'pro'), 3); assert.equal(D.stars(100, 92, 'pro'), 2); assert.equal(D.stars(100, 120, 'pro'), 1); assert.equal(D.stars(100, 130, 'pro'), 0);
  assert.equal(D.stars(15, 16, 'explorer'), 2); assert.equal(D.stars(15, 18, 'explorer'), 1); assert.equal(D.stars(15, 19, 'explorer'), 0);
});

test('streaks count consecutive local days', () => {
  assert.equal(D.streak(['2026-10-14', '2026-10-15', '2026-10-16'], '2026-10-16'), 3);
  assert.equal(D.streak(['2026-10-14', '2026-10-15'], '2026-10-16'), 2);
  assert.equal(D.streak(['2026-10-13', '2026-10-15'], '2026-10-16'), 1);
  assert.equal(D.streak([], '2026-10-16'), 0);
  assert.equal(D.bestStreak(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-05']), 3);
  assert.equal(D.addDays('2027-03-27', 2), '2027-03-29');
  assert.ok(D.validKey('2026-10-16')); assert.ok(!D.validKey('2026-02-30')); assert.ok(!D.validKey('soon'));
});

test('share grid shows operations and stars but never the numbers', () => {
  const P = D.dailyPuzzles('2026-11-03', 'challenger');
  const results = P.tiers.map(tr => ({ stars: 3, ops: tr.solution.map(s => s.op) }));
  const text = D.shareText({ num: P.num, level: 'challenger', results, streakDays: 4 });
  const body = text.split('\n').slice(1).join('\n');
  assert.ok(!/\d/.test(body.replace(/🔥 \d+ day streak/, '')), body);
  assert.match(text, /#19/); assert.match(text, /4 day streak/);
  assert.ok(!text.includes('—'));
});

test('a finished tier pays once per tier and day, only with a star, and never in practice', () => {
  let paid = [];
  const fin = (o) => { const r = D.finishAction({ key: '2026-10-17', tier: 0, official: true, paid, ...o }); paid = r.paid; return r.action; };
  assert.equal(fin({ stars: 0 }), 'daily/finish', 'no stars, no Sparks');
  assert.equal(fin({ stars: 2 }), 'daily/solve');
  assert.equal(fin({ stars: 3 }), 'daily/finish', 'the same tier again (another Mode, a replay) does not pay');
  assert.equal(fin({ stars: 1, tier: 1 }), 'daily/solve', 'another tier pays');
  assert.deepEqual(paid, ['2026-10-17:0', '2026-10-17:1']);
  assert.equal(D.finishAction({ key: '2026-10-17', tier: 0, official: false, stars: 3, paid: [] }).action, 'daily/practice');
  /* yesterday's ids are dropped; a corrupt list is ignored */
  assert.deepEqual(D.finishAction({ key: '2026-10-18', tier: 0, official: true, stars: 3, paid }).paid, ['2026-10-18:0']);
  assert.equal(D.finishAction({ key: '2026-10-18', tier: 0, official: true, stars: 3, paid: 'x' }).action, 'daily/solve');
});

