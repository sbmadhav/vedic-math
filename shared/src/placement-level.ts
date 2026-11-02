/* What a Placement level sets (openspec placement, design decision 6; ADR 0007): the tables Practice reads when a Player
   has a Placement level and no Rating yet, and where Bolt's path starts. Small and on the first load (js/adapt.js
   imports it); the climb itself is placement.ts, loaded only when a Placement runs. No DOM, no storage. */
import { BELTS, TRICKS } from './vedic.ts';
import { GRADES, byId } from './skills/index.ts';

/* A school grade as GRADES names it: 'K', or 1 to 12 (a number, or its digits as a string once saved) */
export type Grade = string | number;

/* The 13 Steps of a Placement climb, in GRADES order: 'K', 1, 2, ... 12 */
export const STEPS: Grade[] = GRADES.filter(g => g.id !== 'V').map(g => g.id);
export const stepIndex = (g: Grade): number => STEPS.findIndex(s => String(s) === String(g));
export const gradeNum = (g: Grade): number => (String(g) === 'K' ? 0 : Number(g));

/* Where a game or the Arena starts in Practice at a Placement level. Anchored so each Mode's first grade gives that
   Mode's start (Explorer K is 1, Challenger grade 3 is 5, Pro grade 8 is 9): a Player placed at their Mode's start
   gets the behavior they had before Placement. */
export const LEVEL_START: Record<string, number> = { K: 1, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 8, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 13 };
/* Where a Skill or Trick starts in Practice: 10 (generator level 2) when its grade is below the level, 5 (level 1, near
   the top) at the level, 1 above it */
export const skillStart = (grade: Grade, level: Grade): number => { const a = gradeNum(grade), b = gradeNum(level); return a < b ? 10 : a === b ? 5 : 1; };
/* A Skill's grade for skillStart: a Trick's is the Trick's grade (its Skill sits in the V row of the map) */
export function skillGrade(id: string): Grade | null {
  const s = byId[id]; if (!s) return null;
  if (s.trick) { const t = TRICKS.find(x => x.id === s.trick); return t ? t.grade : null; }
  return s.grade;
}

/* Bolt's start Belt: the first Belt, in Belt order, with a Trick at the level's grade or above (the black belt when none
   is). With today's Trick grades: K to 3 white, 4 and 5 yellow, 6 orange, 7 blue, 8 purple, 9 and above black. */
export function beltFor(level: Grade): string {
  const L = gradeNum(level), gradeOfTrick = (id: string): number => TRICKS.find(t => t.id === id)?.grade ?? 0;
  const belt = BELTS.find(b => b.tricks.some(t => gradeOfTrick(t) >= L)) ?? BELTS[BELTS.length - 1];
  return belt ? belt.id : 'white';
}
/* The later of two Belts in Belt order: a Player's placedBelt only ever moves forward (design decision 7) */
export function forwardBelt(current: string | null | undefined, next: string): string {
  const at = (id: string | null | undefined): number => BELTS.findIndex(b => b.id === id);
  return at(next) > at(current) ? next : at(current) >= 0 ? (current as string) : next;
}
/* The grades one below, at and one above the level, within K to 12: the Skill map's "Suggested for you" */
export function suggestedGrades(level: Grade): Grade[] {
  const i = stepIndex(level); if (i < 0) return [];
  return STEPS.slice(Math.max(0, i - 1), Math.min(STEPS.length, i + 2));
}
