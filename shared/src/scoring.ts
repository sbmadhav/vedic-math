/* Scores (moved from js/adapt.js, js/arena.js and js/cloud.js, openspec change react-typescript, task 3.1): what one
   answer is worth, and what a World board accepts. A Duel's server scores with the same rules. The caps mirror
   cloud/firestore.rules, which are the authority; shared/src/scoring.test.ts checks the two agree. */

/* The difficulty dial of every game runs from DMIN (a first counting game) to DMAX (hard enough for strong adults) */
export const DMIN = 1, DMAX = 20;
/* Points for one right answer at difficulty d: 10 at d1, 143 at d20 */
export const pointsAt = (d: number): number => 10 + 7 * (Math.max(DMIN, Math.min(DMAX, Math.round(d))) - 1);
/* Skill generators have levels 1 to 3. A Rating picks one: 1 to 7 is level 1, 8 to 13 level 2, 14 to 20 level 3. */
export const levelFor = (d: number): 1 | 2 | 3 => (d <= 7 ? 1 : d <= 13 ? 2 : 3);
/* Arena: the points for a right answer that makes the combo `combo` long: 10, plus 2 for each earlier answer in the
   combo, up to 30 */
export const comboGain = (combo: number): number => 10 + Math.min(combo - 1, 10) * 2;

/* Score caps and the entry lifetime of World boards: Arena boards per League, Ranked game boards (g_...) and weekly
   Sparks boards (xp-week-...) one cap each */
export const MAX_SCORE: Record<string, number> = { explorer: 2000, challenger: 1600, pro: 1200 };
export const MAX_GAME_SCORE = 12000, MAX_WEEK_SPARKS = 60000;
export const KEEP_DAYS = 30;

/* The score a board accepts, as the rules check it: an integer from 10 to the board's cap, and even on
   Arena boards (every right answer in the Arena earns an even amount). 0 means the board takes none. */
export function boardScore(board: string, raw: unknown): number {
  const cap = board.startsWith('g_') ? MAX_GAME_SCORE : board.startsWith('xp-') ? MAX_WEEK_SPARKS : MAX_SCORE[board.split('-').pop() as string] || 0;
  let score = Math.min(cap, Math.round(Number(raw) || 0));
  if (!board.startsWith('g_') && !board.startsWith('xp-')) score -= score % 2;
  return score >= 10 ? score : 0;
}
