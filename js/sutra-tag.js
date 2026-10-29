/* Sutra tags (openspec change sutras-first, spec sutra-tags): the line that names the Sutra a Trick, Star, Kata,
   Arena question, video or game uses, with its meaning in the Mode's words and an honest word for how the method
   relates to it, as one link to its Deep dive (#/sutras/<id>).
   - RELATION (js/sutra-tag-core.js, re-exported here) is the Sutra map (design, "The Sutra map"): every Trick's sutraId (js/vedic.js) with its relation:
     'sutra' (the method is the Sutra), 'sub' (a sub-sutra), 'case' (a special case of the Sutra) or 'idea' (it uses
     the Sutra's idea). NOTES say why for each 'case' and 'idea', shown to Pro on the Trick page.
   - Names and meanings come from the Sutra cards (js/sutras.js) only: Explorer reads the card's kid line.
   - Nothing here is spoken. Say it (js/say.js) in a full tag plays the Name clip already recorded, after a tap.
   - Pure strings: no DOM, no storage, so every rule is a node test. */
import { CARDS, cardOf, sutraOfTrick, tagHTML } from './sutra-tag-core.js';
export * from './sutra-tag-core.js'; /* the Sutra map, the kind words and tagHTML (static, for Home's Sutra door) */

/* Why a Trick is a special case or only borrows the idea (Pro, on the Trick page) */
export const NOTES = {
  div9: 'Nikhilaṃ division with the divisor 9: the running sums are its steps for that one divisor.',
  by11: 'Vertically and crosswise with a multiplier of 11, whose digits are both 1.',
  duplex: 'The duplex is how the 1965 book squares a number with vertically and crosswise.',
  check9: 'The digit sum check, casting out nines, is much older than the 1965 book. The sutra itself is about sums of coefficients; a digit sum is the same idea for numbers.',
  times5: 'Times 10, then halve, is a proportion: the idea of this sub-sutra. The book uses it for working bases, as in the trick for multiplying with a working base like 50.'
};
/* The Sutra an Arena question uses: a Pro question names it itself (js/mental.js), a pool question by its Trick Skill */
export function sutraOfItem(it) {
  if (!it) return null;
  if (it.sutra && cardOf(it.sutra)) return { id: it.sutra, relation: CARDS[it.sutra].sub ? 'sub' : 'sutra' };
  return typeof it.skill === 'string' && it.skill.startsWith('v-') ? sutraOfTrick(it.skill.slice(2)) : null;
}
/* A game's Sutra: GAMES entries with sutra: { id, relation } (js/games.js) */
export const sutraOfGame = g => (g && g.sutra && cardOf(g.sutra.id) ? g.sutra : null);

/* A Trick's tag: its Sutra, its relation and (full size, Pro) its note */
export function trickTagHTML(trickId, opts = {}) {
  const s = sutraOfTrick(trickId); if (!s) return '';
  return tagHTML(s.id, { relation: s.relation, note: NOTES[trickId] || '', ...opts });
}
/* The Sutra name a Trick's tag shows, as plain text (the replay's label) */
export const trickSutraName = trickId => { const s = sutraOfTrick(trickId); return s ? CARDS[s.id].name : ''; };

/* The Arena round review (design decision 3): answered is [{ item, ok }] in the order asked. One entry per Sutra that
   answered at least one question, in first-asked order: { id, relation, asked, right }. Questions no Sutra answers
   are left out. */
export function roundSutras(answered) {
  const out = [];
  for (const { item, ok } of answered || []) {
    const s = sutraOfItem(item); if (!s) continue;
    let e = out.find(x => x.id === s.id);
    if (!e) out.push(e = { id: s.id, relation: s.relation, asked: 0, right: 0 });
    e.asked++; if (ok) e.right++;
  }
  return out;
}
