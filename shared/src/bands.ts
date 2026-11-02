/* Reading bands (openspec change age-bands, design decisions 3, 4 and 7; ADR 0008). Pure: no DOM, no storage, no
   import, so the engine tests and the lint rule can prove it never reaches the math (the engine, shared/src/questions.ts,
   scoring.ts, the Skills and js/adapt.js, levels.js, check.js, may not import this module: eslint.config.js). The Grade
   answer is { grade } or { age } on the Player record (js/store.js reading); bandOf() turns it into one of three bands,
   which tune how the app talks and how a Player answers, in every Mode, and never how hard the math is (decision 5).
   Band names are internal: a grown-up sees HELP_WORDS in Me, a child never sees a band name. The Legacy views reach this
   module through js/fx.js (band, rules, copy); the React game will through app/src/logic/. */

export type Grade = 'pre-k' | 'k' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'adult';
export type Age = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 'adult';
/* The Grade answer as stored: a grade or an age, and when it was given */
export type Reading = { grade: Grade; at?: number } | { age: number | 'adult'; at?: number };
export type Band = 'early' | 'growing' | 'fluent';
export type Mode = 'explorer' | 'challenger' | 'pro';

/* The grade buttons, in the order they are shown, and the age buttons of "Tell my age instead" */
export const GRADES: readonly Grade[] = ['pre-k', 'k', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'adult'];
export const AGES: readonly Age[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 'adult'];
export const BANDS: readonly Band[] = ['early', 'growing', 'fluent'];

const isGrade = (g: unknown): g is Grade => (typeof g === 'string' || typeof g === 'number') && (GRADES as readonly string[]).includes(String(g).toLowerCase());
const isAge = (a: unknown): a is number | 'adult' => a === 'adult' || (Number.isInteger(a) && (a as number) >= 1 && (a as number) <= 120);
/* A Grade answer the store accepts: { grade } with one of GRADES, or { age } with a whole number of years or 'adult'
   (the buttons offer 3 to 17; an age outside them from a record made elsewhere still reads) */
export function validReading(r: unknown): r is Reading {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  if ('grade' in o && !('age' in o)) return isGrade(o['grade']);
  if ('age' in o && !('grade' in o)) return isAge(o['age']);
  return false;
}

/* The band of a Grade answer, or null with no answer (decision 3):
   early: Pre-K, K, 1 or ages 3 to 6; growing: 2 to 4 or ages 7 to 9; fluent: 5 to 12, Grown-up, or ages 10 and up */
export function bandOf(reading: unknown): Band | null {
  if (!validReading(reading)) return null;
  if ('grade' in reading) {
    const g = String(reading.grade).toLowerCase();
    if (g === 'pre-k' || g === 'k' || g === '1') return 'early';
    if (g === '2' || g === '3' || g === '4') return 'growing';
    return 'fluent';
  }
  const a = reading.age;
  if (a === 'adult' || a >= 10) return 'fluent';
  return a >= 7 ? 'growing' : 'early';
}

/* What each band changes (decision 4). voice: Read aloud's default; copy: the copy table's variant, else the Mode's;
   tap: every whole-number answer as big buttons; choices: how many choices are shown; clock: Practice clocks
   (none, as a bar with no ticks, or as the Mode has them); ticks: countdown tick sounds; race: the Hook's dare races
   the calculator. Ranked rounds keep the League's clock, input and choices for every band (AB3): only ticks and how
   the clock is drawn follow the band there. */
export type Rules = { readonly voice: boolean; readonly copy: 'early' | 'growing' | null; readonly tap: boolean; readonly choices: 3 | 4; readonly clock: 'none' | 'bar' | 'mode'; readonly ticks: boolean; readonly race: boolean };
export const RULES: Readonly<Record<Band, Rules>> = Object.freeze({
  early: Object.freeze({ voice: true, copy: 'early', tap: true, choices: 3, clock: 'none', ticks: false, race: false } as const),
  growing: Object.freeze({ voice: false, copy: 'growing', tap: false, choices: 4, clock: 'bar', ticks: false, race: true } as const),
  fluent: Object.freeze({ voice: false, copy: null, tap: false, choices: 4, clock: 'mode', ticks: true, race: true } as const),
});
export const rulesFor = (band: Band | null | undefined): Rules | null => (band && band in RULES ? RULES[band] : null);

/* The Mode the picker tags Suggested (decision 7; the MODES grade ranges in js/fx.js): Pre-K to 2 or ages 3 to 7
   Explorer, 3 to 7 or ages 8 to 12 Challenger, 8 to 12, 13 and up or Grown-up Pro. Nothing is preselected. */
export function suggestedMode(reading: unknown): Mode | null {
  if (!validReading(reading)) return null;
  if ('grade' in reading) {
    const g = String(reading.grade).toLowerCase();
    if (g === 'pre-k' || g === 'k' || g === '1' || g === '2') return 'explorer';
    if (['3', '4', '5', '6', '7'].includes(g)) return 'challenger';
    return 'pro';
  }
  const a = reading.age;
  if (a === 'adult' || a >= 13) return 'pro';
  return a >= 8 ? 'challenger' : 'explorer';
}

/* How Me names the band to a grown-up: "Reading help: lots / some / a little" */
export const HELP_WORDS: Readonly<Record<Band, string>> = Object.freeze({ early: 'lots', growing: 'some', fluent: 'a little' });
/* The answer in words, for Me: "Pre-K", "Kindergarten", "Grade 3", "Grown-up", "Age 7" */
export function readingLabel(reading: unknown): string {
  if (!validReading(reading)) return '';
  if ('grade' in reading) { const g = String(reading.grade).toLowerCase(); return g === 'pre-k' ? 'Pre-K' : g === 'k' ? 'Kindergarten' : g === 'adult' ? 'Grown-up' : `Grade ${g}`; }
  return reading.age === 'adult' ? 'Grown-up' : `Age ${reading.age}`;
}
/* The label on a grade or age button */
export const gradeLabel = (g: Grade): string => (g === 'pre-k' ? 'Pre-K' : g === 'k' ? 'K' : g === 'adult' ? 'Grown-up' : String(g));
export const ageLabel = (a: Age): string => (a === 'adult' ? 'Grown-up' : String(a));

/* n answer buttons for a whole-number answer, in ascending order: the answer and nearby numbers a child might get
   by a slip (one off, ten off, a hundred off), never negative unless the answer is. rand: Math.random or a seeded one.
   Presentation only: the question and its answer are what the generator made. */
export function choicesAround(answer: number, n = 3, rand: () => number = Math.random): number[] {
  const a = Number(answer);
  const steps = [1, -1, 10, -10, 2, -2, 100, -100, 5, -5, 20, -20];
  const pool = [...new Set(steps.map(d => a + d).filter(v => Number.isInteger(v) && v !== a && (a < 0 || v >= 0)))];
  const picked: number[] = [];
  while (picked.length < n - 1 && pool.length) picked.push(pool.splice(Math.floor(rand() * Math.min(pool.length, 4)), 1)[0] as number);
  let k = 1;
  while (picked.length < n - 1) { const v = a + (n + k++) * (a < 0 ? -1 : 1); if (!picked.includes(v) && v !== a) picked.push(v); }
  return [a, ...picked].sort((x, y) => x - y);
}
/* A choice question with more choices than the band shows: the answer and the first others, in their order */
export function trimChoices<T>(choices: readonly T[], answer: T, n: number): readonly T[] {
  if (!Array.isArray(choices) || choices.length <= n) return choices;
  const others = choices.filter(c => String(c) !== String(answer)).slice(0, n - 1);
  return choices.filter(c => String(c) === String(answer) || others.includes(c));
}
