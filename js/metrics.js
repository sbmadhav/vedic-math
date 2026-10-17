/* Anonymous usage counts (openspec analytics spec). Every event goes through window.siteTrack, the shared
   GoatCounter helper of sbmadhav.com (/assets/analytics.js: no cookies, off with Do Not Track or Global
   Privacy Control, off on localhost), with the math/ prefix.
   Events carry no identifiers: paths are built only from fixed words, route names, catalog ids (skills,
   games, grades, tricks, sutras), Leagues and the fixed buckets below. Never a Player id, Nickname, avatar,
   Score, Age answer, Board identity, seed, count, time value or typed text.
   Two device-level flags stay in this browser and are never sent: vm.firstSeen (when this device first
   opened the app) and vm.metrics (which once-per-device events have gone). */

import { TRICKS } from './vedic.js';

const FIRST = 'vm.firstSeen', FLAGS = 'vm.metrics';
export const LEAGUES = ['explorer', 'challenger', 'pro'];
export const ANSWER_AREAS = ['practice', 'run', 'kata', 'star'];
export const ROUND_AREAS = ['arena', 'game', 'tower', 'duel'];
export const SHARE_SURFACES = ['result', 'challenge-link'];
export const WIN_BUCKETS = ['under-30', '30-60', '60-90', '90-180', 'over-180'];
export const STAR_EVENTS = ['lit', 'skipped', 'comeback', 'dare_taken', 'dare_won'];
export const TOUR_EVENTS = ['start', 'finish', 'skip'];
const ID = /^[a-z0-9][a-z0-9_-]{0,40}$/;

const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const flags = () => { try { return JSON.parse(get(FLAGS)) || {}; } catch (e) { return {}; } };
const setFlag = f => { const m = flags(); m[f] = true; put(FLAGS, JSON.stringify(m)); };

/* The one place an event leaves: the shared helper, always safe to call. Titles are fixed words too.
   index.html runs this module before the deferred /assets/analytics.js that defines siteTrack, so events
   from the first render wait here (at most 20) until the page has parsed, then go; if the helper never
   arrives (blocked, offline) they are dropped. */
const early = [];
function flush() { const q = early.splice(0); if (window.siteTrack) for (const [p, t] of q) try { window.siteTrack(p, t); } catch (e) {} }
function send(path, title) {
  if (!/^[a-z0-9_/:-]+$/.test(path)) return;
  try {
    if (window.siteTrack) return window.siteTrack('math/' + path, title);
    if (early.length >= 20 || typeof addEventListener !== 'function') return;
    if (!early.length) { if (document.readyState === 'loading') addEventListener('DOMContentLoaded', flush, { once: true }); addEventListener('load', flush, { once: true }); }
    early.push(['math/' + path, title]);
  } catch (e) {}
}

/* ---------- Route views ---------- */
/* [route, template]: the template's {1} and {2} are captures checked against the catalog (known);
   numeric captures never appear, they become the fixed word in the template. */
const ROUTES = [
  [/^#?\/?$/, 'home'],
  [/^#\/learn$/, 'learn'],
  [/^#\/grade\/(\w+)$/, 'grade/{grade:1}'],
  [/^#\/skill\/([\w-]+)$/, 'skill/{skill:1}'],
  [/^#\/mix\/(\w+)$/, 'mix/{grade:1}'],
  [/^#\/run\/(\w+)$/, 'run/{grade:1}'],
  [/^#\/dojo$/, 'dojo'],
  [/^#\/tricks$/, 'tricks'],
  [/^#\/katas\/([\w-]+)$/, 'katas/{trick:1}'],
  [/^#\/kata\/([\w-]+)\/\d+$/, 'kata/{trick:1}/kata'],
  [/^#\/star\/([\w-]+)\/\d+$/, 'star/{trick:1}/star'],
  [/^#\/tower$/, 'tower'],
  [/^#\/tower\/\d+$/, 'tower/chapter'],
  [/^#\/challenge\/\d+$/, 'challenge/challenge'],
  [/^#\/sutras$/, 'sutras'],
  [/^#\/sutras\/(\w+)$/, 'sutras/{sutra:1}'],
  [/^#\/arena$/, 'arena'],
  [/^#\/duel$/, 'duel'],
  [/^#\/games$/, 'games'],
  [/^#\/game\/([\w-]+)$/, 'game/{game:1}'],
  [/^#\/game\/([\w-]+)\/\d+$/, 'game/{game:1}/level'],
  [/^#\/watch$/, 'watch'],
  [/^#\/places$/, 'places'],
  [/^#\/tiles$/, 'tiles'],
  [/^#\/me$/, 'me'],
  [/^#\/progress$/, 'progress'],
  [/^#\/guide$/, 'guide'],
  [/^#\/guide\/[\w-]+$/, 'guide/section'],
];
/* The route-view path for a hash, or 'other'. known(kind, id) says whether id is in that catalog; an id
   that is not (a typed or stale link) becomes 'unknown', so nothing typed is ever sent. */
export function routePath(hash, known = () => false) {
  const h = hash || '#/';
  for (const [re, tpl] of ROUTES) {
    const m = h.match(re); if (!m) continue;
    return tpl.replace(/\{(\w+):(\d)\}/g, (_, kind, i) => {
      const id = String(m[+i]);
      return known(kind, id) && ID.test(id.toLowerCase()) ? id.toLowerCase() : 'unknown';
    });
  }
  return 'other';
}
/* One route view per rendered route. picker: the Mode picker was shown instead of the route; sky: home showed the
   Sky (openspec sky-home), so the view is sky instead of home. */
export function view(hash, known, picker = false, sky = false) {
  const p = picker ? 'pick-mode' : routePath(hash, known);
  send('view/' + (p === 'home' && sky ? 'sky' : p), 'Vedic Math: page view');
}

/* ---------- Star Quest (openspec sky-home) ---------- */
/* A Star lit or skipped, a Comeback, a Dare taken or won in a Star round, on one Trick. Stars lit by the one-time
   migration of Kata progress send nothing (js/sky.js migrateSky never calls this). */
export function starEvent(kind, trick) {
  if (!STAR_EVENTS.includes(kind) || !TRICKS.some(t => t.id === trick)) return;
  send(`star/${kind}/${trick}`, 'Vedic Math: star quest');
}

/* ---------- Listen buttons (openspec explanation-audio) ---------- */
/* A Listen button was pressed to play an explanation. One fixed event: which explanation is never sent */
export function listened() { send('listen/explanation', 'Listen to an explanation'); }

/* ---------- The first-visit tour (openspec in-app-guide) ---------- */
/* The tour opened, or ended with Done on its last step (finish) or with Skip tour, Escape or leaving Home (skip) */
export function tourEvent(kind) {
  if (TOUR_EVENTS.includes(kind)) send('tour/' + kind, 'Vedic Math: tour');
}

/* ---------- Answers in untimed play (Practice, Endless runs, Katas, Star rounds) ---------- */
export function answered(area, ok) {
  if (!ANSWER_AREAS.includes(area)) return;
  send(`q_answered/${area}/${ok ? 'right' : 'miss'}`, 'Vedic Math: question answered');
  if (ok) firstWinCheck();
}

/* ---------- Timed rounds ---------- */
/* Rounds ended per area in this page load (a visit). A round that is stopped or left sends nothing. */
const ended = {}, second = {};
export function roundStart(area) {
  if (!ROUND_AREAS.includes(area)) return;
  if (ended[area] === 1 && !second[area]) { second[area] = true; send(`round2_start/${area}`, 'Vedic Math: second round started'); }
}
export function roundEnd(area, league) {
  if (!ROUND_AREAS.includes(area) || !LEAGUES.includes(league)) return;
  const n = ended[area] = (ended[area] || 0) + 1;
  send(`round_end/${area}/${league}/${n === 1 ? 'r1' : n === 2 ? 'r2' : 'r3plus'}`, 'Vedic Math: round ended');
}
export function _resetVisit() { for (const o of [ended, second]) for (const k of Object.keys(o)) delete o[k]; }

/* ---------- Once per device ---------- */
export function winBucket(ms) {
  const s = ms / 1000;
  return s < 30 ? 'under-30' : s < 60 ? '30-60' : s < 90 ? '60-90' : s < 180 ? '90-180' : 'over-180';
}
/* The first right answer ever on this device, with the time since the device first opened the app, bucketed */
export function firstWinCheck(now = Date.now()) {
  if (flags().firstWin) return;
  const first = Number(get(FIRST));
  setFlag('firstWin');
  if (first) send('first_win/' + winBucket(Math.max(0, now - first)), 'Vedic Math: first right answer');
}
const dayNo = t => { const d = new Date(t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
/* Has this browser played before vm.firstSeen existed? Then its first visit and first win are unknown. */
function playedBefore() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('mathquest.v1')) { const d = JSON.parse(localStorage.getItem(k)); if (d && (d.sparks > 0 || d.xp > 0 || (d.counts && d.counts.answers > 0))) return true; /* xp: saved before Sparks */ }
    }
  } catch (e) {}
  return false;
}
/* At boot: remember the first visit, then send return_d1 (the next calendar day) and return_d7 (7 to 13
   days after) once each. A device that played before this existed is marked as done for all three, so
   old devices never count as new ones. */
export function returnCheck(now = Date.now()) {
  const first = Number(get(FIRST));
  if (!first) {
    put(FIRST, String(now));
    if (playedBefore()) { const m = flags(); m.firstWin = m.d1 = m.d7 = true; put(FLAGS, JSON.stringify(m)); }
    return;
  }
  const f = flags(), days = dayNo(now) - dayNo(first);
  if (days === 1 && !f.d1) { setFlag('d1'); send('return_d1', 'Vedic Math: back the next day'); }
  if (days >= 7 && days <= 13 && !f.d7) { setFlag('d7'); send('return_d7', 'Vedic Math: back after a week'); }
}

/* ---------- Share actions (none yet; Phase 2 share buttons call this) ---------- */
export function shareClick(surface) {
  if (SHARE_SURFACES.includes(surface)) send('share_click/' + surface, 'Vedic Math: share');
}
