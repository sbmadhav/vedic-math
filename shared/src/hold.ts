/* The wait indicator's rules (openspec change muse-review-polish, design D1; feedback-wait spec). js/hold.js draws it;
   this is what a hold of a given length shows, with no DOM, so shared/src/hold.test.ts can check the thresholds. */

/* Nothing for the first BAR_AFTER ms (a short pause is a beat, not a freeze); Next from NEXT_FROM ms when the round
   lets the Player skip the hold */
export const BAR_AFTER = 1200, NEXT_FROM = 2000;
export type HoldPlan = { bar: boolean; next: boolean };
/* What a hold of ms shows: the bar, and Next when the hold may be skipped (an untimed round) */
export const holdPlan = (ms: number, { skippable = false }: { skippable?: boolean } = {}): HoldPlan => ({ bar: ms > BAR_AFTER, next: skippable && ms >= NEXT_FROM });
/* The time left as words, for a Player who sees no motion: whole seconds, never under 1 */
export const holdLeftText = (ms: number): string => `Next question in ${Math.max(1, Math.ceil(ms / 1000))} s`;
/* The one polite announcement per hold */
export const HOLD_SAID = 'Next question in a moment.';
