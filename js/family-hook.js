/* The small piece of the Nikhilam Family helpers (openspec family-helpers) that the views call. It reads the
   Player's switch and setting, and only when the helpers are on does it load js/family-view.js (the overlay, the
   engine and the line table); until then, and for every Player who left the switch off, it is a no-op.
   The same rule as familyOn() and helpSetting() in js/family-helpers.js (test/family-helpers.test.mjs keeps them
   alike), written out here so the off path loads nothing more. */
import * as store from './store.js';
import { on } from './life.js';

const NONE = { note() {}, askHTML: '', on: false };
/* The switch, off by default (FAMILY_DEFAULT), and the setting: 'always' (default), 'ask' or 'off' */
export const helpersOn = p => !!p && p.family === true && p.familyHelp !== 'off';
export const ASK_HTML = '<button type="button" class="md-btn md-btn--sm fh-ask" data-fh-ask>Ask a friend</button>';
/* Talking with the Family (step 3, design D15, helper-conversation spec): offered only to a Player whose saved answers
   say 13 or over: an Age answer of 13 or over, or with no Age answer a Grade answer of grade 9 or above (grade 8 starts
   at 12 or 13, so it does not count); an Age answer under 13 always rules it out. age is the Player's Age answer (a
   number or 'adult', js/store.js setAge), grade the saved Grade answer (store.savedGrade()); both stay on the device. */
export function talkEligible(age, grade) {
  if (age === 'adult') return true;
  if (typeof age === 'number') return age >= 13;
  const g = Number(grade);
  return Number.isInteger(g) && g >= 9;
}
/* The switch "Talk with the Family" (player.familyTalk, off by default), and only with the helpers on and the gate open */
export const talkOn = (p, grade) => helpersOn(p) && p.familyTalk === true && talkEligible(p.age, grade);

/* A round's Family: familyRound({ root, card, signal, area, protect, ctx, hint }) -> { note(event), askHTML, on }.
   Events are createCoach()'s (js/family-helpers.js). Taps on Ask a friend inside root are wired here. */
export function familyRound(opts) {
  if (!helpersOn(store.player()) || !opts || !opts.signal || opts.signal.aborted) return NONE;
  let fam = null, queue = [];
  import('./family-view.js').then(m => { if (opts.signal.aborted && !queue.some(e => e.type === 'leave')) return; fam = m.mountFamily(opts); const q = queue; queue = null; q.forEach(e => fam.note(e)); }).catch(() => { queue = null; });
  const note = ev => { if (fam) fam.note(ev); else if (queue) queue.push(ev); };
  on(opts.root, 'click', e => { if (e.target.closest('[data-fh-ask]')) note({ type: 'ask' }); }, opts.signal);
  return { note, askHTML: ASK_HTML, on: true };
}
