/* Party Mode core: pure logic, no DOM. Players, question generators per level, scoring with a level
   handicap, and the whole game as one pure reducer: reduce(state, action) -> new state.
   Time comes in through actions ({ now }), so the reducer is deterministic and testable. */
import { rng, seedOf, shuffle } from '../kit.js';

/* ---------- Players ---------- */
export const COLORS = ['coral', 'teal', 'sun', 'slate'];
export const SHAPES = ['circle', 'triangle', 'square', 'star'];
export const ADJ = ['Brave', 'Clever', 'Swift', 'Lucky', 'Sunny', 'Mighty', 'Jolly', 'Zippy', 'Cosmic', 'Gentle', 'Bold', 'Sparkly', 'Speedy', 'Wise'];
export const NOUNS = ['Tiger', 'Otter', 'Comet', 'Mango', 'Rocket', 'Panda', 'Falcon', 'Lotus', 'Koala', 'Peacock', 'Dolphin', 'Wizard', 'Elephant', 'Owl'];
export const KEYS = ['q', 'p', 'z', 'm'];
export const LEVELS = ['explorer', 'challenger', 'pro'];
export const LEVEL_NAME = { explorer: 'Explorer', challenger: 'Challenger', pro: 'Pro' };
/* Handicap: everyone gets questions at their own level, more time to answer at gentler levels, and
   points scaled by level, so a 7 year old and a parent can both win. */
export const MULT = { explorer: 1.5, challenger: 1.25, pro: 1 };
export const ANSWER_MS = { explorer: 14000, challenger: 10000, pro: 8000 };
export const OPEN_MS = 20000, STEAL_MS = 7000, SECRET_MS = 30000, FINAL_MS = 25000;
export const BASE = { buzz: 10, steal: 10, stealBonus: 5, estimate: 20, close: 5, relay: 5, relayGoal: 10, trick: 10, final: 10 };
export const playerName = p => `${ADJ[p.adj % ADJ.length]} ${NOUNS[p.noun % NOUNS.length]}`;
export const points = (base, level, handicap = true) => Math.round(base * (handicap ? MULT[level] || 1 : 1));

/* Saved seats from storage: two to four, each with a known name, a color nobody else has and a level.
   Returns null when fewer than two usable seats are left (the caller then uses its defaults). */
export function cleanSeats(seats) {
  if (!Array.isArray(seats)) return null;
  const idx = (v, n, d) => (Number.isInteger(v) && v >= 0 && v < n ? v : d);
  const out = [];
  for (const p of seats) {
    if (out.length >= KEYS.length) break;
    if (!p || typeof p !== 'object') continue;
    const used = out.map(x => x.color), i = out.length;
    const color = COLORS.includes(p.color) && !used.includes(p.color) ? p.color : COLORS.find(c => !used.includes(c));
    out.push({ adj: idx(p.adj, ADJ.length, i % ADJ.length), noun: idx(p.noun, NOUNS.length, i % NOUNS.length), color, level: LEVELS.includes(p.level) ? p.level : 'challenger' });
  }
  return out.length >= 2 ? out : null;
}

/* ---------- Questions ---------- */
const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pk = (r, a) => a[Math.floor(r() * a.length)];
/* Four choices: the answer and three believable near misses, all distinct and non-negative */
export function choicesFor(answer, r) {
  const set = new Set([answer]);
  const cands = [answer + 1, answer - 1, answer + 10, answer - 10, answer + 2, answer - 2, Number(String(answer).split('').reverse().join('')), answer + 11, answer - 9, answer * 2, Math.round(answer / 2), answer + 100, answer - 100];
  for (const c of shuffle(r, cands)) { if (set.size >= 4) break; if (Number.isInteger(c) && c >= 0 && !set.has(c)) set.add(c); }
  let k = 3; while (set.size < 4) { if (!set.has(answer + k)) set.add(answer + k); k++; }
  return shuffle(r, [...set]);
}
const Q = (text, answer, r, say = text, how = '') => ({ text, answer, choices: choicesFor(answer, r), say: say.replace('×', 'times').replace('−', 'minus'), how });

/* Mixed quick questions (buzz race, steal, final) */
export function mixQ(level, r) {
  if (level === 'explorer') {
    const k = ri(r, 0, 3);
    if (k === 0) { const a = ri(r, 2, 10), b = ri(r, 1, 9); return Q(`${a} + ${b}`, a + b, r); }
    if (k === 1) { const a = ri(r, 6, 18), b = ri(r, 1, Math.min(9, a)); return Q(`${a} − ${b}`, a - b, r); }
    if (k === 2) { const a = ri(r, 2, 10); return Q(`Double ${a}`, a * 2, r); }
    const a = ri(r, 1, 9); return Q(`${a} + 10`, a + 10, r);
  }
  if (level === 'challenger') {
    const k = ri(r, 0, 3);
    if (k === 0) { const a = ri(r, 3, 12), b = ri(r, 3, 12); return Q(`${a} × ${b}`, a * b, r); }
    if (k === 1) { const a = ri(r, 21, 79), b = ri(r, 12, 49); return Q(`${a} + ${b}`, a + b, r); }
    if (k === 2) { const a = ri(r, 50, 99), b = ri(r, 11, 49); return Q(`${a} − ${b}`, a - b, r); }
    const b = ri(r, 3, 9), a = b * ri(r, 3, 12); return Q(`${a} ÷ ${b}`, a / b, r);
  }
  const k = ri(r, 0, 4);
  if (k === 0) { const a = ri(r, 13, 49), b = ri(r, 3, 9); return Q(`${a} × ${b}`, a * b, r); }
  if (k === 1) { const a = ri(r, 12, 30); return Q(`${a}²`, a * a, r, `${a} squared`); }
  if (k === 2) { const a = ri(r, 12, 99); return Q(`${a} × 11`, a * 11, r); }
  if (k === 3) { const p = pk(r, [10, 20, 25, 50]), n = pk(r, [40, 60, 80, 120, 160, 240, 320, 360]); return Q(`${p}% of ${n}`, (p * n) / 100, r, `${p} percent of ${n}`); }
  const a = ri(r, 101, 399), b = ri(r, 91, 99); return Q(`${a} − ${b}`, a - b, r);
}
/* Number bonds: explorer to 10, challenger to 100, pro to 1000 (all from 9 and the last from 10) */
export function bondQ(level, r) {
  const T = { explorer: 10, challenger: 100, pro: 1000 }[level] || 100;
  const a = level === 'explorer' ? ri(r, 1, 9) : level === 'challenger' ? ri(r, 11, 89) : ri(r, 101, 899);
  return Q(`${a} + ? = ${T}`, T - a, r, `${a} plus what makes ${T}`);
}
/* The trick showdown: one trick, a version for every level */
export const TRICKS = {
  x11: {
    name: 'Times 11', line: 'Split the digits and put their sum in the middle.',
    demo: ['36 × 11', '3 _ 6', '3 (3+6) 6', '396'],
    gen: (level, r) => {
      if (level === 'explorer') { const a = ri(r, 1, 9); return Q(`${a} × 11`, a * 11, r, `${a} times 11`, 'Write the digit twice.'); }
      if (level === 'challenger') { let a; do a = ri(r, 12, 81); while ((a % 10) + Math.floor(a / 10) > 9); return Q(`${a} × 11`, a * 11, r, `${a} times 11`, 'Split, put the sum in the middle.'); }
      let a; do a = ri(r, 19, 99); while ((a % 10) + Math.floor(a / 10) < 10); return Q(`${a} × 11`, a * 11, r, `${a} times 11`, 'The middle sum carries one.');
    }
  },
  nine: {
    name: 'Add 9, add 99', line: 'Add 10 and take 1 away. For 99, add 100 and take 1.',
    demo: ['47 + 9', '47 + 10 = 57', '57 − 1', '56'],
    gen: (level, r) => {
      if (level === 'explorer') { const a = ri(r, 3, 20); return Q(`${a} + 9`, a + 9, r, `${a} plus 9`, 'Add 10, take 1.'); }
      if (level === 'challenger') { const a = ri(r, 21, 90), b = pk(r, [9, 19, 29, 99]); return Q(`${a} + ${b}`, a + b, r, `${a} plus ${b}`, `Add ${b + 1}, take 1.`); }
      const a = ri(r, 120, 900), b = pk(r, [99, 199, 999, 98]); return Q(`${a} + ${b}`, a + b, r, `${a} plus ${b}`, `Add ${b === 98 ? 100 : b + 1}, take ${b === 98 ? 2 : 1}.`);
    }
  },
  x5: {
    name: 'Times 5', line: 'Times 10 is easy. Times 5 is half of that.',
    demo: ['46 × 5', '46 × 10 = 460', 'half of 460', '230'],
    gen: (level, r) => {
      if (level === 'explorer') { const a = ri(r, 1, 6) * 2; return Q(`${a} × 5`, a * 5, r, `${a} times 5`, `Half of ${a * 10}.`); }
      if (level === 'challenger') { const a = ri(r, 7, 49) * 2; return Q(`${a} × 5`, a * 5, r, `${a} times 5`, `Half of ${a * 10}.`); }
      const a = ri(r, 101, 999); return Q(`${a} × 5`, a * 5, r, `${a} times 5`, `Half of ${a * 10}.`);
    }
  },
  sq5: {
    name: 'Squares ending in 5', line: 'By one more than the one before: multiply the first digit by one more, then write 25.',
    sutra: 'Ekādhikena Pūrveṇa', demo: ['35²', '3 × 4 = 12', 'then 25', '1225'],
    gen: (level, r) => {
      if (level === 'explorer') { const a = ri(r, 1, 5); return Q(`${a} × ${a + 1}`, a * (a + 1), r, `${a} times ${a + 1}`, 'The heart of the trick: a number times one more.'); }
      const a = level === 'challenger' ? ri(r, 1, 9) : ri(r, 10, 19); const n = a * 10 + 5;
      return Q(`${n}²`, n * n, r, `${n} squared`, `${a} × ${a + 1} = ${a * (a + 1)}, then 25.`);
    }
  }
};
export const TRICK_IDS = Object.keys(TRICKS);

/* Estimation: one shared question; closest wins. Every answer is exact and computed. */
export function estimateQ(r) {
  const k = ri(r, 0, 5);
  if (k === 0) { const d = ri(r, 2, 7); return { text: `How many minutes are there in ${d} days?`, answer: d * 1440, unit: 'minutes' }; }
  if (k === 1) { const a = ri(r, 31, 69), b = ri(r, 31, 69); return { text: `${a} × ${b} is about how much?`, answer: a * b, unit: '' }; }
  if (k === 2) { const n = ri(r, 3, 9) * 10; return { text: `Add every number from 1 to ${n}. About how much is that?`, answer: (n * (n + 1)) / 2, unit: '', how: `Pair them up: (1 + ${n}) × ${n / 2}.` }; }
  if (k === 3) { const s = ri(r, 12, 40), a = ri(r, 12, 40); return { text: `How many legs on ${s} spiders and ${a} ants?`, answer: s * 8 + a * 6, unit: 'legs', how: `${s} × 8 + ${a} × 6.` }; }
  if (k === 4) { const h = ri(r, 2, 9); return { text: `How many seconds are there in ${h} hours?`, answer: h * 3600, unit: 'seconds' }; }
  const y = ri(r, 5, 12); return { text: `About how many days old is someone on their ${y}th birthday?`, answer: y * 365 + Math.floor(y / 4), unit: 'days', how: `${y} × 365 plus about one leap day every 4 years.` };
}
/* Who wins an estimation: relative error, softened by level (the handicap). Returns ranked results. */
export const EST_SOFT = { explorer: 2, challenger: 1.5, pro: 1 };
export function judgeEstimate(answer, guesses, players, handicap = true) {
  const res = players.map(p => {
    const g = guesses[p.id];
    if (g == null || !Number.isFinite(g)) return { id: p.id, guess: null, err: Infinity, score: Infinity };
    const err = Math.abs(g - answer) / Math.max(1, Math.abs(answer));
    return { id: p.id, guess: g, err, score: err / (handicap ? EST_SOFT[p.level] : 1) };
  });
  const best = Math.min(...res.map(x => x.score));
  return res.map(x => ({ ...x, win: Number.isFinite(best) && x.score === best, close: x.err <= 0.1 }));
}

/* ---------- Rounds ---------- */
export const ROUND_INFO = {
  buzz: { title: 'Buzz race', blurb: 'Everyone gets their own question. Buzz first, answer right, score.' },
  steal: { title: 'Steal', blurb: 'Your turn, your question. Miss it and the others can buzz to steal.' },
  estimate: { title: 'Estimation showdown', blurb: 'One question for all. Lock in a secret guess. Closest wins.' },
  relay: { title: 'Number bonds relay', blurb: 'Team round! Pass the baton. How many bonds can the family make before the clock runs out?' },
  trick: { title: 'Vedic trick showdown', blurb: 'Learn one trick, then a lightning round using it.' },
  final: { title: 'Double or nothing', blurb: 'Bet some of your points on one last question. Right doubles the bet, wrong loses it.' }
};
export function plan(nPlayers, length = 'full') {
  const q = length === 'quick';
  return [
    { type: 'buzz', n: q ? 3 : 5 },
    { type: 'steal', n: nPlayers * (q ? 1 : 2) },
    { type: 'estimate', n: q ? 1 : 3 },
    { type: 'relay', ms: q ? 45000 : 75000, goal: nPlayers * (q ? 2 : 4) },
    { type: 'trick', n: q ? 3 : 5 },
    { type: 'final', n: 1 }
  ];
}

/* ---------- The game reducer ---------- */
/* players: [{ id, adj, noun, color, level }] */
export function newGame({ players, seed = 1, length = 'full', handicap = true }) {
  return {
    seed, length, handicap, seq: 0,
    players: players.slice(0, KEYS.length).map((p, i) => ({ id: p.id ?? i, adj: p.adj ?? i, noun: p.noun ?? i, color: p.color ?? COLORS[i], level: LEVELS.includes(p.level) ? p.level : 'challenger', score: 0, key: KEYS[i] })),
    rounds: plan(players.length, length), ri: -1, qi: 0, phase: 'lobby',
    trick: TRICK_IDS[Math.floor(rng(seedOf('party-trick', String(seed)))() * TRICK_IDS.length)],
    qs: {}, buzzer: null, locked: [], deadline: 0, turn: 0, guesses: {}, wagers: {}, finals: {}, count: 0, stealing: false,
    event: null, results: null
  };
}
const clone = s => JSON.parse(JSON.stringify(s));
const P = (s, id) => s.players.find(p => p.id === id);
const qrng = (s, id, salt = '') => rng(seedOf('party', `${s.seed}:${s.ri}:${s.qi}:${id}:${salt}`));
export const round = s => s.rounds[s.ri] || null;
function genFor(s, p, salt = '') {
  const r = qrng(s, p.id, salt), t = round(s).type;
  if (t === 'trick') return TRICKS[s.trick].gen(p.level, r);
  if (t === 'relay') return bondQ(p.level, r);
  return mixQ(p.level, r);
}
const award = (s, id, pts) => { const p = P(s, id); p.score = Math.max(0, p.score + pts); };
function startQuestion(s, now) {
  const t = round(s).type;
  s.buzzer = null; s.locked = []; s.stealing = false; s.qs = {}; s.guesses = {}; s.results = null;
  if (t === 'buzz' || t === 'trick') { s.players.forEach(p => { s.qs[p.id] = genFor(s, p); }); s.phase = 'open'; s.deadline = now + OPEN_MS; }
  else if (t === 'steal') { const p = s.players[s.qi % s.players.length]; s.qs[p.id] = genFor(s, p); s.buzzer = p.id; s.phase = 'answer'; s.deadline = now + ANSWER_MS[p.level]; }
  else if (t === 'estimate') { s.shared = estimateQ(qrng(s, 'all')); s.turn = 0; s.phase = 'secret'; s.deadline = now + SECRET_MS; }
  else if (t === 'relay') { s.turn = 0; s.count = 0; s.relayEnd = now + round(s).ms; s.qs = { [s.players[0].id]: genFor(s, s.players[0], 'r0') }; s.phase = 'relay'; s.deadline = s.relayEnd; s.tries = 0; }
  else if (t === 'final') { s.turn = 0; s.wagers = {}; s.finals = {}; s.phase = 'wager'; s.deadline = 0; }
}
function toReveal(s, ev) { s.phase = 'reveal'; s.deadline = 0; if (ev) s.event = ev; }
function wrong(s, id, now, timeout = false) {
  const t = round(s).type;
  s.event = { kind: timeout ? 'timeout' : 'wrong', pid: id };
  if (!s.locked.includes(id)) s.locked.push(id);
  if (t === 'steal') {
    const others = s.players.filter(p => !s.locked.includes(p.id));
    if (others.length) { s.phase = 'stealopen'; s.buzzer = null; s.deadline = now + STEAL_MS; return; }
    return toReveal(s, { kind: 'nobody', pid: id });
  }
  const left = s.players.filter(p => !s.locked.includes(p.id));
  if (!left.length) return toReveal(s, { kind: 'nobody', pid: id });
  s.phase = 'open'; s.buzzer = null; s.deadline = now + Math.max(6000, Math.min(OPEN_MS, s.openLeft || OPEN_MS));
}
function advance(s, now) {
  const r = round(s);
  if (r && r.type !== 'relay' && r.type !== 'final' && s.qi + 1 < r.n) { s.qi++; startQuestion(s, now); s.event = { kind: 'question' }; return; }
  s.ri++; s.qi = 0;
  if (s.ri >= s.rounds.length) { s.phase = 'podium'; s.deadline = 0; s.event = { kind: 'podium' }; return; }
  s.phase = 'intro'; s.deadline = 0; s.event = { kind: 'round', type: round(s).type };
}
function nextSecret(s, now) {
  s.turn++;
  if (s.turn < s.players.length) { s.deadline = now + SECRET_MS; return; }
  const res = judgeEstimate(s.shared.answer, s.guesses, s.players, s.handicap);
  for (const x of res) { const p = P(s, x.id); x.pts = (x.win ? points(BASE.estimate, p.level, s.handicap) : 0) + (x.close ? points(BASE.close, p.level, s.handicap) : 0); award(s, x.id, x.pts); }
  s.results = res; toReveal(s, { kind: 'estimate', winners: res.filter(x => x.win).map(x => x.id) });
}
function finishFinal(s) {
  const res = s.players.map(p => {
    const ok = s.finals[p.id] === true, w = s.wagers[p.id] || 0;
    const pts = ok ? w + points(BASE.final, p.level, s.handicap) : -w;
    award(s, p.id, pts); return { id: p.id, ok, wager: w, pts };
  });
  s.results = res; toReveal(s, { kind: 'final' });
}
export const wagerOptions = score => [...new Set([0, Math.floor(score / 2), score])];

/* Actions: { type: 'start'|'next'|'buzz'|'answer'|'wager'|'tick', now, pid, value } */
export function reduce(state, a) {
  const s = clone(state), now = a.now ?? 0, r = round(s);
  s.seq = (state.seq || 0) + 1;
  switch (a.type) {
    case 'start': if (s.phase !== 'lobby') return state; s.ri = 0; s.qi = 0; s.phase = 'intro'; s.event = { kind: 'round', type: round(s).type }; return s;
    case 'next':
      if (s.phase === 'intro') { startQuestion(s, now); s.event = { kind: 'question' }; return s; }
      if (s.phase === 'reveal') { advance(s, now); return s; }
      return state;
    case 'buzz': {
      const p = P(s, a.pid); if (!p) return state;
      if (s.phase === 'open' && !s.locked.includes(p.id)) {
        s.openLeft = s.deadline - now; s.phase = 'answer'; s.buzzer = p.id; s.deadline = now + ANSWER_MS[p.level]; s.event = { kind: 'buzz', pid: p.id }; return s;
      }
      if (s.phase === 'stealopen' && !s.locked.includes(p.id)) {
        s.qs[p.id] = genFor(s, p, 'steal' + s.locked.length); s.stealing = true;
        s.phase = 'answer'; s.buzzer = p.id; s.deadline = now + ANSWER_MS[p.level]; s.event = { kind: 'buzz', pid: p.id, steal: true }; return s;
      }
      return state;
    }
    case 'answer': {
      if (s.phase === 'answer') {
        const id = s.buzzer, p = P(s, id), q = s.qs[id];
        if (a.pid != null && a.pid !== id) return state;
        if (Number(a.value) === q.answer) {
          const base = r.type === 'trick' ? BASE.trick : r.type === 'steal' ? BASE.steal + (s.stealing ? BASE.stealBonus : 0) : BASE.buzz;
          const pts = points(base, p.level, s.handicap); award(s, id, pts);
          toReveal(s, { kind: 'correct', pid: id, pts, steal: s.stealing }); return s;
        }
        wrong(s, id, now); s.event.value = Number(a.value); return s;
      }
      if (s.phase === 'secret' && r.type === 'estimate') {
        const p = s.players[s.turn]; const v = Number(a.value);
        s.guesses[p.id] = Number.isFinite(v) && String(a.value).trim() !== '' ? v : null; s.event = { kind: 'locked', pid: p.id };
        nextSecret(s, now); return s;
      }
      if (s.phase === 'secret' && r.type === 'final') {
        const p = s.players[s.turn]; s.finals[p.id] = Number(a.value) === s.qs[p.id].answer; s.event = { kind: 'locked', pid: p.id };
        s.turn++;
        if (s.turn < s.players.length) { const n = s.players[s.turn]; s.qs[n.id] = genFor(s, n, 'final'); s.deadline = now + FINAL_MS; return s; }
        finishFinal(s); return s;
      }
      if (s.phase === 'relay') {
        const p = s.players[s.turn], ok = Number(a.value) === s.qs[p.id].answer;
        if (ok) { s.count++; const pts = points(BASE.relay, p.level, s.handicap); award(s, p.id, pts); s.event = { kind: 'relayok', pid: p.id, pts }; }
        else s.event = { kind: 'relayno', pid: p.id, answer: s.qs[p.id].answer };
        s.tries++; s.turn = (s.turn + 1) % s.players.length;
        const n = s.players[s.turn]; s.qs = { [n.id]: genFor(s, n, 'r' + s.tries) };
        return s;
      }
      return state;
    }
    case 'wager': {
      if (s.phase !== 'wager') return state;
      const p = s.players[s.turn]; const opts = wagerOptions(p.score);
      s.wagers[p.id] = opts.includes(Number(a.value)) ? Number(a.value) : 0; s.event = { kind: 'wager', pid: p.id };
      s.turn++;
      if (s.turn >= s.players.length) { s.turn = 0; const f = s.players[0]; s.qs = { [f.id]: genFor(s, f, 'final') }; s.phase = 'secret'; s.deadline = now + FINAL_MS; }
      return s;
    }
    case 'tick': {
      if (!s.deadline || now < s.deadline) return state;
      if (s.phase === 'open') { toReveal(s, { kind: s.locked.length ? 'nobody' : 'timeout-all' }); return s; }
      if (s.phase === 'answer') { wrong(s, s.buzzer, now, true); return s; }
      if (s.phase === 'stealopen') { toReveal(s, { kind: 'nobody' }); return s; }
      if (s.phase === 'secret') return reduce(state, { type: 'answer', value: r.type === 'final' ? NaN : '', now });
      if (s.phase === 'relay') {
        const done = s.count >= r.goal;
        if (done) s.players.forEach(p => award(s, p.id, points(BASE.relayGoal, p.level, s.handicap)));
        s.results = { count: s.count, goal: r.goal, done }; toReveal(s, { kind: 'relay', done }); return s;
      }
      return state;
    }
  }
  return state;
}
/* Ranked players for the podium (ties share a place) */
export function standings(s) {
  const sorted = [...s.players].sort((a, b) => b.score - a.score);
  let place = 0, prev = null;
  return sorted.map((p, i) => { if (p.score !== prev) { place = i + 1; prev = p.score; } return { ...p, place }; });
}
