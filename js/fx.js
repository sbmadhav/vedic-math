/* The fun layer: play modes, sound effects, read-aloud, celebrations (js/celebrate.js) and toasts.
   Sounds are generated in the browser and only follow a tap. Motion respects reduced-motion settings. */
import * as store from './store.js';
import * as voice from './voice.js';

/* ---------- Play modes (by vibe, not by age label on screen) ---------- */
export const MODES = {
  explorer: { name: 'Explorer', ages: 'About 4 to 7', blurb: 'Big buttons, pictures, counting, read-aloud.', color: 'sun', grades: ['K', 1, 2], league: 'explorer' },
  challenger: { name: 'Challenger', ages: 'About 8 to 12', blurb: 'Speed tricks, belts, daily challenges.', color: 'sky', grades: [3, 4, 5, 6, 7, 8], league: 'challenger' },
  pro: { name: 'Pro', ages: '13 to adult', blurb: 'Algebra to calculus, sutra deep dives, leaderboards.', color: 'plum', grades: [8, 9, 10, 11, 12], league: 'pro' }
};
export const mode = () => store.player().mode;
/* A pick (a Mode card, a card's Try a trick, a Mode link or Me). It also clears a Mode guess an older Try a trick left
   on the Player record (openspec try-trick-in-modes: nothing guesses a Mode any more). */
export function setMode(m) {
  store.setPlayerMode(m); applyMode();
  try { window.siteTrack && window.siteTrack('math/mode/' + m, 'Vedic Math mode: ' + m); } catch (e) {}
}
export function applyMode() {
  const m = mode() || 'none';
  document.body.classList.remove('mode-explorer', 'mode-challenger', 'mode-pro', 'mode-none');
  document.body.classList.add('mode-' + m);
  // Explorer and Challenger read the friendlier copy; Pro reads the grown-up copy
  document.body.classList.toggle('kidmode', m === 'explorer' || m === 'challenger'); // page-local wording only; the portfolio's kid mode setting is untouched
}
/* Pick copy by mode: t({ explorer, challenger, pro }) */
export const t = o => o[mode()] ?? o.challenger ?? o.pro ?? Object.values(o)[0];

/* ---------- Settings ---------- */
const pref = (k, d) => { try { const v = localStorage.getItem('vm.' + k); return v === null ? d : v === '1'; } catch (e) { return d; } };
const setPref = (k, v) => { try { localStorage.setItem('vm.' + k, v ? '1' : '0'); } catch (e) {} };
export const soundOn = () => pref('sound', true);
export const setSound = v => setPref('sound', v);
export const voiceOn = () => pref('voice', mode() === 'explorer');
export const setVoice = v => { setPref('voice', v); if (v) voice.warmStudio(); };
/* Once at start: when read aloud is on, the studio voice's core pack loads while the page is idle */
export const warmVoice = () => { if (voiceOn()) voice.warmStudio(); };
/* Home's More ways to play disclosure (openspec first-visit): closed until opened once on this device */
export const homeMoreOpen = () => pref('homeMore', false);
export const setHomeMoreOpen = v => setPref('homeMore', v);
/* Reduced motion: the device setting, or Pause motion (html.motion-paused, WCAG 2.2.2) */
export const motionOff = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-paused');

/* ---------- Pause motion (openspec accessibility): one device setting for every page of this site ----------
   Sets html.motion-paused, which every page treats like the reduced-motion setting, and saves it under
   motion-paused ('1'), which each page's first inline script applies before paint. The switch is on the Me page and
   in the Calm and sound panel. Fires sitemotion so moving things stop or start at once. */
export const MOTION_KEY = 'motion-paused';
export const motionPaused = () => document.documentElement.classList.contains('motion-paused');
export function setMotionPaused(on) {
  on = !!on;
  document.documentElement.classList.toggle('motion-paused', on);
  try { if (on) localStorage.setItem(MOTION_KEY, '1'); else localStorage.removeItem(MOTION_KEY); } catch (e) {}
  try { document.dispatchEvent(new CustomEvent('sitemotion', { detail: { paused: on } })); } catch (e) {}
  /* The Me page and every Calm and sound panel (js/ambient.js) have the switch; all show the same state */
  document.querySelectorAll('.vm-motion, #setMotion').forEach(b => b.setAttribute('aria-checked', String(on)));
  announce(on ? 'Pause motion on. Nothing moves.' : 'Pause motion off.');
}

/* ---------- Calm (openspec game-shell-and-calm): one device preference, vm.calm ----------
   Calm takes the clock off Practice rounds and stops all motion. Ranked rounds keep their clock. It is per device,
   like sound and Pause motion: motion sensitivity belongs to whoever holds the device. Pause motion never
   sets Calm, and Calm never sets html.motion-paused; each control owns its own state. */
export const calmOn = () => { try { return localStorage.getItem('vm.calm') === '1'; } catch (e) { return false; } };
export function setCalm(on) {
  on = !!on;
  try { localStorage.setItem('vm.calm', on ? '1' : '0'); } catch (e) {}
  applyPrefs();
  try { document.querySelectorAll('#setCalm, .vm-calm, .play-calm').forEach(b => b.setAttribute('aria-checked', String(on))); } catch (e) {} /* the same switch on Me, in the Calm and sound panel and in the play shell */
  try { document.dispatchEvent(new CustomEvent('vmcalm', { detail: { on } })); } catch (e) {}
  announce(on ? 'Calm on. No clocks in Practice, no motion.' : 'Calm off.');
}
/* No motion at all: reduced motion on the device, Pause motion, or Calm. The same steps and messages
   appear, without movement. This is the one check every moving thing in the app asks. */
export const noMotion = () => motionOff() || calmOn();
/* Calls fn whenever any source of noMotion() may have changed: the reduced-motion media query, Pause motion (its
   sitemotion event, setMotionPaused) and Calm (vmcalm). Stops when signal aborts. */
export function onMotionChange(fn, signal) {
  const opts = { signal };
  try { const mq = matchMedia('(prefers-reduced-motion: reduce)'); if (mq && mq.addEventListener) mq.addEventListener('change', fn, opts); } catch (e) {}
  document.addEventListener('sitemotion', fn, opts);
  document.addEventListener('vmcalm', fn, opts);
}

/* ---------- Text size: A (normal) or A+ (larger) on play screens, vm.text ---------- */
export const textSize = () => { try { return localStorage.getItem('vm.text') === 'a+' ? 'a+' : 'a'; } catch (e) { return 'a'; } };
export function setTextSize(size) {
  const v = size === 'a+' ? 'a+' : 'a';
  try { localStorage.setItem('vm.text', v); } catch (e) {}
  applyPrefs();
  try { document.dispatchEvent(new CustomEvent('vmtext', { detail: { size: v } })); } catch (e) {}
  announce(v === 'a+' ? 'Larger text.' : 'Normal text.');
}
/* body.calm and body.text-plus follow the saved preferences (called at start and after every change) */
export function applyPrefs() {
  const b = document.body; if (!b || !b.classList) return;
  b.classList.toggle('calm', calmOn()); b.classList.toggle('text-plus', textSize() === 'a+');
}

/* ---------- Screen-reader announcements ---------- */
/* One polite live region (#vmLive in index.html). Cleared first so a repeat is read again; messages sent in the same
   moment are read together, once. */
let said = [], sayTimer = 0;
export function announce(text) {
  const el = document.getElementById('vmLive'); if (!el || !text) return;
  said.push(String(text).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()); el.textContent = '';
  clearTimeout(sayTimer); sayTimer = setTimeout(() => { el.textContent = said.join(' '); said = []; }, 50);
}

/* ---------- Sound ---------- */
let ctx = null;
function tone(freq, start, dur, type = 'sine', vol = 0.12) {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
export function sfx(kind) {
  if (!soundOn() || document.hidden) return;
  if (kind === 'tick' && calmOn()) return; /* Calm: no countdown ticks, in Ranked rounds too */
  try {
    if (kind === 'ok') { tone(660, 0, .12, 'triangle'); tone(990, .09, .18, 'triangle'); }
    else if (kind === 'no') { tone(220, 0, .18, 'sawtooth', .05); }
    else if (kind === 'tap') { tone(520, 0, .06, 'square', .04); }
    else if (kind === 'pop') { tone(880, 0, .05, 'square', .06); tone(1320, .03, .06, 'sine', .05); }
    else if (kind === 'level') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .1, .22, 'triangle')); }
    else if (kind === 'badge') { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * .08, .2, 'sine', .1)); }
    else if (kind === 'tick') { tone(1000, 0, .03, 'square', .03); }
  } catch (e) {}
}

/* ---------- Read-aloud (Explorer mode) ---------- */
export function speak(text, force = false) {
  if (!(force || voiceOn()) || !voice.supported()) return;
  try { voice.speak(text); } catch (e) {} // voice.js: math-aware wording, best built-in voice, or the opt-in natural voice
}
/* A question's spoken words: its optional say (for a question whose screen text leans on a picture), else its q */
export const speakQuestion = (p, force = false) => speak(p.say || p.q, force);
export const stopSpeaking = () => voice.stop();
export const loadVoices = () => voice.loadVoices();
export { settingsHTML as voiceSettingsHTML, wireSettings as wireVoiceSettings } from './voice.js';

/* ---------- Celebrations (openspec celebrations): js/celebrate.js ----------
   confetti(n) is the big burst, for true wins only; the small ones are for everyday moments. All are no-ops
   under no motion (noMotion() above uses the same rule). */
export { confetti, sparkle, pop, bounce, twinkle, wiggle, tick, cheer, rollUp, rollSparks } from './celebrate.js';

/* ---------- Held input (openspec change muse-review-polish): js/hold.js ----------
   hold(el, ms, then, { skippable, signal }) replaces later(then, ms, signal) where a round holds input for feedback:
   a bar under the keypad after 1.2 s, and Next (Enter) in untimed rounds from 2 s. */
export { hold } from './hold.js';

/* ---------- Toasts ---------- */
/* Which edge the toasts sit on (openspec find-and-home-polish): the bottom, unless a primary action is there. A round's
   number pad or answer choices (PADS) hold the lower part of the screen and move as feedback shows, so while one is on
   screen the toasts go to the top; another primary action (PRIMARY) sends them up when it is in the bottom band they
   would cover, with 12 px to spare, and the top band is clearer. Pure: H the viewport height, boxH the toasts' height,
   rects the primary actions' { top, bottom, pad } in viewport pixels. */
export const PADS = '.star-pad, .ar-pad, .star-choices, .ar-choices';
export const PRIMARY = '.md-btn--primary';
export function toastSide(H, boxH, rects, { edge = 20, top = 8, clear = 12 } = {}) {
  if (rects.some(r => r.pad)) return 'top';
  const cover = (a, b) => rects.reduce((n, r) => n + Math.max(0, Math.min(b, r.bottom) - Math.max(a, r.top)), 0);
  const low = cover(H - edge - boxH - clear, H);
  if (!low) return 'bottom';
  return cover(0, top + boxH + clear) < low ? 'top' : 'bottom';
}
function placeToasts(box) {
  try {
    const H = innerHeight, seen = (sel, pad) => [...document.querySelectorAll(sel)].filter(e => !e.closest('[hidden]')).map(e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width, h: r.height, pad }; }).filter(r => r.w > 0 && r.h > 0 && r.bottom > 0 && r.top < H);
    box.classList.toggle('at-top', toastSide(H, box.getBoundingClientRect().height, [...seen(PADS, true), ...seen(PRIMARY, false)]) === 'top');
  } catch (e) { /* no layout (tests): the toasts stay at the bottom */ }
}
export function toast(html, tone = '') {
  /* A modal dialog (the video player, a deep dive) sits in the top layer above everything in the body, so a toast
     fired while one is open (the Video learner badge after a minute of play) goes inside it, where it can be seen */
  const dialogs = document.querySelectorAll('dialog[open]'), host = dialogs.length ? dialogs[dialogs.length - 1] : document.body;
  let box = document.querySelector('.fx-toasts'); if (!box) { box = document.createElement('div'); box.className = 'fx-toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); }
  if (box.parentElement !== host) host.append(box);
  const el = document.createElement('div'); el.className = 'fx-toast ' + tone; el.innerHTML = html; box.append(el);
  placeToasts(box); setTimeout(() => placeToasts(box), 300); /* again once the answer's feedback has moved the page */
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3200);
}
