/* Celebrations (openspec celebrations): every confetti burst and small animation in the app comes from here, so they
   stay consistent. Two sizes:
   - confetti(n): the BIG one, for true wins only (a Star lit, a Medal, a Belt, a badge, a new Title, a mastered
     skill, a first Sutra card, a personal best, a Party or game won). One burst at a time.
   - the small ones, for everyday moments (picking a Mode, a right answer, a streak, a wrong answer, Sparks):
     sparkle, pop, bounce, twinkle, wiggle, tick, cheer and rollUp.
   Rules for all of them:
   - nothing moves under no motion (the device's reduced-motion setting, Pause motion or Calm): each one is then a
     no-op, and the page already shows the end state. Turning any of the three on stops what is running at once.
   - transforms and opacity only (the individual translate, scale and rotate properties, so an element's own CSS
     transform is untouched), on fixed layers or on the element itself: no layout shift.
   - timers and frames go through js/life.js; Web Animations need neither, and are cancelled when `signal` aborts.
   - lengths are times, not frame counts, so every screen sees the same burst.
   - colours are tokens (classes in math.css; the confetti canvas reads the token values).
   This module touches only the DOM and localStorage, so js/fx.js (the app) and js/play/kit.js (the experiences) share it. */
import { later, loop, on, onAbort } from './life.js';

/* The app's one motion rule (fx.noMotion, kit.reducedMotion): reduced motion, Pause motion (html.motion-paused) or Calm (vm.calm) */
export const still = () => (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  || (typeof document !== 'undefined' && document.documentElement.classList.contains('motion-paused'))
  || (() => { try { return localStorage.getItem('vm.calm') === '1'; } catch (e) { return false; } })();

/* Everything running, so a change to Pause motion, Calm or the device setting stops it at once */
const running = new Set();
let page = null; /* one listener set for the page, added the first time something moves */
function watchMotion() {
  if (page || typeof document === 'undefined') return;
  page = new AbortController();
  const stop = () => { if (still()) [...running].forEach(s => s()); };
  try { const mq = matchMedia('(prefers-reduced-motion: reduce)'); if (mq.addEventListener) mq.addEventListener('change', stop, { signal: page.signal }); } catch (e) {}
  document.addEventListener('sitemotion', stop, { signal: page.signal });
  document.addEventListener('vmcalm', stop, { signal: page.signal });
}
const keep = stop => { running.add(stop); watchMotion(); return () => running.delete(stop); };

/* One Web Animation on el, unless nothing may move. Cancelled when signal aborts or motion is turned off. */
export function animate(el, keyframes, opts, signal) {
  if (!el || typeof el.animate !== 'function' || still() || (signal && signal.aborted)) return null;
  const a = el.animate(keyframes, { easing: 'cubic-bezier(.3,1.5,.6,1)', ...opts });
  const untrack = keep(() => a.cancel());
  const end = () => untrack();
  a.addEventListener('finish', end, { once: true }); a.addEventListener('cancel', end, { once: true });
  if (signal) onAbort(signal, () => a.cancel());
  return a;
}

/* ---------- Small: everyday moments ---------- */
/* A Mode card or a tile pops */
export const pop = (el, signal) => animate(el, { scale: [1, 1.07, .98, 1] }, { duration: 420 }, signal);
/* A right answer: a small hop */
export const bounce = (el, signal) => animate(el, { translate: ['0 0', '0 -6px', '0 0', '0 -2px', '0 0'] }, { duration: 480, easing: 'ease-out' }, signal);
/* A Star or a Sparks number twinkles */
export const twinkle = (el, signal) => animate(el, { scale: [1, 1.3, 1], rotate: ['0deg', '14deg', '0deg'], opacity: [1, .75, 1] }, { duration: 520 }, signal);
/* A wrong answer: a gentle side to side wiggle (small, not a shake) */
export const wiggle = (el, signal) => animate(el, { rotate: ['0deg', '-2deg', '2deg', '-1deg', '0deg'] }, { duration: 380, easing: 'ease-in-out' }, signal);
/* A streak number ticks up */
export const tick = (el, signal) => animate(el, { scale: [1, 1.35, 1] }, { duration: 360 }, signal);
/* The Nikhilam Family cheers: each digit hops in turn (the family SVG, js/family.js) */
export function cheer(svg, signal) {
  if (!svg) return;
  ['.lv-f-one', '.lv-f-zero', '.lv-f-nine'].forEach((s, i) => animate(svg.querySelector(s), { translate: ['0 0', '0 -7px', '0 0'] }, { duration: 420, delay: i * 90, easing: 'ease-out' }, signal));
}

/* A few sparkles fly out from the middle of el, on a fixed layer over the page */
const SPARK_COLORS = ['sun', 'coral', 'sky', 'teal', 'plum'];
export function sparkle(el, { n = 8, signal } = {}) {
  if (!el || typeof document === 'undefined' || still() || (signal && signal.aborted) || !el.getBoundingClientRect) return;
  const r = el.getBoundingClientRect(); if (!r.width && !r.height) return;
  const layer = document.createElement('div'); layer.className = 'fx-sparkles'; layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${r.left + r.width / 2}px`; layer.style.top = `${r.top + r.height / 2}px`;
  document.body.append(layer);
  let left = n;
  const done = () => { if (--left <= 0) layer.remove(); };
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); s.className = 'fx-spark fx-spark--' + SPARK_COLORS[i % SPARK_COLORS.length]; layer.append(s);
    const ang = (i / n) * Math.PI * 2 + Math.random() * .5, d = 40 + Math.random() * 36, x = Math.cos(ang) * d, y = Math.sin(ang) * d;
    const a = animate(s, { translate: ['0 0', `${x}px ${y}px`], scale: [.3, 1, .2], opacity: [1, 1, 0], rotate: ['0deg', '90deg'] }, { duration: 620 + Math.random() * 180, easing: 'cubic-bezier(.2,.7,.3,1)' }, signal);
    if (!a) { layer.remove(); return; }
    a.addEventListener('finish', done, { once: true }); a.addEventListener('cancel', done, { once: true });
  }
}

/* A number counts up to `to` (Sparks earned). The text a screen reader meets is the final one at once: the counting
   digits are aria-hidden, the final text is visually hidden beside them. */
export function rollUp(el, to, { from = 0, ms = 700, signal, label = n => String(n) } = {}) {
  if (!el || still() || to <= from || (signal && signal.aborted)) return;
  const ctl = new AbortController(), untrack = keep(() => ctl.abort());
  if (signal) onAbort(signal, () => ctl.abort());
  const final = label(to);
  el.innerHTML = '';
  const sr = document.createElement('span'); sr.className = 'md-sr-only'; sr.textContent = final;
  const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true'); vis.className = 'fx-roll'; vis.textContent = label(from);
  /* the width of the final text from the start, so nothing beside it moves while it counts */
  vis.style.minWidth = `${final.length}ch`;
  el.append(sr, vis);
  onAbort(ctl.signal, () => { vis.textContent = final; untrack(); });
  let t0 = 0;
  loop(now => {
    t0 = t0 || now; const k = Math.min(1, (now - t0) / ms), v = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
    vis.textContent = label(v);
    if (k >= 1) { untrack(); return false; }
  }, ctl.signal);
}
/* Every "+N Sparks" in root counts up from 0 */
export function rollSparks(root, signal) {
  if (!root || still()) return;
  root.querySelectorAll('.fx-sparks').forEach(el => {
    const m = /^\+(\d+) Sparks$/.exec(el.textContent.trim()); if (!m || el.children.length) return;
    rollUp(el, +m[1], { signal, label: n => `+${n} Sparks` });
  });
}

/* ---------- Big: true wins only ---------- */
/* 110 frames of a 60 Hz screen, its old length in frames */
const FRAME = 1000 / 60;
export const CONFETTI_MS = 110 * 1000 / 60;
/* Piece p at `ms`: where the old steps per 60 Hz frame (x += vx; y += vy; vy += .35; vx *= .99; a += s) put it */
export function confettiAt(p, ms) {
  const f = Math.max(0, ms) / FRAME;
  return { x: p.x + p.vx * (1 - .99 ** f) / .01, y: p.y + p.vy * f + .35 * f * (f - 1) / 2, a: p.a + p.s * f };
}
let bursting = null;
export function confetti(n = 70) {
  if (typeof document === 'undefined' || still() || bursting) return; /* one burst at a time: wins that land together share it */
  const c = document.createElement('canvas'); c.className = 'fx-confetti'; c.setAttribute('aria-hidden', 'true');
  const g = c.getContext && c.getContext('2d'); if (!g) return;
  const W = innerWidth, H = innerHeight; c.width = W; c.height = H; document.body.append(c);
  const css = getComputedStyle(document.body), cols = ['--coral', '--teal', '--sun', '--sky', '--plum'].map(v => css.getPropertyValue(v).trim()).filter(Boolean);
  const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * 200, y: H * .35, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)] || 'currentColor', a: Math.random() * 6, s: Math.random() * .3 - .15 }));
  const ctl = new AbortController(); bursting = ctl;
  const untrack = keep(() => ctl.abort());
  onAbort(ctl.signal, () => { c.remove(); untrack(); if (bursting === ctl) bursting = null; });
  /* ends on time even with no frames drawn; a tab shown again after its timer was held back ends it then */
  const t0 = performance.now();
  later(() => ctl.abort(), CONFETTI_MS, ctl.signal);
  on(document, 'visibilitychange', () => { if (performance.now() - t0 >= CONFETTI_MS) ctl.abort(); }, ctl.signal);
  loop(now => {
    g.clearRect(0, 0, W, H);
    for (const p of ps) { const q = confettiAt(p, now - t0); g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6); g.restore(); }
  }, ctl.signal);
}
