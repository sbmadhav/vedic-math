/* Shared kit for the play experiences (Spellbook, Locks, Tala Lab and the rest, js/play/catalog.js): DOM helpers,
   seeded randomness, storage, sound, sharing and analytics. Pure helpers (rng, seeds, dates) have no DOM use, so node tests can import them. */
import { SITE, APP_BASE } from '../../shared/src/site.ts';

/* ---------- DOM ---------- */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* The app's one motion rule (fx.noMotion): the device setting, the site's Pause motion, or Calm */
export const reducedMotion = () => (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  || (typeof document !== 'undefined' && document.documentElement.classList.contains('motion-paused'))
  || (() => { try { return localStorage.getItem('vm.calm') === '1'; } catch (e) { return false; } })();
export const isDark = () => { const th = document.documentElement.dataset.theme; return th === 'dark' || (th !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); };
/* Read a design token (for canvas drawing, which cannot use var()) */
export const token = name => getComputedStyle(document.body).getPropertyValue(name).trim();
/* Announce to screen readers */
export function say(text) { const el = typeof document !== 'undefined' && document.getElementById('vmLive'); if (el) { el.textContent = ''; el.textContent = text; } }

/* ---------- Randomness: everything shareable is seeded ---------- */
export function hashSeed(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return (h ^ (h >>> 16)) >>> 0; }
/* mulberry32: rng() in [0, 1) */
export function rng(seed) { let a = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/* Seeds carry a version, so editing a generator never silently changes a shared or daily puzzle */
export const seedOf = (kind, key, v = 1) => `v${v}:${kind}:${key}`;

/* ---------- Dates (local time) ---------- */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const LAUNCH = '2026-10-16';
/* Days since launch for a local day key (day 1 is launch day) */
export const dayNumber = (key = dayKey()) => Math.round((Date.parse(key + 'T12:00:00') - Date.parse(LAUNCH + 'T12:00:00')) / 864e5) + 1;

/* ---------- Storage: one JSON record per key and Player (vm.play.<player id>.<key>), so a family sharing a device
   keeps separate progress, like the rest of the app ---------- */
function activePlayer() { try { const p = JSON.parse(localStorage.getItem('vm.players')); return (p && (p.active || (p.list && p.list[0] && p.list[0].id))) || 'p'; } catch (e) { return 'p'; } }
const skey = k => `vm.play.${activePlayer()}.${k}`;
export const store = {
  get(k, fallback = null) { try { const v = JSON.parse(localStorage.getItem(skey(k))); return v ?? fallback; } catch (e) { return fallback; } },
  set(k, v) { try { localStorage.setItem(skey(k), JSON.stringify(v)); } catch (e) {} return v; },
  update(k, fn, fallback = null) { return store.set(k, fn(store.get(k, fallback))); }
};

/* Level is the active Player's Mode: explorer (about 4 to 7), challenger (8 to 12), pro (13 to adult) */
export const LEVELS = { explorer: 'Explorer', challenger: 'Challenger', pro: 'Pro' };
export function level() {
  try { const p = JSON.parse(localStorage.getItem('vm.players')); const m = p && p.list && (p.list.find(x => x.id === p.active) || p.list[0])?.mode; if (LEVELS[m]) return m; } catch (e) {}
  return 'challenger';
}
/* An experience may let the player pick a level for one session (Math Lens); the Mode is changed only on Me */
export const setLevel = () => {};
/* Pick wording by level: t({ explorer, challenger, pro }) */
export const t = o => o[level()] ?? o.challenger ?? o.pro ?? o.explorer;

/* ---------- Sound: one shared AudioContext, created on the first user gesture ---------- */
let AC = null;
export function audio() { if (!AC) { const C = globalThis.AudioContext || globalThis.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === 'suspended') AC.resume(); return AC; }
/* Leaving an experience page suspends the shared context (js/app.js playView), so no audio thread keeps a phone
   awake on the next page; audio() resumes it on the next gesture that plays a sound */
export const audioState = () => (AC ? AC.state : 'none');
export function suspendAudio() { try { if (AC && AC.state === 'running') AC.suspend(); } catch (e) {} }
/* Sound follows the app's sound setting (vm.sound, fx.soundOn) */
export const muted = () => { try { return localStorage.getItem('vm.sound') === '0'; } catch (e) { return false; } };
export const setMuted = m => { try { localStorage.setItem('vm.sound', m ? '0' : '1'); } catch (e) {} };
/* A short tone. when: seconds from now. */
export function tone(freq, { dur = 0.18, type = 'sine', gain = 0.18, when = 0, attack = 0.005 } = {}) {
  if (muted()) return; const a = audio(); if (!a) return;
  const t0 = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
/* Notes of a C major pentatonic scale from C4, so any sequence sounds pleasant */
export const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
export const sfx = name => ({
  tap: () => tone(660, { dur: 0.05, type: 'triangle', gain: 0.08 }),
  ok: () => { tone(523.25, { dur: 0.12 }); tone(783.99, { dur: 0.2, when: 0.08 }); },
  no: () => tone(196, { dur: 0.22, type: 'triangle', gain: 0.12 }),
  win: () => [0, 2, 4, 7].forEach((n, i) => tone(PENTA[n] * 1, { dur: 0.25, when: i * 0.09 })),
  magic: () => [4, 6, 8, 10].forEach((n, i) => tone(PENTA[n], { dur: 0.35, type: 'sine', gain: 0.12, when: i * 0.06 }))
}[name] || (() => {}))();

/* ---------- Sharing ---------- */
/* Where the game lives (shared/src/site.ts): every share link is built from these two, so the move to /learn/
   (openspec change indexable-routes, design D2) changes one line there. A challenge link (shared/src/challenge.ts) names
   SITE whatever host built it; shareUrl below keeps the origin it runs on. */
export { SITE, APP_BASE };
/* The share sheet first, then the clipboard with the word "Copied. Paste it anywhere." through notify (the play toast
   by default; the Arena passes the app's fx.toast, since the play stylesheet is not on its page) */
export async function share({ title = 'Vedic Math', text = '', url = '', notify = toast } = {}) {
  track('share', title);
  try { if (navigator.share) { await navigator.share({ title, text, url }); return 'shared'; } } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  try { await navigator.clipboard.writeText([text, url].filter(Boolean).join('\n')); notify('Copied. Paste it anywhere.'); return 'copied'; } catch (e) { return 'failed'; }
}
/* Save a canvas as a PNG (art studio, share cards) */
export function downloadCanvas(canvas, name = 'vedic-math.png') {
  const a = document.createElement('a'); a.download = name; a.href = canvas.toDataURL('image/png'); a.click(); track('download', name);
}
/* Base64url for state in share links (no server) */
export const b64url = {
  enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))
};
/* A share link is the route's path ('#/arena/ghosts/r/abc' to /learn/arena/ghosts/r/abc), which _redirects answers with
   the experience's page (openspec change indexable-routes, design D4) */
export const shareUrl = hash => `${location.origin}${APP_BASE}${hash.replace(/^#\//, '')}`;

/* ---------- Feedback ---------- */
export function toast(text, ms = 2600) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector('.px-toast'); if (!el) { el = document.createElement('div'); el.className = 'px-toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = text; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), ms);
}
/* Celebrations come from one place (js/celebrate.js, openspec celebrations): confetti(n) is the big burst for true
   wins only (a lock cracked, a Belt, a best, a puzzle solved); sparkle(el) and the other small ones are for everyday
   moments. All of them hold still under reduced motion, Pause motion and Calm. */
export { confetti, sparkle, pop, bounce, twinkle, wiggle, tick } from '../celebrate.js';
/* Held input (js/hold.js, openspec change muse-review-polish): hold(el, ms, then, { skippable, signal }) where an
   experience holds input for feedback, so the Player sees the wait and, in an untimed round, can press Next */
export { hold } from '../hold.js';

/* ---------- Analytics (openspec analytics spec): math/play/<experience>/<action>, fixed words only ----------
   The second argument is ignored on purpose: titles and paths never carry scores, counts, seeds or typed text. */
export function track(action) {
  if (!/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/.test(action)) return;
  try { window.siteTrack && window.siteTrack('math/play/' + action, 'Play: ' + action); } catch (e) {}
  /* The app turns some actions into Sparks and badge counts (js/app.js onPlay) */
  try { document.dispatchEvent(new CustomEvent('vmplay', { detail: { action } })); } catch (e) {}
}

/* ---------- Page chrome for an experience ---------- */
/* The router sets where Back goes (the section the experience lives in: Dojo, Arena, Games or Sutras) */
export const place = { back: { href: '#/', label: 'Home' } };
export const backLink = () => `<a class="px-back" href="${place.back.href}">&larr; ${place.back.label}</a>`;
/* Standard top of an experience: back link, title, one-line intro. Returns the HTML. */
export const head = ({ title, kicker = '', intro = '', color = 'coral' }) => `
  <div class="px-head px-head--${color}">
    ${backLink()}
    ${kicker ? `<p class="md-kicker">${kicker}</p>` : ''}
    <h1 class="md-heading px-title">${title}</h1>
    ${intro ? `<p class="md-lede px-intro">${intro}</p>` : ''}
  </div>`;
