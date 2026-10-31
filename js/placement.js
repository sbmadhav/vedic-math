/* Placement (openspec placement): a short, untimed climb through the school grades that finds a Player's Placement
   level, the grade where Practice should start, separate from the Mode they chose. Pure: the climb is a state machine
   with no DOM, storage or timers (js/placement-view.js draws it), so every rule is a node test (test/placement.test.mjs).
   - STEPS: the 13 grades K to 12, one Step each. A climb starts at the Mode's first grade and moves up one Step on each
     right answer; a miss stays on the Step with a different Skill; the second miss on a Step, the 12th question or a
     right answer at grade 12 ends it (design decisions 2 and 3).
   - PLACEMENT_POOL: the school Skills each Step draws from (never a Trick), each with a level-2 question whose answer is
     a whole number or one of its choices, so Explorer's three big buttons can always be built (threeChoices).
   - LEVEL_START, skillStart, beltFor and raiseOnly: what a Placement level sets (decisions 6 and 7).
   Built on the Legacy views by the owner's call of 2026-10-31 (design, Builder calls): the module is loaded on demand
   by the view, so a first load pays nothing for it. */
import { MODES } from './fx.js';
import { byId, GRADES } from './skills/index.js';
import { BELTS, TRICKS } from './vedic.js';
import { LEVEL_START, skillStart, gradeNum } from './adapt.js';

export { LEVEL_START, skillStart };

/* The 13 Steps, in GRADES order: 'K', 1, 2, ... 12 (ids as GRADES has them) */
export const STEPS = GRADES.filter(g => g.id !== 'V').map(g => g.id);
export const stepIndex = g => STEPS.findIndex(s => String(s) === String(g));
export const QUESTIONS = 12, MISSES = 2, TRIES = 20;

/* Each Step's Skills (design decision 2, confirmed by test/placement.test.mjs for 200 seeds). At least 2 a Step, so a
   miss gets a different Skill. 3-twostep (a Word problem Skill, whose stories load after the first paint) gave way to
   3-dist (builder call, task 1.2). */
export const PLACEMENT_POOL = {
  K: ['k-count', 'k-next', 'k-add10', 'k-sub10', 'k-compare'],
  1: ['1-add20', '1-missing', '1-tens', '1-doubles'],
  2: ['2-add100', '2-sub100', '2-skip', '2-place'],
  3: ['3-mult', '3-div', '3-multtens', '3-dist'],
  4: ['4-mult2', '4-angles', '4-factors'],
  5: ['5-fracdiv', '5-order', '5-volume'],
  6: ['6-ratio', '6-percent', '6-gcf', '6-integers', '6-onestep'],
  7: ['7-intops', '7-twostep', '7-anglepairs'],
  8: ['8-roots', '8-pyth', '8-multistep', '8-exprules'],
  9: ['9-funceval', '9-seq'],
  10: ['10-triangle', '10-polygon'],
  11: ['11-logs', '11-expeq', '11-remainder', '11-counting'],
  12: ['12-limits', '12-chain', '12-vectors']
};

/* The Step a Mode's climb starts at: its first grade (Explorer K, Challenger 3, Pro 8) */
export const startStep = mode => (MODES[mode] || MODES.challenger).grades[0];

/* A seeded random (the same generator as js/levels.js), for a repeatable climb in tests */
export function rng(seed) {
  let a = 0; for (const c of String(seed)) a = Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (arr, rand) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* The generators draw through Math.random (js/lib.js); a seeded climb lends them its rand for the draw */
const withRand = (rand, fn) => { if (rand === Math.random) return fn(); const real = Math.random; Math.random = rand; try { return fn(); } finally { Math.random = real; } };

/* A question Placement can ask: a whole-number answer that is not negative (so the three choices are plain numbers),
   or a choice question with at least 3 choices and its answer among them */
export const usable = p => !!p && ((p.kind === 'num' && Number.isInteger(p.answer) && p.answer >= 0)
  || (p.kind === 'choice' && Array.isArray(p.choices) && p.choices.length >= 3 && p.choices.includes(p.answer)));

/* One question at a Step: a Skill of the Step (not avoid, the Skill just missed), generated at level 2, the middle of
   the grade, drawn again up to TRIES times until it is usable, then the next Skill. { skill, grade, p } */
export function drawQuestion(step, { avoid = null, rand = Math.random } = {}) {
  const ids = PLACEMENT_POOL[String(step)] || [], order = shuffle(ids.filter(id => id !== avoid), rand);
  if (!order.length) order.push(...ids);
  for (const id of order) {
    const s = byId[id]; if (!s) continue;
    for (let i = 0; i < TRIES; i++) { const p = withRand(rand, () => s.gen(2)); if (usable(p)) return { skill: id, grade: step, p }; }
  }
  const id = order[0]; return { skill: id, grade: step, p: withRand(rand, () => byId[id].gen(2)) };
}

/* ---------- The climb ---------- */
/* A new climb for a Mode. step: the index into STEPS of the current Step; start: where it began; misses: at this Step;
   answered: questions answered so far; rights: steps climbed; highest: the index of the highest Step answered right (-1
   for none); current: { skill, grade, p } on screen, null once done. */
export function placementStart({ mode, rand = Math.random } = {}) {
  const start = stepIndex(startStep(mode));
  return { mode, start, step: start, misses: 0, answered: 0, rights: 0, highest: -1, done: false, rand, current: drawQuestion(STEPS[start], { rand }) };
}
/* One answer. Returns a new state and leaves the old one as it was. A right answer climbs one Step (and clears the
   misses there); a miss stays and the next question comes from a different Skill; the second miss on a Step, the 12th
   question or a right answer at grade 12 ends the climb (design decision 3). */
export function placementAnswer(prev, ok) {
  if (!prev || prev.done) return prev;
  const st = { ...prev, answered: prev.answered + 1 };
  if (ok) { st.rights++; st.highest = Math.max(st.highest, st.step); st.misses = 0; st.step++; } else st.misses++;
  st.done = st.misses >= MISSES || st.answered >= QUESTIONS || st.step >= STEPS.length;
  st.current = st.done ? null : drawQuestion(STEPS[st.step], { avoid: ok ? null : prev.current && prev.current.skill, rand: st.rand });
  return st;
}
/* The result: the Placement level (the highest Step answered right, else the Step below the start, and K for a climb
   that started at K) as a grade string, and the steps climbed (the right answers) */
export function placementResult(st) {
  const i = st.highest >= 0 ? st.highest : Math.max(0, st.start - 1);
  return { grade: String(STEPS[i]), steps: st.rights };
}
/* "Step 3": the Step the Player is on, counted from the first question */
export const stepNumber = st => st.rights + 1;

/* ---------- Explorer's three choices (design decision 4) ---------- */
const swapped = n => Number(String(n).split('').reverse().join(''));
/* Three choices as strings: for a whole-number answer, the answer and 2 distinct nearby numbers that are not negative
   (from answer plus or minus 1, 2 and 10, and its digits swapped), in ascending order; for a choice question, the
   answer and 2 of its other choices in their original order */
export function threeChoices(p, rand = Math.random) {
  if (p.kind === 'choice') {
    const keep = new Set(shuffle(p.choices.filter(c => c !== p.answer), rand).slice(0, 2));
    return p.choices.filter(c => c === p.answer || keep.has(c)).map(String);
  }
  const a = p.answer;
  const near = [...new Set([a + 1, a - 1, a + 2, a - 2, a + 10, a - 10, swapped(a)].filter(v => Number.isInteger(v) && v >= 0 && v !== a))];
  return [a, ...shuffle(near, rand).slice(0, 2)].sort((x, y) => x - y).map(String);
}
/* The question as Explorer answers it: three big buttons */
export const asChoice = (p, rand = Math.random) => (p.kind === 'choice' && p.choices.length === 3 ? p : { ...p, kind: 'choice', choices: threeChoices(p, rand), answer: String(p.answer) });

/* ---------- What the Placement level sets (design decisions 6 and 7) ---------- */
/* Bolt's start Belt: the first Belt, in Belt order, with a Trick at the level's grade or above (black when none is) */
export function beltFor(level) {
  const L = gradeNum(level), gradeOfTrick = id => (TRICKS.find(t => t.id === id) || {}).grade || 0;
  return (BELTS.find(b => b.tricks.some(t => gradeOfTrick(t) >= L)) || BELTS[BELTS.length - 1]).id;
}
/* The later of two Belts in Belt order (placedBelt only ever moves forward) */
export function forwardBelt(current, next) {
  const at = id => BELTS.findIndex(b => b.id === id);
  return at(next) > at(current) ? next : (at(current) >= 0 ? current : next);
}
/* The grades one below, at and one above the level, within K to 12: the Skill map's "Suggested for you" */
export function suggestedGrades(level) {
  const i = stepIndex(level); if (i < 0) return [];
  return STEPS.slice(Math.max(0, i - 1), Math.min(STEPS.length, i + 2));
}
/* The grade a Skill Rating key belongs to: the Skill's grade, or a Trick's grade (Tricks are 'skill:v-<trick>') */
function gradeOfKey(k) {
  const id = k.slice('skill:'.length), s = byId[id];
  if (!s) return null;
  return s.trick ? (TRICKS.find(t => t.id === s.trick) || {}).grade : s.grade;
}
/* Raise-only: a copy of a progress record where each saved game or Arena Rating below LEVEL_START[level], and each
   saved Skill Rating below skillStart(its grade, level), is raised to it. Nothing is lowered and nothing else changes;
   the record itself is returned when nothing moved. */
export function raiseOnly(record, level) {
  const ratings = (record && record.ratings) || {}, out = { ...ratings }; let changed = false;
  for (const [k, v] of Object.entries(ratings)) {
    let want = 0;
    if (/^(game|arena):/.test(k)) want = LEVEL_START[String(level)] || 0;
    else if (k.startsWith('skill:')) { const g = gradeOfKey(k); if (g !== null && g !== undefined) want = skillStart(g, level); }
    if (want > (Number(v) || 0)) { out[k] = want; changed = true; }
  }
  return changed ? { ...record, ratings: out } : record;
}
