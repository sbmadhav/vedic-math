/* The Sutra tag's core (openspec change sutras-first, spec sutra-tags; #133 perf): the Sutra map, the kind words and
   one tag's markup, in the static import graph so Home draws its Sutra door at once, with no placeholder that moves the
   page when js/sutra-tag.js arrives. js/sutra-tag.js re-exports all of it and adds what only other views use (the Pro
   notes, a Trick's tag, the Arena's and games' Sutras), and still loads on demand (#126 review). Pure strings. */
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
/* Where a tag can be followed from: the fixed words of the math/sutra_tag/<surface> event (analytics spec).
   try: the card of a Try a trick (js/try.js, openspec try-trick-in-modes). */
export const SURFACES = ['trick', 'star', 'try', 'kata', 'katas', 'dojo', 'arena', 'watch', 'game', 'home'];

/* The Sutra a Trick uses, and how: { id, relation } or null */
export function sutraOfTrick(trickId) {
  const t = TRICKS.find(x => x.id === trickId);
  return t && cardOf(t.sutraId) ? { id: t.sutraId, relation: RELATION[t.id] || (CARDS[t.sutraId].sub ? 'sub' : 'sutra') } : null;
}
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
