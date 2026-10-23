/* The background sky, drawn on one 2D canvas (prototype; the scene itself is data in js/sky-scene.js).
   A calm night sky in Deep Space and a soft dawn in Daybreak (the wash is CSS on .vm-bg, from tokens), the Devanagari
   numerals drifting as faint constellations, the 27-nakshatra wheel as a low arc on the horizon, and, every so often,
   one featured story drawn in where the page has room, with a caption at body size.
   - Levels (sky-scene LEVELS): 'full' on the landing page and the app home, 'quiet' elsewhere. setLevel() switches.
   - No motion (reduced motion on the device, Pause motion, Calm): one composed still frame, redrawn only when the
     size, the color scheme or the page under a story changes. A hidden tab stops the frame loop.
   - It starts after the page has loaded and the browser is idle, so it never delays the first paint, and the canvas is
     fixed, so nothing on the page moves.
   - Every listener, timer and frame loop is tied to the signal through js/life.js; aborting it removes the canvas.
   It imports nothing from the game (no store, no fx), so the landing page can run it on its own (js/landing-sky.js). */
import { on, later, every, loop, child, onAbort } from './life.js';
import { LEVELS, STORIES, SULBA, sulbaRadius, FAMILY, CAMEO, DIGITS, DIGIT_ORDER, FALCON_BRICKS, BRAHMI, POWER_PICKS, POWERS, powerNumber, superscript, meruRows, PALETTE, ALPHA, TIMING, storyAt, placeStory, storySizes, artSizes, horizon, seeded } from './sky-scene.js';

/* What a story must not sit on, and what the sky is kept clear behind (sky-bg measures the page, never a list of
   class names): every run of text (measured to its words) and every control is cleared; pictures and any box that
   shows a background, a border, a shadow or floats over the page (cards, bands, the header) keep stories away. */
const CONTROL = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY']);
const PICTURE = new Set(['IMG', 'SVG', 'VIDEO', 'IFRAME', 'CANVAS', 'PICTURE']);
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'BR']);
const BAND = new Set(['HEADER', 'NAV', 'FOOTER', 'DIALOG', 'TABLE', 'FIGURE']);
/* A CSS colour as its [r, g, b, a] pixel (a from 0 to 255), resolved by a 1 px canvas so every computed form works
   (hex, rgb(), color(srgb ...) from color-mix(), oklch()). fallback is used where the value is not a colour. */
let probe = null;
function pixelFor(v, fallback) {
  if (!probe) { const cv = document.createElement('canvas'); cv.width = cv.height = 1; probe = cv.getContext('2d', { willReadFrequently: true }); }
  probe.clearRect(0, 0, 1, 1); probe.fillStyle = fallback; probe.fillStyle = (v || '').trim() || fallback; probe.fillRect(0, 0, 1, 1);
  return probe.getImageData(0, 0, 1, 1).data;
}
const seen = new Map(); /* a page has few distinct colours, and measure() asks for each box's */
export const shows = v => { let r = seen.get(v); if (r === undefined) { r = pixelFor(v, 'rgba(0, 0, 0, 0)')[3] > 0.05 * 255; if (seen.size < 256) seen.set(v, r); } return r; };
const TAU = Math.PI * 2;

/* No motion: the device asks for reduced motion, Pause motion is on (html.motion-paused), or Calm (vm.calm) */
export function stillWanted() {
  let calm = false; try { calm = localStorage.getItem('vm.calm') === '1'; } catch (e) {}
  let reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  return reduce || document.documentElement.classList.contains('motion-paused') || calm;
}
const darkScheme = () => { const th = document.documentElement.dataset.theme; return th === 'dark' || (th !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); };
/* A token's value as [r, g, b, a] (a from 0 to 1); mid grey where it is not a colour */
export function parseColor(v) {
  const [r, g, b, a] = pixelFor(v, '#808080');
  return [r, g, b, a / 255];
}

/* Runs fn once the page has loaded and the browser is idle (or after a short wait where there is no idle callback) */
/* Runs fn once while the browser is idle (or after a short wait where there is no idle callback). Its own child
   signal is aborted once it has run, so a long session does not pile listeners on signal. */
function whenIdle(fn, signal, timeout = 1200) {
  if (signal.aborted) return;
  const ctl = child(signal);
  if ('requestIdleCallback' in window) { const id = requestIdleCallback(() => { ctl.abort(); if (!signal.aborted) fn(); }, { timeout }); onAbort(ctl.signal, () => cancelIdleCallback(id)); }
  else later(() => { ctl.abort(); fn(); }, 200, ctl.signal);
}
/* Runs fn after the page has loaded and painted its first content, once the browser is idle: the sky never competes
   with the first paint */
function whenSettled(fn, signal) {
  const painted = () => {
    const ctl = child(signal), go = () => { if (ctl.signal.aborted) return; ctl.abort(); whenIdle(fn, signal); };
    let seen = false; try { seen = performance.getEntriesByName('first-contentful-paint').length > 0; } catch (e) {}
    if (seen) return go();
    try { const po = new PerformanceObserver(l => { if (l.getEntries().some(e => e.name === 'first-contentful-paint')) go(); }); po.observe({ type: 'paint', buffered: true }); onAbort(ctl.signal, () => po.disconnect()); } catch (e) {}
    later(go, 2500, ctl.signal); /* an engine without paint timing */
  };
  if (document.readyState === 'complete') painted(); else on(window, 'load', painted, signal, { once: true });
}

/* Mounts the sky behind the page until signal aborts. stories: the featured stories in order; cameo: the Nikhilam
   Family peeks over a caption when its story is complete. Returns { setLevel }. */
export function mountSkyBg({ signal, level = 'full', stories = STORIES, cameo = true, parent = document.body, defer = true } = {}) {
  let api = { setLevel: l => { level = l; } };
  const start = () => { api = run(); };
  if (defer) whenSettled(start, signal); else start();
  return { setLevel: l => api.setLevel(l) };

  function run() {
    const c = document.createElement('canvas');
    c.className = 'vm-bg'; c.setAttribute('aria-hidden', 'true'); c.dataset.level = level;
    parent.prepend(c);
    onAbort(signal, () => c.remove());
    const g = c.getContext('2d');
    try { performance.mark('sky-bg:start'); } catch (e) {}

    let W = 0, H = 0, dpr = 1, L = LEVELS[level] || LEVELS.full, dark = darkScheme(), col = {}, fonts = {};
    let t = 0, last = 0, loopCtl = null, stars = [], consts = [], cur = null, stillStory = undefined, powerTurn = 0;
    const set = (k, v) => { v = String(v); if (c.dataset[k] !== v) c.dataset[k] = v; };

    /* ---------- colors and fonts from the design system's tokens ---------- */
    function readTokens() {
      dark = darkScheme();
      const cs = getComputedStyle(document.documentElement), pal = PALETTE[dark ? 'dark' : 'light'];
      col = Object.fromEntries(Object.entries(pal).map(([k, name]) => [k, parseColor(cs.getPropertyValue(name))]));
      fonts = { display: cs.getPropertyValue('--font-display').trim() || 'sans-serif', sans: cs.getPropertyValue('--font-sans').trim() || 'sans-serif' };
      capCache.clear(); strs.clear();
    }
    const A = k => ALPHA[k][dark ? 0 : 1];
    /* A token's color at an opacity, as a CSS string; opacities are rounded to 1/100 and the strings kept */
    const strs = new Map();
    const rgba = (k, a = 1) => {
      const q = Math.round(Math.max(0, Math.min(1, a)) * 100), key = k + q; let v = strs.get(key);
      if (!v) { const [r, gg, b, a0] = col[k] || [128, 128, 128, 1]; v = `rgba(${r},${gg},${b},${(q / 100) * a0})`; strs.set(key, v); }
      return v;
    };

    /* ---------- the scene for this size and level ---------- */
    function build() {
      const rand = seeded(9 + (level === 'full' ? 0 : 1)), wide = W >= 700;
      stars = Array.from({ length: Math.round((W * H) / 1e5 * L.stars) }, () => ({ x: rand() * W, y: rand() * H * 0.92, r: 0.4 + rand() * 1.1, ph: rand() * TAU, tw: 0.4 + rand() * 0.9 }));
      const n = L.constellations.count[wide ? 1 : 0], [s0, s1] = L.constellations.size;
      consts = Array.from({ length: n }, (_, i) => {
        const d = DIGIT_ORDER[(i * 5 + (level === 'full' ? 0 : 3)) % DIGIT_ORDER.length], size = (wide ? s1 : s0) * (0.75 + rand() * 0.35);
        return { d, size, x0: ((i + 0.5) / n) * W + (rand() - 0.5) * (W / n) * 0.5, y0: H * (0.14 + rand() * 0.58), ph: rand() * TAU, v: L.constellations.drift * (0.7 + rand() * 0.6), tilt: (rand() - 0.5) * 0.25 };
      });
    }
    function size() {
      W = innerWidth; H = innerHeight; dpr = Math.min(1.5, devicePixelRatio || 1); /* a soft, decorative layer: 1.5 is sharp enough and a third cheaper than 2 */
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      build();
    }

    /* ---------- layers ---------- */
    /* Dots that twinkle are drawn in a few batches of the same opacity (one path each), which keeps a frame cheap */
    const BUCKETS = 4, batches = Array.from({ length: BUCKETS }, () => []);
    function dots(key, base, list) {
      for (const b of batches) b.length = 0;
      for (const d of list) batches[Math.min(BUCKETS - 1, Math.floor(d[3] * BUCKETS))].push(d);
      batches.forEach((b, i) => {
        if (!b.length) return;
        g.fillStyle = rgba(key, base * (i + 0.5) / BUCKETS); g.beginPath();
        for (const [x, y, r] of b) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
        g.fill();
      });
    }
    const starDots = [];
    function drawStars() {
      starDots.length = 0;
      for (const s of stars) starDots.push([s.x, s.y, s.r, dark ? 0.1 + 0.9 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph)) : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.tw * 0.5 + s.ph))]);
      dots('star', A('star') * 1.1, starDots);
    }
    const nodeDots = [];
    function drawConsts() {
      nodeDots.length = 0;
      g.strokeStyle = rgba('line', A('line')); g.lineWidth = 1; g.beginPath();
      for (const k of consts) {
        const span = W + 2 * k.size, x = ((k.x0 + t * k.v + k.size) % span + span) % span - k.size, y = k.y0 + Math.sin(t * 0.08 + k.ph) * 6;
        const h = k.size / 2, cos = Math.cos(k.tilt), sin = Math.sin(k.tilt);
        let i = 0;
        for (const stroke of DIGITS[k.d]) stroke.forEach(([u, v], j) => {
          const px = x + (u * cos - v * sin) * h, py = y + (u * sin + v * cos) * h;
          if (j) g.lineTo(px, py); else g.moveTo(px, py);
          nodeDots.push([px, py, i % 3 ? 1.4 : 2.1, 0.5 + 0.5 * Math.sin(t * 0.9 + k.ph + i++ * 1.3)]);
        });
      }
      g.stroke();
      dots('node', A('node') * 1.25, nodeDots);
    }
    /* Angle normalized to -PI..PI */
    const norm = x => ((x + Math.PI) % TAU + TAU) % TAU - Math.PI;
    function drawHorizon() {
      const { cx, cy, R, band, sectors } = horizon(W, H), rot = t * 0.004, a = A('horizon'), step = TAU / sectors;
      const span = Math.asin(Math.min(1, (W / 2 + 40) / R)) + 0.05, a0 = -Math.PI / 2 - span, a1 = -Math.PI / 2 + span;
      g.lineWidth = 1; g.strokeStyle = rgba('horizon', a);
      g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
      g.beginPath(); g.arc(cx, cy, R - band, a0, a1); g.stroke();
      g.strokeStyle = rgba('horizon', a * 0.8); g.beginPath();
      for (let k = 0; k < sectors; k++) {
        const ab = norm(rot + k * step); if (ab < a0 || ab > a1) continue;
        g.moveTo(cx + (R - band) * Math.cos(ab), cy + (R - band) * Math.sin(ab)); g.lineTo(cx + R * Math.cos(ab), cy + R * Math.sin(ab));
      }
      g.stroke();
      for (let k = 0; k < sectors; k++) {
        const am = norm(rot + (k + 0.5) * step); if (am < a0 || am > a1) continue;
        const tw = 0.55 + 0.45 * Math.sin(t * 0.7 + k * 1.7), x = cx + (R - band / 2) * Math.cos(am), y = cy + (R - band / 2) * Math.sin(am);
        g.fillStyle = rgba(k % 3 ? 'node' : 'horizon', Math.min(1, a * 1.8) * tw); g.beginPath(); g.arc(x, y, k % 3 ? 1.6 : 2.4, 0, TAU); g.fill();
      }
    }

    /* ---------- featured stories ---------- */
    const capCache = new Map();
    const pad = 12;
    function wrap(ctx, text, width) {
      const words = text.split(' '), lines = []; let line = '';
      for (const w of words) { const next = line ? line + ' ' + w : w; if (line && ctx.measureText(next).width > width) { lines.push(line); line = w; } else line = next; }
      if (line) lines.push(line);
      return lines;
    }
    const measurer = document.createElement('canvas').getContext('2d');
    /* The caption as lines: the title (18px, display font), the line at body size (16px; left out of a compact caption,
       on phones), and the source (14px). Each part wraps to the width. */
    function capLines(st, w, compact) {
      const out = [], inner = w - 2 * pad, part = (text, font, lh, color) => { measurer.font = font; for (const l of wrap(measurer, text, inner)) out.push({ l, font, lh, color }); };
      part(st.title, `600 18px ${fonts.display}`, 22, 'ink');
      if (!compact) part(st.line, `400 16px ${fonts.sans}`, 22, 'ink');
      if (st.source) part(st.source, `600 14px ${fonts.sans}`, 19, 'muted');
      return out;
    }
    const capHeight = (st, w, compact) => 2 * pad + capLines(st, w, compact).reduce((h, x) => h + x.lh, 0) + 4;
    /* The caption, drawn once into its own canvas: a plaque in the page's background color, then the lines */
    function caption(st, w, compact) {
      const key = `${st.id}:${w}:${dark}:${compact}`; if (capCache.has(key)) return capCache.get(key);
      const h = capHeight(st, w, compact), cv = document.createElement('canvas'); cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
      const x = cv.getContext('2d'); x.scale(dpr, dpr);
      x.fillStyle = rgba('plaque', 0.86); x.strokeStyle = rgba('edge', 0.9); x.lineWidth = 1;
      x.beginPath(); if (x.roundRect) x.roundRect(0.5, 0.5, w - 1, h - 1, 14); else x.rect(0.5, 0.5, w - 1, h - 1); x.fill(); x.stroke();
      x.textBaseline = 'alphabetic'; x.textAlign = 'left';
      let y = pad - 3;
      for (const { l, font, lh, color } of capLines(st, w, compact)) { y += lh; x.font = font; x.fillStyle = rgba(color); x.fillText(l, pad, y); }
      const out = { cv, w, h }; capCache.set(key, out); return out;
    }
    /* The page's obstacles on screen, as [x0, y0, x1, y1]: measured when the page may have moved (scroll, resize, a new
       route, and every 2.5 seconds for anything else), never more than once a frame.
       One walk from body that enters only what is on screen: a box entirely off screen is left with everything in it.
       A long page (the Deep dive: about 2,250 elements and 1,700 runs of text, nearly all below the fold) measured
       element by element took over 100 ms on a slow phone, a long task that put the route's blocking time over its
       budget; on screen it has a few hundred. A box without a size (display: contents, a wrapper of floats) says
       nothing about what is in it, so it is entered. What this does not see: a fixed or absolutely positioned box
       placed on screen from inside one that is off screen. */
    let page = null, pageDirty = true, pageVersion = 0, measuring = false;
    let pageSig = '', clearList = [];
    function measure() {
      const out = [], range = document.createRange(), on = r => r.width >= 1 && r.height >= 1 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
      const away = r => (r.width > 0 || r.height > 0) && (r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W);
      const push = (r, clear) => { const box = [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; out.push(box); if (clear) clearList.push(box); };
      pageDirty = false; clearList = [];
      const visit = (el, inSvg) => {
        for (let n = el.firstChild; n; n = n.nextSibling) {
          if (n.nodeType === 3) { /* a run of text */
            if (!n.nodeValue.trim() || SKIP.has(el.nodeName)) continue;
            range.selectNodeContents(n); const r = range.getBoundingClientRect(); if (on(r)) push(r, true);
          } else if (n.nodeType === 1 && n !== c) {
            const tag = n.tagName.toUpperCase(); if (SKIP.has(tag)) continue;
            if (inSvg) { visit(n, true); continue; } /* inside a drawing only its text counts; the drawing's box is in already */
            const r = n.getBoundingClientRect(); if (away(r)) continue;
            if (on(r)) { /* controls, pictures and boxes that show */
              if (CONTROL.has(tag)) push(r, true);
              else if (PICTURE.has(tag) || BAND.has(tag)) push(r, false);
              else if (r.width >= 24 && r.height >= 24) {
                const cs = getComputedStyle(n);
                if (cs.visibility === 'visible' && +cs.opacity >= 0.1) {
                  const edge = ['Top', 'Bottom', 'Left', 'Right'].some(k => parseFloat(cs[`border${k}Width`]) > 0 && shows(cs[`border${k}Color`]));
                  if (shows(cs.backgroundColor) || cs.backgroundImage !== 'none' || edge || cs.boxShadow !== 'none' || cs.position === 'fixed' || cs.position === 'sticky' || (cs.backdropFilter && cs.backdropFilter !== 'none')) push(r, false);
                }
              }
            }
            visit(n, tag === 'SVG');
          }
        }
      };
      visit(document.body, false);
      page = out;
      const sig = out.join(';'); if (sig !== pageSig) { pageSig = sig; pageVersion++; makeMask(); } /* the page really moved */
    }
    /* The knockout as one path, built only when the page moves: a hole (with a margin) around every obstacle */
    let holes = null;
    function makeMask() {
      holes = new Path2D();
      for (const [x0, y0, x1, y1] of clearList) holes.rect(x0 - KEEP_CLEAR, y0 - KEEP_CLEAR, x1 - x0 + 2 * KEEP_CLEAR, y1 - y0 + 2 * KEEP_CLEAR);
    }
    /* While the scene runs, measuring waits for idle time, so a frame never pays for it */
    function measureSoon() { if (measuring || !pageDirty) return; measuring = true; whenIdle(() => { measuring = false; if (pageDirty) measure(); }, signal, 300); }
    function obstacles(withHorizon = true, fresh = false) {
      if (!page || (fresh && pageDirty)) measure();
      if (!withHorizon || !L.horizon) return page;
      const hz = horizon(W, H); return page.concat([[0, hz.cy - hz.R - 8, W, H]]); /* stories stay above the horizon arc */
    }
    /* Clear sky behind the page: nothing the scene draws stays under text or a control (a margin around each), so text
       on top keeps the contrast it has without the background. Cards and bands are left alone: their text is cleared
       one run at a time, and a large cleared area would cost every frame. */
    const KEEP_CLEAR = 6;
    function knockout() {
      const list = obstacles(false); if (!list.length) return;
      if (!holes) makeMask();
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = rgba('ink', 1); g.fill(holes); g.globalCompositeOperation = 'source-over';
    }
    /* Where this story goes now: a free spot for the drawing and its caption (full, else compact), else a free spot for
       the drawing alone, else nowhere (it is skipped; the constellations carry on). Never under the page. */
    function place(st) {
      const obs = obstacles(true, true), anchor = W >= 700 ? [0.8, 0.42] : [0.5, 0.6];
      const spot = placeStory(W, H, obs, storySizes(st, W, (w, compact) => capHeight(st, w, compact), { maxArt: W >= 1100 ? 240 : 200 }), { anchor });
      if (spot) {
        const { layout, compact, art: [aw, ah], cap: [cw, ch] } = spot.size;
        const art = layout === 'stack' ? { x: spot.x + (spot.w - aw) / 2, y: spot.y, w: aw, h: ah } : { x: spot.x, y: spot.y + (spot.h - ah) / 2, w: aw, h: ah };
        const cap = layout === 'stack' ? { x: spot.x + (spot.w - cw) / 2, y: spot.y + ah + 12, w: cw, h: ch, compact } : { x: spot.x + aw + 12, y: spot.y + (spot.h - ch) / 2, w: cw, h: ch, compact };
        return { where: compact ? 'compact' : 'spot', box: [spot.x, spot.y, spot.x + spot.w, spot.y + spot.h], art, cap };
      }
      const alone = placeStory(W, H, obs, artSizes(st, W, H), { anchor: [0.5, 0.7] });
      if (alone) return { where: 'art', box: [alone.x, alone.y, alone.x + alone.w, alone.y + alone.h], art: { x: alone.x, y: alone.y, w: alone.w, h: alone.h }, cap: null };
      return { where: 'none', box: [0, 0, 0, 0], art: null, cap: null };
    }
    const overlaps = (b, list) => list.some(([x0, y0, x1, y1]) => x0 < b[2] && b[0] < x1 && y0 < b[3] && b[1] < y1);
    /* Text scrolled (or a route drew new content) over the story: it hands over early */
    function recheck() {
      pageDirty = true;
      if (stillWanted()) { drawStill(!!stillStory && overlaps(stillStory.box, obstacles(false, true))); return; }
      if (cur && cur.art && cur.cut == null && overlaps(cur.box, obstacles(false, true))) cur.cut = t;
    }

    /* ---------- the drawings, each in its box, progress p from 0 (nothing) to 1 (complete) ---------- */
    const clamp = v => Math.max(0, Math.min(1, v));
    const ART = {
      falcon(b, p, a) {
        const n = FALCON_BRICKS.length, s = Math.min(b.w / 2.1, b.h / 1.3), cx = b.x + b.w / 2, cy = b.y + b.h * 0.5;
        g.lineWidth = 1.4;
        const laid = new Path2D();
        FALCON_BRICKS.forEach(([x, y, w, h], i) => {
          const f = clamp(p * n * 1.05 - i); if (f <= 0) return;
          const X = cx + x * s, Y = cy + y * s;
          if (f >= 1) { laid.rect(X + 0.5, Y + 0.5, w * s - 1, h * s - 1); return; } /* laid bricks: one path */
          g.fillStyle = rgba('art', a * 0.16 * f); g.fillRect(X, Y, w * s, h * s);
          g.strokeStyle = rgba('art', a * f); g.strokeRect(X + 0.5, Y + 0.5, w * s - 1, h * s - 1);
        });
        g.fillStyle = rgba('art', a * 0.16); g.fill(laid); g.strokeStyle = rgba('art', a); g.stroke(laid);
      },
      powers(b, p, a, st) {
        const [name, n] = st.pick, cx = b.x + b.w / 2, fs = Math.min(b.h * 0.3, b.w / (name.length * 0.62));
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.save(); g.beginPath(); g.rect(b.x, b.y, b.w * clamp(p / 0.4), b.h * 0.5); g.clip();
        g.fillStyle = rgba('art', a); g.font = `600 ${Math.round(fs)}px ${fonts.display}`; g.fillText(name, cx, b.y + b.h * 0.24); g.restore();
        const p2 = clamp((p - 0.4) / 0.2);
        if (p2 > 0) { g.fillStyle = rgba('art2', a * p2); g.font = `600 ${Math.round(fs * 0.62)}px ${fonts.display}`; g.fillText('10' + superscript(n), cx, b.y + b.h * 0.56); }
        const num = powerNumber(n), shown = Math.round(num.length * clamp((p - 0.6) / 0.4));
        if (shown > 0) { g.fillStyle = rgba('ink', a * 0.85); g.font = `600 ${Math.round(Math.min(fs * 0.48, b.w / (num.length * 0.62)))}px ${fonts.sans}`; g.fillText(num.slice(0, shown), cx, b.y + b.h * 0.84); }
      },
      meru(b, p, a) {
        const rows = meruRows(7), step = Math.min(b.h / 7.2, b.w / 8.2), r0 = step * 0.42, top = b.y + step * 0.6;
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(step * 0.42)}px ${fonts.sans}`; g.lineWidth = 1.2;
        rows.forEach((row, r) => {
          const f = clamp(p * rows.length - r); if (f <= 0) return;
          row.forEach((v, i) => {
            const x = b.x + b.w / 2 + (i - r / 2) * step * 1.12, y = top + r * step;
            g.strokeStyle = rgba(r % 2 ? 'art2' : 'art', a * f); g.beginPath(); g.arc(x, y, r0, 0, TAU); g.stroke();
            g.fillStyle = rgba('ink', a * f * 0.9); g.fillText(String(v), x, y + 1);
          });
        });
      },
      brahmi(b, p, a) {
        const cell = Math.min(b.w, b.h) / 3, s = cell / 42, x0 = b.x + (b.w - 3 * cell) / 2;
        g.lineCap = 'round'; g.lineJoin = 'round'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(cell * 0.2)}px ${fonts.sans}`;
        BRAHMI.forEach((d, i) => {
          const f = clamp(p * 9 - i); if (f <= 0) return;
          const x = x0 + (i % 3 + 0.5) * cell, y = b.y + (Math.floor(i / 3) + 0.38) * cell;
          g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = rgba('art', a * f); g.lineWidth = 2.4; g.stroke(new Path2D(d)); g.restore();
          g.fillStyle = rgba('muted', a * f); g.fillText(String(i + 1), x, y + cell * 0.42);
        });
      },
      /* Circling the square, as with a rope and pegs: the peg, the east-west line, the corner pegs, the square drawn
         true side by side, the rope from the peg to a corner swung down to the line, a third of the part beyond the
         square marked, then the circle drawn round with the rope */
      sulba(b, p, a) {
        const { a: half, steps } = SULBA, R = Math.min(b.w, b.h) / 2 - 6, cx = b.x + b.w / 2, cy = b.y + b.h / 2, k = R / 0.95;
        const X = u => cx + u * k, Y = v => cy + v * k, step = n => clamp((p - steps[n][0]) / (steps[n][1] - steps[n][0]));
        const peg = (u, v, f) => { if (f <= 0) return; g.fillStyle = rgba('muted', a * f); g.fillRect(X(u) - 1.5, Y(v) - 9 + (1 - f) * -10, 3, 10); g.beginPath(); g.arc(X(u), Y(v) - 9 + (1 - f) * -10, 3, 0, TAU); g.fill(); };
        const rope = (x1, y1, x2, y2, f = 1) => { if (f <= 0) return; g.save(); g.setLineDash([4, 4]); g.strokeStyle = rgba('muted', a * 0.9); g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(x1), Y(y1)); g.lineTo(X(x1 + (x2 - x1) * f), Y(y1 + (y2 - y1) * f)); g.stroke(); g.restore(); };
        const diag = half * Math.SQRT2, r = sulbaRadius(half);
        /* east-west line through the peg */
        const fl = step('line');
        if (fl > 0) { g.strokeStyle = rgba('art2', a * 0.35); g.lineWidth = 1; g.beginPath(); g.moveTo(X(-0.95 * fl), cy); g.lineTo(X(0.95 * fl), cy); g.stroke(); }
        /* the square, side by side, each as a taut rope that turns into a line */
        const C = [[-half, -half], [half, -half], [half, half], [-half, half]];
        const fs = step('sides') * 4;
        g.strokeStyle = rgba('art', a); g.lineWidth = 1.8;
        for (let i = 0; i < 4; i++) {
          const f = clamp(fs - i); if (f <= 0) break;
          const [x1, y1] = C[i], [x2, y2] = C[(i + 1) % 4];
          g.beginPath(); g.moveTo(X(x1), Y(y1)); g.lineTo(X(x1 + (x2 - x1) * f), Y(y1 + (y2 - y1) * f)); g.stroke();
          if (f < 1) rope(x1, y1, x2, y2, 1);
        }
        /* the rope from the peg to a corner, swung down to the east-west line */
        const fw = step('swing');
        if (fw > 0 && p < steps.circle[0] + 0.02) {
          const ang = -Math.PI / 4 * (1 - fw);
          rope(0, 0, diag * Math.cos(ang), diag * Math.sin(ang));
          g.strokeStyle = rgba('art2', a * 0.6); g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, diag * k, -Math.PI / 4, ang); g.stroke();
        }
        /* the part beyond the square, in thirds; the first third is added */
        const ft = step('third');
        if (ft > 0) {
          g.strokeStyle = rgba('art2', a * ft); g.lineWidth = 3; g.beginPath(); g.moveTo(X(half), cy); g.lineTo(X(diag), cy); g.stroke();
          g.lineWidth = 1.2; for (let i = 1; i < 3; i++) { const u = half + (diag - half) * i / 3; g.beginPath(); g.moveTo(X(u), cy - 6); g.lineTo(X(u), cy + 6); g.stroke(); }
          g.strokeStyle = rgba('art', a * ft); g.lineWidth = 4; g.beginPath(); g.moveTo(X(half), cy); g.lineTo(X(r), cy); g.stroke();
        }
        /* the circle, drawn round with the rope */
        const fc = step('circle');
        if (fc > 0) {
          const end = TAU * fc;
          g.strokeStyle = rgba('art2', a); g.lineWidth = 1.8; g.beginPath(); g.arc(cx, cy, r * k, 0, end); g.stroke();
          if (fc < 1) rope(0, 0, r * Math.cos(end), r * Math.sin(end));
        }
        /* pegs: the centre first, then the corners */
        peg(0, 0, step('peg'));
        C.forEach(([u, v], i) => peg(u, v, clamp(step('corners') * 4 - i)));
      },
      nakshatras(b, p, a) {
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) / 2 - 4, r1 = R * 0.62;
        g.lineWidth = 1.2; g.strokeStyle = rgba('art2', a);
        g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p / 0.5)); g.stroke();
        g.beginPath(); g.arc(cx, cy, r1, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p / 0.5)); g.stroke();
        for (let k = 0; k < 27; k++) {
          const f = clamp((p - 0.3) * 27 / 0.6 - k); if (f <= 0) continue;
          const an = -Math.PI / 2 + k * TAU / 27, am = an + Math.PI / 27;
          g.strokeStyle = rgba('art2', a * 0.6 * f); g.beginPath(); g.moveTo(cx + r1 * Math.cos(an), cy + r1 * Math.sin(an)); g.lineTo(cx + R * Math.cos(an), cy + R * Math.sin(an)); g.stroke();
          g.fillStyle = rgba('art', a * f * (0.6 + 0.4 * Math.sin(t * 0.8 + k))); g.beginPath(); g.arc(cx + (R + r1) / 2 * Math.cos(am), cy + (R + r1) / 2 * Math.sin(am), k % 3 ? 2 : 3, 0, TAU); g.fill();
        }
        const f = clamp((p - 0.85) / 0.15);
        if (f > 0) { g.fillStyle = rgba('ink', a * f * 0.9); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(r1 * 0.55)}px ${fonts.display}`; g.fillText('27', cx, cy + 1); }
      }
    };
    /* One story at its phase: the drawing, then its caption fading in as the drawing ends */
    function drawStory(s, phase, p, fade = 1) {
      if (!s) return;
      const st = s.story, drawn = phase === 'in' ? p : 1;
      const out = phase === 'out' ? 1 - p : phase === 'gap' ? 0 : 1;
      const cut = s.cut != null ? clamp(1 - (t - s.cut) / 1.2) : 1, a = A('art') * (s.cap ? 1 : 0.45) * out * cut * fade; /* a drawing without its caption stays faint */
      if (a <= 0.001 || !s.art) return;
      ART[st.art] && ART[st.art](s.art, drawn, a, s);
      if (s.cap) {
        const capA = (phase === 'in' ? clamp((p - 0.55) / 0.45) : 1) * out * cut * fade;
        if (cameo && phase === 'hold' && s.cut == null) family(s.cap, p * TIMING.hold - CAMEO.at);
        if (capA > 0.001) { const cp = caption(st, s.cap.w, s.cap.compact); g.globalAlpha = capA; g.drawImage(cp.cv, s.cap.x, s.cap.y, cp.w, cp.h); g.globalAlpha = 1; }
      }
    }
    /* The Nikhilam Family peeks over the top right of the caption for a moment when a story is complete: up from
       behind it, a small bob, and down again. Small (36 px high), drawn from the brand mark's paths in its tokens. */
    const famPaths = FAMILY.map(([d, fill, stroke, w]) => [new Path2D(d), fill, stroke, w]);
    function family(cap, s) {
      if (s <= 0 || s >= CAMEO.for) return;
      const up = Math.min(clamp(s / 0.5), clamp((CAMEO.for - s) / 0.5)), ease = up * up * (3 - 2 * up), H0 = 36, sc = H0 / 64;
      const x = cap.x + cap.w - 96 * sc - 14, y = cap.y - H0 * ease + 8 + Math.sin(s * 4) * 1.5 * ease;
      g.save(); g.beginPath(); g.rect(x - 8, cap.y - H0 - 12, 96 * sc + 16, H0 + 13); g.clip(); /* only what is above the plaque */
      g.translate(x, y); g.scale(sc, sc); g.lineCap = 'round'; g.lineJoin = 'round';
      for (const [path, fill, stroke, w] of famPaths) {
        if (fill) { g.fillStyle = rgba(fill, 1); g.fill(path); }
        if (stroke) { g.strokeStyle = rgba(stroke, 1); g.lineWidth = w; g.stroke(path); }
      }
      g.restore();
    }
    function nextPick() { const name = POWER_PICKS[powerTurn++ % POWER_PICKS.length]; return POWERS.find(([n]) => n === name); }
    /* The next story's place is worked out while the browser is idle during the empty sky before it */
    let pending = null;
    function storyFrame() {
      const at = storyAt(t, stories);
      if (at.index < 0 || at.phase === 'gap') {
        if (cur && at.phase === 'gap') cur = null;
        set('story', ''); set('phase', 'gap');
        const n = at.index < 0 ? 0 : at.n + 1, st = stories[n % stories.length];
        if (!pending || pending.n !== n) { pending = { n, ready: false }; whenIdle(() => {
          if (!pending || pending.n !== n) return;
          const pl = place(st); Object.assign(pending, pl, { ready: true, v: pageVersion });
          if (pl.cap) caption(st, pl.cap.w, pl.cap.compact); /* drawn ahead, so the first frame of the caption costs nothing */
        }, signal, 2000); }
        return;
      }
      if (!cur || cur.n !== at.n) {
        const st = stories[at.index], pl = pending && pending.n === at.n && pending.ready && pending.v === pageVersion && !pageDirty ? pending : place(st);
        cur = { story: st, pick: st.art === 'powers' ? nextPick() : null, cut: null, ...pl, n: at.n };
        pending = null;
        set('place', pl.where);
      }
      if (!cur.art) { set('story', ''); set('phase', 'gap'); return; }
      set('story', cur.story.id); set('phase', cur.cut != null ? 'out' : at.phase);
      clearUnder(cur); drawStory(cur, at.phase, at.p);
    }
    /* No star or constellation line crosses the featured story or its caption */
    function clearUnder(s) {
      const [x0, y0, x1, y1] = s.box;
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = rgba('ink', 1); g.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20); g.globalCompositeOperation = 'source-over';
    }

    /* ---------- frames ---------- */
    function frame(now) {
      const step = 1000 / L.fps;
      if (now - last < step - 1) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      drawStars(); drawConsts();
      if (L.horizon) drawHorizon();
      if (L.stories) storyFrame();
      knockout();
      if (pageDirty) measureSoon();
    }
    /* The still frame: the same layers at rest, and the day's story complete with its caption where there is room */
    function drawStill(dropStory = false) {
      const keepT = t; t = 0; pageDirty = true;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      drawStars(); drawConsts();
      if (L.horizon) drawHorizon();
      if (L.stories && stories.length) {
        if (dropStory) stillStory = null;
        else if (stillStory === undefined || (stillStory && stillStory.W !== W)) {
          const st = stories[Math.floor(Date.now() / 864e5) % stories.length], pl = place(st);
          stillStory = pl.art ? { n: -1, story: st, pick: st.art === 'powers' ? POWERS.find(([n]) => n === POWER_PICKS[0]) : null, cut: null, W, ...pl } : null;
        }
        if (stillStory) { clearUnder(stillStory); drawStory(stillStory, 'hold', 1); }
        set('story', stillStory ? stillStory.story.id : ''); set('phase', stillStory ? 'still' : 'gap'); set('place', stillStory ? stillStory.where : 'none');
      } else { set('story', ''); set('phase', 'gap'); }
      if (pageDirty) measure(); /* the page may have scrolled or a new route drawn since the last measure: knockout() clears behind what is there now */
      knockout();
      t = keepT;
    }

    /* ---------- running, pausing and stilling ---------- */
    function sync() {
      const still = stillWanted(), go = !still && !document.hidden;
      set('still', still ? '1' : '0'); set('running', go ? '1' : '0');
      if (go && !loopCtl) { loopCtl = child(signal); last = performance.now() - 1000; loop(frame, loopCtl.signal); }
      else if (!go && loopCtl) { loopCtl.abort(); loopCtl = null; }
      if (still) { stillStory = undefined; drawStill(); }
    }
    const debounced = (fn, ms) => { let ctl = null; return () => { if (ctl) ctl.abort(); ctl = child(signal); later(fn, ms, ctl.signal); }; };
    readTokens(); size();
    on(document, 'visibilitychange', sync, signal);
    on(document, 'sitemotion', sync, signal);
    on(document, 'vmcalm', sync, signal);
    try { on(matchMedia('(prefers-reduced-motion: reduce)'), 'change', sync, signal); } catch (e) {}
    const restyle = () => { readTokens(); if (stillWanted()) drawStill(); };
    try { on(matchMedia('(prefers-color-scheme: dark)'), 'change', restyle, signal); } catch (e) {}
    const mo = new MutationObserver(restyle); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); onAbort(signal, () => mo.disconnect());
    on(window, 'resize', debounced(() => { size(); pageDirty = true; cur = null; stillStory = undefined; if (stillWanted()) drawStill(); }, 150), signal, { passive: true });
    const settle = debounced(recheck, 180);
    on(window, 'scroll', () => { pageDirty = true; settle(); }, signal, { passive: true });
    every(() => { pageDirty = true; }, 2500, signal);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (signal.aborted) return; capCache.clear(); if (stillWanted()) drawStill(); });
    sync();

    return {
      setLevel(l) {
        if (!LEVELS[l] || l === level) { if (l === level) later(recheck, 60, signal); return; }
        level = l; L = LEVELS[l]; set('level', l); cur = null; pending = null; stillStory = undefined; build();
        if (!L.stories) { set('story', ''); set('phase', 'gap'); set('place', 'none'); }
        if (stillWanted()) drawStill();
      }
    };
  }
}
