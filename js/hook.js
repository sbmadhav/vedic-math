/* The Hook (openspec hook, carried over from hook-first-star): a new Challenger or Pro Player's first Star, the one
   Placement points to, opens with a dare to beat an on-screen calculator on one problem of the Star's Trick, then a
   short reveal of the Trick on those numbers, then the round dealt easiest first. The pure parts live here (the dares,
   the calculator's keys and result, who is new); js/star.js plays them inside the round, so the Hook has no route of its
   own and Back, deep links and the route view stay the Star's. Loaded on demand by js/app.js only for a Player who may
   be new, so a first load never pays for it; nothing here is sent anywhere (a device-only flag, S.hookSeen). */
import { TRICKS, problemFor } from '../shared/src/vedic.ts';
import * as store from './store.js';

/* The honest race (hook spec "Beat the calculator, honestly"): one key every KEY_MS; the reveal ends within REVEAL_MS,
   its steps at most STEP_MS apart (the Star round's replay pace) */
export const KEY_MS = 450, REVEAL_MS = 20000, STEP_MS = 2500, REVEAL_TAIL = 800;

/* One fixed dare per Trick a basic calculator can type in one go: friendly numbers from the Trick's Star 1 range
   (hook-first-star design decision 3). The other ten Tricks (equations, remainders, digit questions, roots, checks) have
   none, so a first Star on one of them starts without the Hook. Every dare needs at least 6 keys (2.7 seconds). */
export const HOOK_DARES = {
  from9: [357], by11: [63], times5: [86, 25], sq5: [85], by9s: [47, 99], ends10: [43, 47],
  'near-base': [97, 94], 'square-near': [97], crosswise: [23, 41], duplex: [76], 'sub-base': [52, 48]
};
const digits = n => String(n).split('');
/* The keys a four-function calculator needs for the dare, digits, the operator, digits, then equals: a square as
   a × a, from9 as the power of ten minus the number, by11 as the number times 11, the others as a × b */
export function calcKeys(trick, vals) {
  const [a, b] = vals;
  if (trick === 'sq5' || trick === 'square-near' || trick === 'duplex') return [...digits(a), '×', ...digits(a), '='];
  if (trick === 'from9') return [...digits(10 ** String(a).length), '−', ...digits(a), '='];
  if (trick === 'by11') return [...digits(a), '×', '1', '1', '='];
  return [...digits(a), '×', ...digits(b), '='];
}
/* What the calculator shows after '=': the keys worked as a basic calculator would (one operator, left to right) */
export function calcResult(keys) {
  let acc = null, op = null, cur = '';
  for (const k of keys) {
    if (/^\d$/.test(k)) { cur += k; continue; }
    if (cur !== '') { const n = Number(cur); acc = acc === null ? n : op === '×' ? acc * n : op === '−' ? acc - n : op === '+' ? acc + n : op === '÷' ? acc / n : n; cur = ''; }
    if (k !== '=') op = k;
  }
  return acc;
}
/* How long the calculator takes, in seconds (2.7 for 6 keys) */
export const calcSeconds = keys => Math.round(keys.length * KEY_MS) / 1000;
/* The reveal's pace: the replay's 2.5 seconds a step, or faster so every step and the hand-over fit in 20 seconds */
export const revealPace = steps => Math.min(STEP_MS, Math.floor((REVEAL_MS - REVEAL_TAIL) / Math.max(1, steps)));

/* The dare for a Trick, or null: the Trick, its numbers, the question as the round asks it, the calculator's keys and
   what they come to, its time in seconds, and the reveal's pace */
export function dareFor(trick) {
  const t = TRICKS.find(x => x.id === trick), vals = HOOK_DARES[trick];
  if (!t || !vals) return null;
  const keys = calcKeys(trick, vals);
  return { trick, vals, p: problemFor(t, vals), keys, result: calcResult(keys), seconds: calcSeconds(keys), pace: revealPace(t.steps(vals).length) };
}

/* A new Player (hook spec): never answered a question outside Placement, no Star lit or skipped, and has not seen or
   skipped the Hook. Sparks do not count (a Try a trick earns them and records no answer), nor does a finished Placement
   (it records no answers): both leave the first Star's Hook in place (design decision 10). */
export function isNewPlayer() {
  if (store.count('answers') > 0 || store.hookSeen()) return false;
  const { lit, skipped } = store.starStates();
  return !Object.keys(lit).length && !Object.keys(skipped).length;
}
/* The Hook for a Star a Player opens, or null: a new Challenger or Pro Player whose Star's Trick has a dare. A new
   Player opening a first Star whose Trick has no dare is past the first minute: hookSeen is set so no later Star plays
   it (the grade 8 then from9 case). */
export function hookFor(trick, mode) {
  if (mode === 'explorer' || !isNewPlayer()) return null;
  const dare = dareFor(trick);
  if (!dare) { store.setHookSeen(); return null; }
  return { dare, keyMs: KEY_MS };
}
