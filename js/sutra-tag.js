/* Sutra tags (openspec change sutras-first, spec sutra-tags): the line that names the Sutra a Trick, Star, Kata,
   Arena question, video or game uses, with its meaning in the Mode's words and an honest word for how the method
   relates to it, as one link to its Deep dive (#/sutras/<id>).
   - RELATION is the Sutra map (design, "The Sutra map"): every Trick's sutraId (js/vedic.js) with its relation:
     'sutra' (the method is the Sutra), 'sub' (a sub-sutra), 'case' (a special case of the Sutra) or 'idea' (it uses
     the Sutra's idea). NOTES say why for each 'case' and 'idea', shown to Pro on the Trick page.
   - Names and meanings come from the Sutra cards (js/sutras.js) only: Explorer reads the card's kid line.
   - Nothing here is spoken. Say it (js/say.js) in a full tag plays the Name clip already recorded, after a tap.
   - Pure strings: no DOM, no storage, so every rule is a node test. */
import { SUTRAS, SUBSUTRAS } from './sutras.js';
import { TRICKS } from './vedic.js';
import { sayButton, respellHTML } from './say.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Every card by id: s1 to s16, u1 to u13, as in js/app.js */
export const CARDS = Object.fromEntries([...SUTRAS.map(c => [`s${c.n}`, { ...c, id: `s${c.n}`, sub: false }]), ...SUBSUTRAS.map(c => [`u${c.n}`, { ...c, id: `u${c.n}`, sub: true }])]);
export const cardOf = id => (Object.prototype.hasOwnProperty.call(CARDS, id) ? CARDS[id] : null);

export const RELATIONS = ['sutra', 'sub', 'case', 'idea'];
export const RELATION = {
  sq5: 'sutra', recip: 'sutra', osculator: 'sub',
  from9: 'sutra', 'near-base': 'sutra', div9: 'case',
  crosswise: 'sutra', by11: 'case', duplex: 'case',
  transpose: 'sutra', 'zero-sum': 'sutra', 'ratio-zero': 'sutra', 'add-sub': 'sutra',
  'square-near': 'sutra', by9s: 'sutra', check9: 'idea',
  times5: 'idea', 'sub-base': 'sub', ends10: 'sub', sqroot: 'sub', cuberoot: 'sub'
};
/* Why a Trick is a special case or only borrows the idea (Pro, on the Trick page) */
export const NOTES = {
  div9: 'Nikhilaṃ division with the divisor 9: the running sums are its steps for that one divisor.',
  by11: 'Vertically and crosswise with a multiplier of 11, whose digits are both 1.',
  duplex: 'The duplex is how the 1965 book squares a number with vertically and crosswise.',
  check9: 'The digit sum check, casting out nines, is much older than the 1965 book. The sutra itself is about sums of coefficients; a digit sum is the same idea for numbers.',
  times5: 'Times 10, then halve, is a proportion: the idea of this sub-sutra. The book uses it for working bases, as in the trick for multiplying with a working base like 50.'
};
/* Where a tag can be followed from: the fixed words of the math/sutra_tag/<surface> event (analytics spec).
   try: the card of a Try a trick (js/try.js, openspec try-trick-in-modes). */
export const SURFACES = ['trick', 'star', 'try', 'kata', 'katas', 'dojo', 'arena', 'watch', 'game', 'home'];

/* The Sutra a Trick uses, and how: { id, relation } or null */
export function sutraOfTrick(trickId) {
  const t = TRICKS.find(x => x.id === trickId);
  return t && cardOf(t.sutraId) ? { id: t.sutraId, relation: RELATION[t.id] || (CARDS[t.sutraId].sub ? 'sub' : 'sutra') } : null;
}
/* The Sutra an Arena question uses: a Pro question names it itself (js/mental.js), a pool question by its Trick Skill */
export function sutraOfItem(it) {
  if (!it) return null;
  if (it.sutra && cardOf(it.sutra)) return { id: it.sutra, relation: CARDS[it.sutra].sub ? 'sub' : 'sutra' };
  return typeof it.skill === 'string' && it.skill.startsWith('v-') ? sutraOfTrick(it.skill.slice(2)) : null;
}
/* A game's Sutra: GAMES entries with sutra: { id, relation } (js/games.js) */
export const sutraOfGame = g => (g && g.sutra && cardOf(g.sutra.id) ? g.sutra : null);

const modeOf = m => (m === 'explorer' || m === 'pro' ? m : 'challenger');
/* The card's meaning in the Mode's words */
export const meaningFor = (id, mode) => { const c = cardOf(id); return c ? (modeOf(mode) === 'explorer' ? c.kid : c.meaning) : ''; };
/* How the method relates to the Sutra, in the Mode's words */
const KIND = {
  sutra: { explorer: 'Sutra', challenger: 'Sutra', pro: 'Sutra' },
  sub: { explorer: 'Sub-sutra', challenger: 'Sub-sutra', pro: 'Sub-sutra' },
  case: { explorer: 'Part of', challenger: 'A special case of', pro: 'Special case of' }, /* Explorer: honest and short, a special case is part of its Sutra */
  idea: { explorer: 'Idea from', challenger: 'Uses the idea of', pro: 'Uses the idea of' }
};
export const kindWord = (relation, mode) => (KIND[relation] || KIND.sutra)[modeOf(mode)];
/* The relation of a card named on its own (Home, the Arena): a sub-sutra card is a sub-sutra */
export const ownRelation = id => (cardOf(id) && CARDS[id].sub ? 'sub' : 'sutra');

/* One tag. size: 'full' (kind, name, meaning, Say it and the Respelling, and the Pro note), 'line' (kind, name, meaning)
   or 'mini' (the name, with kind and meaning for screen readers only). link: false draws the same words as text (a
   Star's header while questions are on screen, a Watch card, a games list card). surface: one of SURFACES, for the
   tag event. note: the Pro note's text (full size, Pro only). extra: HTML after the link, such as "3 of 4 right".
   mean: a meaning line in place of the card's (a Try a trick's card says the Sutra in its Mode's words). */
export function tagHTML(id, { mode = 'challenger', relation = ownRelation(id), size = 'line', link = true, surface = '', note = '', extra = '', cls = '', mean = '' } = {}) {
  const c = cardOf(id); if (!c) return '';
  const m = modeOf(mode), kind = kindWord(relation, m); mean = mean || meaningFor(id, m);
  const words = `<span class="sutra-tag-k">${esc(kind)}</span> <b class="sutra-tag-n" lang="sa-Latn">${esc(c.name)}</b>${size === 'mini' ? `<span class="md-sr-only">: ${esc(mean)}</span>` : ` <span class="sutra-tag-m">${esc(mean)}</span>`}`;
  const go = SURFACES.includes(surface) ? ` data-tag="${surface}"` : '';
  const body = link ? `<a class="sutra-tag-a" href="#/sutras/${id}"${go}>${words}<span class="md-sr-only">, open its deep dive</span></a>` : `<span class="sutra-tag-a">${words}</span>`;
  const base = `sutra-tag sutra-tag--${size}${cls ? ' ' + cls : ''}`;
  if (size === 'mini') return `<span class="${base}" data-sutra="${id}">${body}</span>`;
  if (size === 'line') return `<p class="${base}" data-sutra="${id}">${body}${extra}</p>`;
  return `<div class="${base}" data-sutra="${id}"><p class="sutra-tag-row">${body}</p><p class="sutra-tag-say">${sayButton(id, { label: true })}${respellHTML(id)}</p>${note && m === 'pro' ? `<p class="sutra-tag-note">${esc(note)}</p>` : ''}${extra}</div>`;
}
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
