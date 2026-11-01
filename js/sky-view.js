/* The Sky and All places (openspec sky-home). skyView() draws the home map: the nakshatra wheel, three parallax star
   layers, every Constellation's lines and Sutra name, the 63 Stars as links in path order (so Tab follows Bolt's
   path), Bolt at the suggested Star with a dotted path through the next two, and the Landmarks on the rim.
   placesView() is the same world as a plain list, for keyboards, screen readers and anyone who prefers one.
   Colours come from CSS classes on design tokens (math.css, "Sky"); every listener is tied to the view's signal. */
import * as store from './store.js';
import * as fx from './fx.js';
import { boltHTML } from './bolt.js';
import { on } from './life.js';
import { sayButton, respellHTML } from './say.js';
import { TRICKS } from './vedic.js';
import { CONSTELLATIONS, SKY_LAYOUT, SKY_SIZE, WHEEL, PATH, LANDMARKS, upcoming, parseKey, labelLines, sectorAngle, starAt, startBeltOf, boltSpot, BOLT_BOX } from './sky.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const title = id => (TRICKS.find(t => t.id === id) || {}).title || id;
export const STATE_WORD = { lit: 'lit', skipped: 'skipped', open: 'not lit yet' };
const stateOf = (st, k) => (st.lit[k] ? 'lit' : st.skipped[k] ? 'skipped' : 'open');
/* "Square numbers ending in 5, Star 2, skipped": the Star's accessible name, here and in All places */
export const starName = (k, state) => { const { trick, n } = parseKey(k); return `${title(trick)}, Star ${n}, ${STATE_WORD[state]}`; };
const href = k => { const { trick, n } = parseKey(k); return `#/star/${trick}/${n}`; };
const startBelt = () => startBeltOf(store.player());

const STAR_D = 'M0-14L3.5-4.9L13.3-4.3L5.7 1.9L8.2 11.3L0 6L-8.2 11.3L-5.7 1.9L-13.3-4.3L-3.5-4.9Z';
const r1 = v => Math.round(v * 10) / 10;

/* ---------- Pieces of the picture ---------- */
function wheelSVG() {
  const { cx, cy, inner, outer, sectors } = WHEEL;
  const spokes = Array.from({ length: sectors }, (_, s) => { const a = sectorAngle(s) - Math.PI / sectors; return `<line x1="${r1(cx + inner * Math.cos(a))}" y1="${r1(cy + inner * Math.sin(a))}" x2="${r1(cx + outer * Math.cos(a))}" y2="${r1(cy + outer * Math.sin(a))}"/>`; }).join('');
  return `<g class="sky-wheel" aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="${outer}"/><circle cx="${cx}" cy="${cy}" r="${(inner + outer) / 2 - 20}" class="sky-wheel-mid"/><circle cx="${cx}" cy="${cy}" r="${inner}"/>${spokes}</g>`;
}
/* Three tiles of small dots, each a layer that drifts a little with the pointer and the scroll */
const LAYERS = [[97, [[12, 20, 1.2], [60, 71, 1], [83, 30, 1.4]]], [131, [[30, 100, 1.6], [101, 18, 1.3], [70, 60, 1]]], [173, [[44, 140, 2], [150, 52, 1.6], [96, 96, 1.2]]]];
function layersSVG() {
  const defs = LAYERS.map(([n, dots], i) => `<pattern id="skyP${i + 1}" width="${n}" height="${n}" patternUnits="userSpaceOnUse">${dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</pattern>`).join('');
  return `<defs>${defs}</defs><g class="sky-layers" aria-hidden="true">${LAYERS.map((_, i) => `<rect class="sky-layer sky-layer-${i + 1}" x="-40" y="-40" width="${SKY_SIZE + 80}" height="${SKY_SIZE + 80}" fill="url(#skyP${i + 1})"/>`).join('')}</g>`;
}
/* A Trick's Stars joined 1 to 2 to 3, and a Sutra's Tricks joined at their Star 1. A segment glows when both ends are lit. */
function linesSVG(st) {
  const seg = (a, b) => { const [x1, y1] = starAt(a), [x2, y2] = starAt(b); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${st.lit[a] && st.lit[b] ? ' class="on"' : ''}/>`; };
  return `<g class="sky-lines" aria-hidden="true">${CONSTELLATIONS.map(c => c.tricks.map((t, i) => seg(`${t}:1`, `${t}:2`) + seg(`${t}:2`, `${t}:3`) + (i ? seg(`${c.tricks[0]}:1`, `${t}:1`) : '')).join('')).join('')}</g>`;
}
/* Sutra names under each Constellation (All places says the same in a list) */
function namesSVG() {
  return `<g class="sky-names" aria-hidden="true">${CONSTELLATIONS.map(c => {
    const [x, y] = SKY_LAYOUT[c.id].label, lines = labelLines(c.sutra);
    return `<text x="${x}" y="${y}" lang="sa-Latn">${lines.map((l, i) => `<tspan x="${x}" dy="${i ? 17 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
  }).join('')}</g>`;
}
function starSVG(k, state, next, fresh) {
  const [x, y] = starAt(k);
  return `<a class="sky-star sky-star--${state}${next ? ' sky-star--next' : ''}${fresh ? ' sky-star--new' : ''}" href="${href(k)}" data-star="${k}" aria-label="${esc(starName(k, state))}" transform="translate(${x} ${y})">`
    + '<circle class="sky-hit" r="24"/><circle class="sky-glow" r="19"/><circle class="sky-focus" r="23"/>'
    + (state === 'skipped' ? '<circle class="sky-skipring" r="18"/>' : '')
    + `<path class="sky-shape" d="${STAR_D}"/>`
    + (state === 'skipped' ? '<g class="sky-skipb" transform="translate(15 13)"><circle r="8"/><path d="M-4.5-3.5l3.5 3.5-3.5 3.5M.5-3.5l3.5 3.5-3.5 3.5"/></g>' : '')
    + '</a>';
}
/* Small line drawings for the Landmarks, in currentColor */
const P = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const MARK_ART = {
  arena: `<ellipse cx="24" cy="24" rx="20" ry="12" ${P}/><ellipse cx="24" cy="24" rx="11" ry="5" ${P}/><path d="M24 12v7M8 30l5-3" ${P}/>`,
  duel: `<rect x="6" y="10" width="36" height="28" rx="3" ${P}/><path d="M6 18h36M6 26h36M6 34h36" ${P} stroke-width="1.6"/><path d="M6 10V6M42 10V6" ${P}/>`,
  games: `<path d="M14 42V12a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v30" ${P}/><rect x="17" y="12" width="14" height="10" rx="2" ${P}/><path d="M10 42h28M20 30v6M17 33h6" ${P}/><circle cx="29" cy="32" r="1.6" fill="currentColor"/>`,
  watch: `<path d="M8 36a16 16 0 0 1 32 0z" ${P}/><path d="M24 20l12-10M6 40h36M30 36v4M18 36v4" ${P}/>`,
  learn: `<path d="M8 40V12M8 12h7v28M15 16h7v24M22 14l7-2 6 26-7 2z" ${P}/><path d="M6 40h36" ${P}/>`
};
const pct = v => `${r1((v / SKY_SIZE) * 100)}%`;
const landmarksHTML = () => LANDMARKS.map(m => `<a class="sky-mark" href="${m.href}" data-landmark="${m.id}" style="left:${pct(m.at[0])};top:${pct(m.at[1])}"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${MARK_ART[m.id]}</svg><span>${m.name}</span></a>`).join('');

/* ---------- The Sky ---------- */
/* Draws the Sky in root. focus: the key of a Star to focus once (the Star just played, from its Back button). */
export function skyView(root, { signal, focus = null } = {}) {
  const st = store.starStates(), next = upcoming(st, startBelt(), 3), sugg = next[0] || null;
  const fresh = k => !!(focus === k && st.lit[k] && Date.now() - st.lit[k] < 5 * 60 * 1000);
  const path = next.length > 1 ? `<path class="sky-path" aria-hidden="true" d="${next.map((k, i) => `${i ? 'L' : 'M'}${starAt(k).join(' ')}`).join(' ')}"/>` : '';
  const at = sugg && boltSpot(sugg), lit = Object.keys(st.lit).filter(k => PATH.includes(k)).length;
  root.innerHTML = `<div class="sky-head"><div><span class="md-tag md-tag--plum">Star Quest</span><h1 class="md-heading sky-h">Your Sky</h1></div><a class="md-btn" href="#/places" id="skyPlaces">All places</a></div>
    <p class="sky-next" id="skyNext">${sugg ? `${fx.copy('sky.suggests')} <a href="${href(sugg)}">${esc(title(parseKey(sugg).trick))}, Star ${parseKey(sugg).n}</a>. ${fx.copy('sky.next')}` : fx.copy('sky.allLit')} <span class="sky-count">${lit} of ${PATH.length} Stars lit.</span></p>
    <div class="sky-frame" id="skyFrame"><div class="sky${fx.noMotion() ? ' still' : ''}" id="sky">
      <svg class="sky-svg" viewBox="0 0 ${SKY_SIZE} ${SKY_SIZE}" role="group" aria-label="The Sky: ${CONSTELLATIONS.length} Constellations, ${PATH.length} Stars">
        ${layersSVG()}${wheelSVG()}${linesSVG(st)}${path}${namesSVG()}
        <g class="sky-stars">${PATH.map(k => starSVG(k, stateOf(st, k), k === sugg, fresh(k))).join('')}</g>
      </svg>
      ${at ? `<div class="sky-bolt" data-at="${sugg}" style="left:${pct(at[0] - BOLT_BOX[0] / 2)};top:${pct(at[1] - BOLT_BOX[1] / 2)};width:${pct(BOLT_BOX[0])}" aria-hidden="true">${boltHTML('idle')}</div>` : ''}
      ${landmarksHTML()}
    </div></div>
    <ul class="sky-legend" aria-label="Key"><li><svg viewBox="-16 -16 32 32" aria-hidden="true"><path class="sky-shape sky-shape--lit" d="${STAR_D}"/></svg>Lit</li><li><svg viewBox="-24 -24 48 48" aria-hidden="true"><circle class="sky-skipring" r="18"/><path class="sky-shape" d="${STAR_D}"/></svg>Skipped</li><li><svg viewBox="-16 -16 32 32" aria-hidden="true"><path class="sky-shape" d="${STAR_D}"/></svg>Not lit yet</li></ul>`;

  /* Parallax: the three layers shift a few units with the pointer and the scroll; never under no motion */
  const sky = root.querySelector('#sky'), frame = root.querySelector('#skyFrame'), layers = [...root.querySelectorAll('.sky-layer')];
  let px = 0, py = 0;
  const shift = () => layers.forEach((l, i) => l.setAttribute('transform', `translate(${r1(px * (i + 1) * 7)} ${r1(py * (i + 1) * 7)})`));
  const still = () => { const s = fx.noMotion(); sky.classList.toggle('still', s); if (s) { px = py = 0; shift(); } };
  on(sky, 'pointermove', e => { if (fx.noMotion()) return; const r = sky.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5; shift(); }, signal, { passive: true });
  const scrolled = () => { if (fx.noMotion()) return; const r = sky.getBoundingClientRect(); py = Math.max(-1, Math.min(1, r.top / (innerHeight || 1))) * -0.6; px = frame.scrollLeft / (frame.scrollWidth || 1); shift(); };
  on(window, 'scroll', scrolled, signal, { passive: true });
  on(frame, 'scroll', scrolled, signal, { passive: true });
  on(document, 'sitemotion', still, signal);
  on(document, 'vmcalm', still, signal); /* Calm (game-shell-and-calm) */
  try { on(matchMedia('(prefers-reduced-motion: reduce)'), 'change', still, signal); } catch (e) {}

  /* A narrow frame starts with Bolt's Star (or, back from a Star, that Star) in the middle. Back to the Sky focuses
     the Star just played. */
  const a = focus && root.querySelector(`.sky-star[data-star="${focus}"]`), mid = (a && focus) || sugg;
  if (mid) frame.scrollLeft = Math.max(0, (starAt(mid)[0] / SKY_SIZE) * frame.scrollWidth - frame.clientWidth / 2);
  if (a) {
    a.focus({ preventScroll: true });
    const r = a.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) a.scrollIntoView({ block: 'center', inline: 'nearest' });
  }
}

/* ---------- All places ---------- */
const OTHER = [['#/dojo', 'Dojo', 'Belts, Tricks and Katas'], ['#/sutras', 'Sutra cards', 'All 29 sutras and sub-sutras'], ['#/tower', 'Challenge tower', '1,000 challenges in 40 chapters'], ['#/me', 'Me', 'Badges, players and settings'], ['#/tiles', 'The tile home', 'The home before the Sky']];
/* The Sutra card a Constellation names (its Tricks share it), for the Say it button (openspec sutra-pronunciation) */
const sutraOf = c => (TRICKS.find(t => t.id === c.tricks[0]) || {}).sutraId;
export function placesHTML() {
  const st = store.starStates(), sugg = upcoming(st, startBelt(), 1)[0] || null;
  const stars = t => `<ul class="places-stars">${[1, 2, 3].map(n => { const k = `${t}:${n}`, s = stateOf(st, k); return `<li><a class="places-star places-star--${s}" href="${href(k)}" aria-label="${esc(starName(k, s))}">Star ${n}, ${STATE_WORD[s]}</a>${k === sugg ? ' <small class="places-next">Bolt suggests this one</small>' : ''}</li>`; }).join('')}</ul>`;
  return `<p class="md-lede">Every place in the app as a plain list. Each Sutra is a Constellation, and each of its Tricks has three Stars. Every Star is open.</p>
    ${CONSTELLATIONS.map(c => `<section class="places-c" aria-labelledby="pc-${c.id}"><h2 class="mq-strand places-h" id="pc-${c.id}"><span lang="sa-Latn">${esc(c.sutra)}</span> ${sayButton(sutraOf(c))} <small>${esc(c.meaning)}</small></h2>${respellHTML(sutraOf(c), 'p')}
      <ul class="places-tricks">${c.tricks.map(t => `<li><b>${esc(title(t))}</b>${stars(t)}</li>`).join('')}</ul></section>`).join('')}
    <h2 class="mq-strand" id="placesMarks">Landmarks</h2>
    <ul class="places-list" aria-labelledby="placesMarks">${LANDMARKS.map(m => `<li><a href="${m.href}">${m.name}</a> <small>the ${m.what}</small></li>`).join('')}</ul>
    <h2 class="mq-strand" id="placesOther">Other places</h2>
    <ul class="places-list" aria-labelledby="placesOther">${OTHER.map(([h, n, d]) => `<li><a href="${h}">${n}</a> <small>${d}</small></li>`).join('')}</ul>`;
}
