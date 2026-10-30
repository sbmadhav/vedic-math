/* Word problems (openspec change word-problems): the small part a round needs at once. Moved from js/story-plan.js
   (openspec change react-typescript, task 3.1) with the Skills that ask it (skills/middle.ts, skills/upper.ts). The
   stories themselves (js/stories.js, the templates and hand-written stories) are not in the first paint's import graph:
   the page loads them after it has painted (loadStories() in js/story-plan.js, from js/app.js) and they register here,
   so a route that never asks one (a Sutra deep dive, Home) never waits for them. Until they are here, no Word problem
   is mixed in (a due one waits), and the two Word problem Skills ask a short built-in story.
   - When (design D2, D3, D4): SLOTS by Mode, the 20 saved answers first, a due slot carried to the next Skill.
   - Pure: no DOM, and nothing imported but types. */
import type { Question } from './question.ts';

export type Mode = 'explorer' | 'challenger' | 'pro';
export const SLOTS: Record<Mode, { first: number; every: number }> = { explorer: { first: 5, every: 10 }, challenger: { first: 3, every: 5 }, pro: { first: 2, every: 3 } };
export const RULES = { after: 20, written: 0.25 };
export const LABEL: Record<Mode, string> = { explorer: 'Story time', challenger: 'Word problem', pro: 'Word problem' };
export const ASK = 'What is it asking?';
/* The words of the choices that ask only Word problems (openspec word-problems-more): Practice's Only Word problems
   (design D1) and the Arena's Word problems round (D3) */
export const ONLY: Record<Mode, string> = { explorer: 'Only stories', challenger: 'Only Word problems', pro: 'Only Word problems' };
export const ROUND: Record<Mode, string> = { explorer: 'Story time', challenger: 'Word problems', pro: 'Word problems' };

/* A Word problem: a question in the shape every round uses, with its story */
export type Story = Question & { story: { id: string; mode: string; trick?: string } };
/* What js/stories.js registers when it runs */
export interface StoriesApi {
  hasStory(skill: string): boolean;
  storyFor(skill: string, mode: string, opts: { bare?: Question | null; r?: () => number }): Story | null;
  skillStory(id: string, mode: string): Story;
  trickStory(trick: string, bare: Question, mode: string): Story | null;
  [more: string]: unknown;
}

let S: StoriesApi | null = null;
/* js/stories.js calls this when it runs; storiesNow() is then its API ({ hasStory, storyFor, skillStory, trickStory }) */
export function register(api: StoriesApi): void { S = api; }
export const storiesNow = (): StoriesApi | null => S;

const slotsOf = (mode: string): { first: number; every: number } => (SLOTS as Partial<Record<string, { first: number; every: number }>>)[mode] || SLOTS.challenger;
/* Is question k (from 1) of a round a Word problem slot in this Mode? */
export function isSlot(mode: string, k: number): boolean { const s = slotsOf(mode); return k >= s.first && (k - s.first) % s.every === 0; }
/* The Star round's main question (from 0) that is a Word problem: question 3 for Challenger, 2 for Pro; none for
   Explorer (no Stars) or before the Player's first 20 answers */
export function starSlot(mode: string, answered: number): number {
  if (answered < RULES.after || mode === 'explorer' || !(SLOTS as Partial<Record<string, unknown>>)[mode]) return -1;
  return slotsOf(mode).first - 1;
}
/* One Practice round's plan. answered(): the Player's saved answers. next(skill, bare) is called once per question,
   in order, and returns the Word problem to ask instead of bare, or null. A slot that falls on a Skill with no story,
   before the 20th answer or before the stories have loaded waits for the next question. */
export function storyPlan(mode: string, { answered = () => 0, r = Math.random }: { answered?: () => number; r?: () => number } = {}): { next(skill: string, bare: Question | null): Story | null } {
  let k = 0, due = false;
  return {
    next(skill, bare) {
      k++; if (isSlot(mode, k)) due = true;
      if (bare && bare.story) { due = false; return null; } /* a Word problem Skill's own question already is one */
      if (!due || answered() < RULES.after || !S || !S.hasStory(skill)) return null;
      const p = S.storyFor(skill, mode, { bare, r }); if (p) due = false;
      return p;
    }
  };
}
/* A Star's Word problem on a bare problem's own numbers, or null (also while the stories load) */
export const trickStoryNow = (trick: string, bare: Question, mode: string): Story | null => (S ? S.trickStory(trick, bare, mode) : null);

/* The generator of a Word problem Skill (design D10). While js/stories.js loads (a few milliseconds after the first
   paint), one short story of the same style, so the Skill never shows a bare question. */
export function skillStoryNow(id: string, mode: string): Story {
  if (S) return S.skillStory(id, mode);
  if (id === '8-reallife') return { q: 'Class 9 is going on a trip to the hills. The bus costs 9,600 rupees, shared equally by 48 students, and each student also pays 85 rupees for lunch. How many rupees does each student pay in all?', kind: 'num', answer: 285, unit: 'rupees', hints: [`${ASK} What one student pays for the bus and the lunch together.`, 'Two steps: share the bus cost by the 48 students, then add the lunch.'], steps: ['9,600 &divide; 48 = 200', '200 + 85 = 285 rupees'], story: { id: 'w-trip', mode: 'pro' } };
  const ri = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));
  let p: number, q: number, g: number; do { p = ri(3, 9); q = ri(4, 12); g = ri(2, p * q - 3); } while ([p, q, g].includes(p * q - g));
  return { q: `Priya buys ${p} packs of stickers with ${q} in each pack, then gives ${g} to friends. How many stickers are left?`, kind: 'num', answer: p * q - g, unit: 'stickers', hints: [`${ASK} How many stickers Priya still has after giving some away.`, `Two steps: first how many in all (${p} &times; ${q}), then take away the ${g} given.`], steps: [`${p} &times; ${q} = ${p * q}`, `${p * q} &minus; ${g} = ${p * q - g}`], story: { id: 'c-packs', mode: 'challenger' } };
}
