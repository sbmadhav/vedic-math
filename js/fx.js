/* The fun layer: play modes, sound effects, read-aloud, confetti and toasts.
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
export function setMode(m) {
  store.updatePlayer({ mode: m }); applyMode();
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
/* Reduced motion: the device setting, or Pause motion in the site's Explore menu (html.motion-paused, WCAG 2.2.2) */
export const motionOff = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-paused');

/* ---------- Calm (openspec game-shell-and-calm): one device preference, vm.calm ----------
   Calm takes the clock off Practice rounds and stops all motion. Ranked rounds keep their clock. It is per device,
   like sound and the site's Pause motion: motion sensitivity belongs to whoever holds the device. Pause motion never
   sets Calm, and Calm never sets html.motion-paused; each control owns its own state. */
export const calmOn = () => { try { return localStorage.getItem('vm.calm') === '1'; } catch (e) { return false; } };
export function setCalm(on) {
  on = !!on;
  try { localStorage.setItem('vm.calm', on ? '1' : '0'); } catch (e) {}
  applyPrefs();
  try { document.dispatchEvent(new CustomEvent('vmcalm', { detail: { on } })); } catch (e) {}
  announce(on ? 'Calm on. No clocks in Practice, no motion.' : 'Calm off.');
}
/* No motion at all: reduced motion on the device, the site's Pause motion, or Calm. The same steps and messages
   appear, without movement. This is the one check every moving thing in the app asks. */
export const noMotion = () => motionOff() || calmOn();
const reduced = noMotion;
/* Calls fn whenever any source of noMotion() may have changed: the reduced-motion media query, the site's
   sitemotion event (explore.js) and Calm (vmcalm). Stops when signal aborts. */
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
export const stopSpeaking = () => voice.stop();
export { settingsHTML as voiceSettingsHTML, wireSettings as wireVoiceSettings } from './voice.js';

/* ---------- Confetti ---------- */
export function confetti(n = 70) {
  if (reduced()) return;
  const c = document.createElement('canvas'); c.className = 'fx-confetti'; c.width = innerWidth; c.height = innerHeight; document.body.append(c);
  const g = c.getContext('2d'), css = getComputedStyle(document.body), cols = ['--coral', '--teal', '--sun', '--sky', '--plum'].map(v => css.getPropertyValue(v).trim() || '#F2B544');
  const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, s: Math.random() * .3 - .15 }));
  let f = 0; const step = () => { g.clearRect(0, 0, c.width, c.height); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; p.vx *= .99; p.a += p.s; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6); g.restore(); }); if (++f < 110) requestAnimationFrame(step); else c.remove(); };
  requestAnimationFrame(step);
}

/* ---------- Toasts ---------- */
export function toast(html, tone = '') {
  let box = document.querySelector('.fx-toasts'); if (!box) { box = document.createElement('div'); box.className = 'fx-toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const el = document.createElement('div'); el.className = 'fx-toast ' + tone; el.innerHTML = html; box.append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3200);
}
