/* Placement (openspec placement): a short, untimed climb through the school grades that finds a Player's Placement
   level, the grade where Practice should start, separate from the Mode they chose. Pure: the climb is a state machine
   with no DOM, storage or timers (js/placement-view.js draws it), so every rule is a test (placement.test.ts).
   - STEPS (placement-level.ts): the 13 grades K to 12, one Step each. A climb starts at the Mode's first grade and moves
     up one Step on each right answer; a miss stays on the Step with a different Skill; the second miss on a Step, the
     12th question or a right answer at grade 12 ends it (design decisions 2 and 3).
   - PLACEMENT_POOL: the school Skills each Step draws from (never a Trick), each with a level-2 question whose answer is
     a whole number or one of its choices, so Explorer's three big buttons can always be built (threeChoices).
   - raiseOnly: what finishing a Placement does to saved Ratings (decision 7); the tables are placement-level.ts.
   Loaded only when a Placement runs (the Legacy views reach it through js/placement.js), so a first load pays nothing
   for it. Built on the Legacy views by the owner's call of 2026-10-31 (design, Builder calls). */
import { byId } from './skills/index.ts';
import type { Question, Skill } from './question.ts';
import { STEPS, stepIndex, LEVEL_START, skillStart, skillGrade, type Grade } from './placement-level.ts';

export * from './placement-level.ts';

export type Mode = 'explorer' | 'challenger' | 'pro';
export const QUESTIONS = 12, MISSES = 2, TRIES = 20;

/* Each Step's Skills (design decision 2, confirmed by placement.test.ts for 200 seeds). At least 2 a Step, so a miss
   gets a different Skill. 3-twostep (a Word problem Skill, whose stories load after the first paint) gave way to 3-dist
   (builder call, task 1.2). */
export const PLACEMENT_POOL: Record<string, string[]> = {
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

/* The Step a Mode's climb starts at: its first grade (js/fx.js MODES[mode].grades[0]; test/placement.test.mjs checks
   they agree): Explorer K, Challenger 3, Pro 8 */
export const START_STEP: Record<Mode, Grade> = { explorer: 'K', challenger: 3, pro: 8 };
export const startStep = (mode: string): Grade => START_STEP[mode as Mode] ?? START_STEP.challenger;

/* A seeded random (the same generator as questions.ts mulberry32), for a repeatable climb in tests */
export function rng(seed: string | number): () => number {
  let a = 2166136261; for (const c of String(seed)) a = Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = <T>(arr: readonly T[], rand: () => number): T[] => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j] as T, a[i] as T]; } return a; };
/* The generators draw through Math.random (lib.ts); a seeded climb lends them its rand for the draw */
const withRand = <T>(rand: () => number, fn: () => T): T => { if (rand === Math.random) return fn(); const real = Math.random; Math.random = rand; try { return fn(); } finally { Math.random = real; } };

export type NumQuestion = Question & { kind: 'num'; answer: number };
export type ChoiceQuestion = Question & { kind: 'choice'; choices: (string | number)[]; answer: string | number };
export const isNumQ = (p: Question): p is NumQuestion => p.kind === 'num' && typeof p.answer === 'number';
export const isChoiceQ = (p: Question): p is ChoiceQuestion => p.kind === 'choice' && Array.isArray(p.choices) && (typeof p.answer === 'string' || typeof p.answer === 'number');
/* A question Placement can ask: a whole-number answer that is not negative (so the three choices are plain numbers),
   or a choice question with at least 3 choices and its answer among them */
export const usable = (p: Question | null | undefined): boolean => !!p && ((isNumQ(p) && Number.isInteger(p.answer) && p.answer >= 0)
  || (isChoiceQ(p) && p.choices.length >= 3 && p.choices.includes(p.answer)));

/* One question of the climb: the Skill it came from, its grade and the question */
export interface Drawn { skill: string; grade: Grade; p: Question }
/* One question at a Step: a Skill of the Step (not avoid, the Skill just missed), generated at level 2, the middle of
   the grade, drawn again up to TRIES times until it is usable, then the next Skill */
export function drawQuestion(step: Grade, { avoid = null, rand = Math.random }: { avoid?: string | null; rand?: () => number } = {}): Drawn {
  const ids = PLACEMENT_POOL[String(step)] ?? [], order = shuffle(ids.filter(id => id !== avoid), rand);
  if (!order.length) order.push(...ids);
  for (const id of order) {
    const s: Skill | undefined = byId[id]; if (!s) continue;
    for (let i = 0; i < TRIES; i++) { const p = withRand(rand, () => s.gen(2)); if (usable(p)) return { skill: id, grade: step, p }; }
  }
  const id = order[0] as string, s = byId[id] as Skill;
  return { skill: id, grade: step, p: withRand(rand, () => s.gen(2)) };
}

/* ---------- The climb ---------- */
/* step: the index into STEPS of the current Step; start: where it began; misses: at this Step; answered: questions
   answered so far; rights: steps climbed; highest: the index of the highest Step answered right (-1 for none); current:
   the question on screen, null once done */
export interface Climb { mode: string; start: number; step: number; misses: number; answered: number; rights: number; highest: number; done: boolean; rand: () => number; current: Drawn | null }
export interface PlacementResult { grade: string; steps: number }

export function placementStart({ mode, rand = Math.random }: { mode: string; rand?: () => number }): Climb {
  const start = stepIndex(startStep(mode));
  return { mode, start, step: start, misses: 0, answered: 0, rights: 0, highest: -1, done: false, rand, current: drawQuestion(STEPS[start] as Grade, { rand }) };
}
/* One answer. Returns a new state and leaves the old one as it was. A right answer climbs one Step (and clears the
   misses there); a miss stays and the next question comes from a different Skill; the second miss on a Step, the 12th
   question or a right answer at grade 12 ends the climb (design decision 3). */
export function placementAnswer(prev: Climb, ok: boolean): Climb {
  if (prev.done) return prev;
  const st: Climb = { ...prev, answered: prev.answered + 1 };
  if (ok) { st.rights++; st.highest = Math.max(st.highest, st.step); st.misses = 0; st.step++; } else st.misses++;
  st.done = st.misses >= MISSES || st.answered >= QUESTIONS || st.step >= STEPS.length;
  st.current = st.done ? null : drawQuestion(STEPS[st.step] as Grade, { avoid: ok ? null : prev.current?.skill ?? null, rand: st.rand });
  return st;
}
/* The result: the Placement level (the highest Step answered right, else the Step below the start, and K for a climb
   that started at K) as a grade string, and the steps climbed (the right answers) */
export function placementResult(st: Climb): PlacementResult {
  const i = st.highest >= 0 ? st.highest : Math.max(0, st.start - 1);
  return { grade: String(STEPS[i]), steps: st.rights };
}
/* "Step 3": the Step the Player is on, counted from the first question */
export const stepNumber = (st: Climb): number => st.rights + 1;

/* ---------- Explorer's three choices (design decision 4) ---------- */
const swapped = (n: number): number => Number(String(n).split('').reverse().join(''));
/* Three choices as strings: for a whole-number answer, the answer and 2 distinct nearby numbers that are not negative
   (from answer plus or minus 1, 2 and 10, and its digits swapped), in ascending order; for a choice question, the
   answer and 2 of its other choices in their original order */
export function threeChoices(p: Question, rand: () => number = Math.random): string[] {
  if (isChoiceQ(p)) {
    const keep = new Set(shuffle(p.choices.filter(c => c !== p.answer), rand).slice(0, 2));
    return p.choices.filter(c => c === p.answer || keep.has(c)).map(String);
  }
  const a = isNumQ(p) ? p.answer : 0;
  const near = [...new Set([a + 1, a - 1, a + 2, a - 2, a + 10, a - 10, swapped(a)].filter(v => Number.isInteger(v) && v >= 0 && v !== a))];
  return [a, ...shuffle(near, rand).slice(0, 2)].sort((x, y) => x - y).map(String);
}
/* The question as Explorer answers it: three big buttons */
export const asChoice = (p: Question, rand: () => number = Math.random): ChoiceQuestion =>
  (isChoiceQ(p) && p.choices.length === 3 ? p : { ...p, kind: 'choice', choices: threeChoices(p, rand), answer: String(p.answer) });

/* ---------- Raise-only (design decision 7) ---------- */
/* A copy of a progress record where each saved game or Arena Rating below LEVEL_START[level], and each saved Skill
   Rating below skillStart(its grade, level), is raised to it. Nothing is lowered and nothing else changes; the record
   itself is returned when nothing moved. */
export function raiseOnly<T extends { ratings?: Record<string, number> }>(record: T, level: Grade): T {
  const ratings = record.ratings ?? {}, out: Record<string, number> = { ...ratings }; let changed = false;
  for (const [k, v] of Object.entries(ratings)) {
    let want = 0;
    if (/^(game|arena):/.test(k)) want = LEVEL_START[String(level)] ?? 0;
    else if (k.startsWith('skill:')) { const g = skillGrade(k.slice('skill:'.length)); if (g !== null) want = skillStart(g, level); }
    if (want > (Number(v) || 0)) { out[k] = want; changed = true; }
  }
  return changed ? { ...record, ratings: out } : record;
}
