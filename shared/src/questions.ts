/* Arena question sets (moved from js/arena.js and js/adapt.js, openspec change react-typescript, task 3.1): the League
   pools, the seeded random that gives everyone in a League the same daily round, and Practice questions at a
   difficulty. The rounds themselves (the views) stay in js/arena.js; a Duel's server deals from the same sets. */
import { byId } from './skills/index.ts';
import { shuffle } from './lib.ts';
import { mentalQ, FAMILIES, type Family } from './mental.ts';
import type { Question } from './question.ts';

export type League = 'explorer' | 'challenger' | 'pro';

/* Question pools by League. The Pro League draws from the mental arithmetic families (mental.ts) instead;
   proV1 is the Pro pool before that change, kept only for Pro daily rounds dated before MENTAL_FROM. */
const POOLS: Record<string, string[]> = {
  explorer: ['k-add10', 'k-sub10', 'k-bonds', 'k-count', '1-doubles', '1-maketen', 'k-teens'],
  challenger: ['3-mult', '3-div', 'v-sq5', 'v-by11', 'v-times5', 'v-ends10', '2-add100', '3-multtens', 'v-from9', 'v-by9s'],
  proV1: ['v-near-base', 'v-duplex', '6-percent', '7-twostep', '8-exprules', 'v-sqroot', '6-exp', '8-multistep', '11-logs', 'v-square-near']
};
/* Pro daily rounds switch to mental arithmetic on Monday 2026-10-19, the first day of ISO week 2026-W43. Boards are
   named after the Player's local date and ISO week, and the switch uses the same date, so no day's or week's Pro
   Board mixes the old and new question sets. The Pro daily seed gains a version prefix at the same time. */
export const MENTAL_FROM = '2026-10-19';
/* The difficulty ramp of a Pro daily round, from its first item to its last (every Pro Player gets the same) */
export const PRO_RAMP: [number, number] = [6, 16];

/* Skill generators have levels 1 to 3. A Rating picks one: 1 to 7 is level 1, 8 to 13 level 2, 14 to 20 level 3. */
export const levelFor = (d: number): 1 | 2 | 3 => (d <= 7 ? 1 : d <= 13 ? 2 : 3);

/* Seeded random: same day + league = same questions for everyone */
export function mulberry32(a: number): () => number { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s: string): number => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
/* Runs fn with Math.random seeded from seedText (the generators draw from Math.random); no seedText leaves it alone */
export const withSeed = <T>(seedText: string | null | undefined, fn: () => T): T => { const real = Math.random; if (seedText) Math.random = mulberry32(hash(seedText)); try { return fn(); } finally { Math.random = real; } };

/* One Arena question: four choices (for tap play) around a whole-number answer */
export interface ArenaItem {
  q: string;
  say?: string;
  viz: string | undefined;
  answer: number;
  choices: number[];
  /* The Skill it came from, or the mental family and difficulty for Pro */
  skill?: string;
  family?: Family;
  d?: number;
}

/* An Arena item from a generated question: four choices (for tap play) around the answer */
const item = (p: Question & { answer: number }, league: string, extra: Partial<ArenaItem>): ArenaItem => {
  const near = [...new Set([p.answer, p.answer + 1, p.answer - 1, p.answer + 2, p.answer + 10, p.answer - 10].filter(v => league !== 'explorer' || v >= 0))];
  return { q: p.q, ...(p.say ? { say: p.say } : {}), viz: league === 'explorer' ? p.viz : '', answer: p.answer, choices: shuffle([p.answer, ...shuffle(near.slice(1)).slice(0, 3)]), ...extra };
};
/* One question from a skill pool at a generator level (1 to 3), or null when the skill gave an answer the keypad cannot take */
function poolItem(pool: readonly string[], league: string, level: number, d?: number): ArenaItem | null {
  const s = byId[pool[Math.floor(Math.random() * pool.length)] as string]; if (!s) return null;
  const p = s.gen(level);
  if (p.kind !== 'num' || typeof p.answer !== 'number' || !Number.isInteger(p.answer) || Math.abs(p.answer) > 99999) return null;
  return item(p as Question & { answer: number }, league, d === undefined ? { skill: s.id } : { skill: s.id, d });
}
const mentalItem = (family: string, d: number): ArenaItem => { const p = mentalQ(family, d); return item({ ...p, kind: 'num' }, 'pro', { family: p.family, d: p.d }); };

/* n Arena items for a League (or the proV1 pool). seedText makes the set the same for everyone; null draws at random.
   Pro: the families take turns in a seeded order, and difficulty rises evenly from ramp[0] to ramp[1]. */
export function makeSet(league: string, seedText: string | null, n = 80, { ramp = PRO_RAMP }: { ramp?: readonly [number, number] } = {}): ArenaItem[] {
  return withSeed(seedText, () => {
    const out: ArenaItem[] = [];
    if (league === 'pro') {
      const order = shuffle(FAMILIES);
      for (let i = 0; i < n; i++) out.push(mentalItem(order[i % order.length] as Family, Math.round(ramp[0] + ((ramp[1] - ramp[0]) * i) / Math.max(1, n - 1))));
      return out;
    }
    const pool = POOLS[league] || (POOLS.challenger as string[]); let guard = 0;
    while (out.length < n && guard++ < n * 20) { const it = poolItem(pool, league, league === 'explorer' ? 1 : 2); if (it) out.push(it); }
    return out;
  });
}
/* The daily round for a League on a local date (YYYY-MM-DD): the same questions in the same order for everyone */
export function dailySet(league: string, day: string): ArenaItem[] {
  if (league !== 'pro') return makeSet(league, `daily-${day}-${league}`);
  if (day < MENTAL_FROM) return makeSet('proV1', `daily-${day}-pro`);
  return makeSet('pro', `v2:daily-${day}-pro`, 80, { ramp: PRO_RAMP });
}
/* One Arena Practice question at difficulty d (1 to 20): a mental family for Pro, else the League's pool at the
   generator level for d */
export function practiceItem(league: string, d: number): ArenaItem {
  if (league === 'pro') return mentalItem(FAMILIES[Math.floor(Math.random() * FAMILIES.length)] as Family, d);
  const pool = POOLS[league] || (POOLS.challenger as string[]);
  for (let k = 0; k < 40; k++) { const it = poolItem(pool, league, levelFor(d), Math.round(d)); if (it) return it; }
  return makeSet(league, null, 1)[0] as ArenaItem;
}

/* What practiceNext needs of a difficulty dial (js/adapt.js Dial) */
export interface PracticeDial {
  lv: number;
  fresh<T>(gen: () => [string, T]): T;
}
/* The next Practice question: dial picks the difficulty, and Dial.fresh() keeps it from repeating this round */
export const practiceNext = (league: string, dial: PracticeDial): ArenaItem => dial.fresh(() => { const it = practiceItem(league, dial.lv); return [it.q, it]; });
