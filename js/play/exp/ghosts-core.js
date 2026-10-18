/* Ghost Races logic (no DOM): seeded sprint question sets, ghost records (answer and miss times), the
   compact share code, built-in pace characters and ghost position at any moment. Used by ghosts.js and
   test/ghosts.test.mjs. */
import { rng, int, seedOf, b64url } from '../kit.js';

export const VERSION = 1;
export const LENGTHS = [10, 20];

/* ---------- Sprints: each makes one question from a seeded rng ---------- */
const Q = (text, answer, say) => ({ text, answer, say: say || text });
export const SPRINTS = {
  add10: { name: 'Make ten', short: 'Bonds to 10', levels: ['explorer'], gen: r => { const a = int(r, 1, 9); return Q(`${a} + ? = 10`, 10 - a, `${a} plus what makes 10`); } },
  add20: { name: 'Adding to 20', short: 'Sums to 20', levels: ['explorer'], gen: r => { const a = int(r, 2, 10), b = int(r, 1, 10); return Q(`${a} + ${b}`, a + b); } },
  dbl: { name: 'Doubles', short: 'Doubles', levels: ['explorer', 'challenger'], gen: r => { const a = int(r, 2, 25); return Q(`Double ${a}`, a * 2); } },
  comp100: { name: 'Complements to 100', short: '100 minus', levels: ['challenger', 'pro'], gen: r => { const a = int(r, 11, 89); return Q(`100 − ${a}`, 100 - a, `100 minus ${a}`); } },
  x11: { name: 'Times eleven', short: '× 11', levels: ['challenger', 'pro'], gen: (r, lv) => { const a = lv === 'pro' ? int(r, 12, 99) : int(r, 11, 45); return Q(`${a} × 11`, a * 11, `${a} times 11`); } },
  mul21: { name: 'Two digits times one', short: '2-digit × 1', levels: ['challenger', 'pro'], gen: (r, lv) => { const a = int(r, 12, lv === 'pro' ? 99 : 49), b = int(r, 2, 9); return Q(`${a} × ${b}`, a * b, `${a} times ${b}`); } },
  sq5: { name: 'Squares ending in 5', short: '35² and friends', levels: ['pro', 'challenger'], gen: (r, lv) => { const a = 10 * int(r, 1, lv === 'pro' ? 11 : 9) + 5; return Q(`${a}²`, a * a, `${a} squared`); } },
  comp1000: { name: 'Complements to 1000', short: '1000 minus', levels: ['pro'], gen: r => { const a = int(r, 101, 989); return Q(`1000 − ${a}`, 1000 - a, `1000 minus ${a}`); } },
  mixed: { name: 'Mixed sprint', short: 'Mixed', levels: ['explorer', 'challenger', 'pro'], gen: null }
};
const MIX = { explorer: ['add10', 'add20', 'dbl'], challenger: ['comp100', 'x11', 'mul21', 'dbl', 'sq5'], pro: ['comp1000', 'x11', 'mul21', 'sq5', 'comp100'] };
export const sprintsFor = lv => Object.keys(SPRINTS).filter(k => SPRINTS[k].levels.includes(lv));
export const LEVEL_CODES = ['explorer', 'challenger', 'pro'];

/* The question set for a sprint, level, seed and length: identical everywhere for the same inputs */
export function questions(kind, lv, seed, n = 10) {
  const r = rng(seedOf('ghost', `${kind}:${lv}:${seed}`, VERSION));
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const k = kind === 'mixed' ? MIX[lv][out.length % MIX[lv].length] : kind;
    const q = SPRINTS[k].gen(r, lv);
    if (out.length && out[out.length - 1].text === q.text) continue; /* never the same question twice in a row */
    out.push({ ...q, kind: k });
  }
  return out;
}

/* ---------- Ghosts ---------- */
/* A ghost: { v, kind, lv, seed, n, t: [ms at which answer i was correct, cumulative], miss: [[i, ms]], nick: [adj, animal] | null, who } */
export function makeGhost({ kind, lv, seed, n, t, miss = [], nick = null, who = 'you' }) { return { v: VERSION, kind, lv, seed, n, t: t.slice(), miss: miss.map(m => m.slice()), nick, who }; }
export const total = g => g.t[g.t.length - 1] || 0;
export const splits = g => g.t.map((x, i) => x - (i ? g.t[i - 1] : 0));

/* How many questions the ghost has finished at time ms, as a float (2.5 means halfway through question 3) */
export function progressAt(g, ms) {
  if (ms <= 0) return 0;
  for (let i = 0; i < g.t.length; i++) {
    if (ms < g.t[i]) { const s = i ? g.t[i - 1] : 0; return i + (ms - s) / Math.max(1, g.t[i] - s); }
  }
  return g.t.length;
}

/* ---------- Nicknames: picked from fixed lists, never typed ---------- */
export const ADJ = ['Brave', 'Calm', 'Clever', 'Cosmic', 'Curious', 'Daring', 'Gentle', 'Golden', 'Happy', 'Jolly', 'Kind', 'Lucky', 'Mighty', 'Nimble', 'Quiet', 'Rapid', 'Sunny', 'Swift', 'Tidy', 'Witty'];
export const ANIMAL = ['Otter', 'Peacock', 'Tiger', 'Elephant', 'Mongoose', 'Parrot', 'Dolphin', 'Panda', 'Gecko', 'Koala', 'Falcon', 'Turtle', 'Squirrel', 'Owl', 'Rhino', 'Hare', 'Yak', 'Kingfisher', 'Lynx', 'Firefly'];
export const nickName = nick => (nick && ADJ[nick[0]] && ANIMAL[nick[1]] ? `${ADJ[nick[0]]} ${ANIMAL[nick[1]]}` : 'A friend');

/* ---------- Share code ---------- */
/* Plain text before base64url: v.kind.lv.seed.nick.splits.misses, with numbers in base 36 and times in
   hundredths of a second, so 20 questions stay well under 200 characters */
const KINDS = Object.keys(SPRINTS);
/* Limits on a decoded ghost: questions, hundredths of a second per question, misses */
export const MAX_QUESTIONS = 40, MAX_SPLIT = 60000, MAX_MISSES = 200;
const b36 = n => Math.max(0, Math.round(n)).toString(36);
export function encode(g) {
  const sp = splits(g).map(ms => b36(ms / 10)).join(',');
  const miss = g.miss.map(([i, ms]) => `${b36(i)}:${b36(ms / 10)}`).join(',');
  const nick = g.nick ? `${b36(g.nick[0])}-${b36(g.nick[1])}` : '';
  return b64url.enc([b36(g.v), b36(KINDS.indexOf(g.kind)), b36(LEVEL_CODES.indexOf(g.lv)), b36(g.seed), nick, sp, miss].join('.'));
}
export function decode(code) {
  try {
    const [v, k, l, seed, nick, sp, miss = ''] = b64url.dec(String(code)).split('.');
    const kind = KINDS[parseInt(k, 36)], lv = LEVEL_CODES[parseInt(l, 36)];
    if (parseInt(v, 36) !== VERSION || !kind || !lv || !sp) return null;
    /* Each split is 0.01 s to 10 minutes; a hostile link with huge or negative times would keep the race running for ever */
    const hs = sp.split(',').map(x => (/^[0-9a-z]+$/.test(x) ? parseInt(x, 36) : NaN));
    if (!hs.length || hs.length > MAX_QUESTIONS || hs.some(h => !Number.isInteger(h) || h < 1 || h > MAX_SPLIT)) return null;
    let acc = 0; const t = hs.map(h => (acc += h * 10));
    const mp = miss ? miss.split(',') : [];
    if (mp.length > MAX_MISSES) return null;
    const ms = mp.map(p => p.split(':').map(x => (/^[0-9a-z]+$/.test(x) ? parseInt(x, 36) : NaN))).map(([i, m]) => [i, m * 10]);
    if (ms.some(([i, m]) => !(Number.isInteger(i) && i >= 0 && i < t.length) || !(Number.isInteger(m) && m >= 0 && m <= acc))) return null;
    let nk = null;
    if (nick) { const [a, b] = nick.split('-').map(x => parseInt(x, 36)); if (ADJ[a] && ANIMAL[b]) nk = [a, b]; }
    const s = parseInt(seed, 36); if (!Number.isFinite(s)) return null;
    return makeGhost({ kind, lv, seed: s, n: t.length, t, miss: ms, nick: nk, who: 'friend' });
  } catch (e) { return null; }
}

/* ---------- Pace characters (invented, original) ---------- */
/* Base seconds per question for a typical sprint at each level, then a seeded wobble so they feel alive */
export const PACERS = [
  { id: 'tortoise', name: 'Steady Tortoise', blurb: 'Never rushes, never stops.', pace: { explorer: 7, challenger: 6.5, pro: 5.5 }, wobble: 0.08 },
  { id: 'koel', name: 'Singing Koel', blurb: 'Quick bursts, then a little song.', pace: { explorer: 5, challenger: 4.4, pro: 3.6 }, wobble: 0.35 },
  { id: 'comet', name: 'Comet', blurb: 'Blazing. Can you even keep up?', pace: { explorer: 3.2, challenger: 2.7, pro: 2.1 }, wobble: 0.18 }
];
const HARD = { sq5: 1.35, mul21: 1.3, comp1000: 1.25, x11: 1.15, mixed: 1.15, comp100: 1, add20: 1, dbl: 0.9, add10: 0.9 };
export function pacerGhost(id, kind, lv, seed, n) {
  const p = PACERS.find(x => x.id === id) || PACERS[0], r = rng(`pacer:${id}:${kind}:${lv}:${seed}`);
  const base = (p.pace[lv] || p.pace.challenger) * (HARD[kind] || 1) * 1000;
  let acc = 0; const t = [];
  for (let i = 0; i < n; i++) acc += Math.round(base * (1 + (r() * 2 - 1) * p.wobble)), t.push(acc);
  return makeGhost({ kind, lv, seed, n, t, who: p.id });
}

/* Per-question comparison for the replay chart: positive gain means you were faster on that question */
export function compare(you, ghost) {
  const a = splits(you), b = splits(ghost), n = Math.min(a.length, b.length);
  const rows = []; let lead = 0;
  for (let i = 0; i < n; i++) { const gain = b[i] - a[i]; lead += gain; rows.push({ i, you: a[i], ghost: b[i], gain, lead }); }
  return rows;
}
export const fmt = ms => `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
/* When typed digits are judged: correct at once; a wrong answer once as many digits as the answer */
export function judge(typed, answer) {
  if (!typed) return 'typing';
  if (+typed === answer) return 'right';
  return typed.length >= String(answer).length ? 'wrong' : 'typing';
}
export const freshSeed = () => int(Math.random, 1, 36 ** 5 - 1);
export const pickNick = r => [int(r, 0, ADJ.length - 1), int(r, 0, ANIMAL.length - 1)];
