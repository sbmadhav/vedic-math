/* The background sky (prototype, owner decisions B1 to B4, 2026-10-20): what the Moving background draws, as data.
   Pure: no DOM, no storage, no timers, so every rule is a node test (test/sky-scene.test.mjs). js/sky-bg.js draws it
   on a 2D canvas today; the planned Three.js sky (react-typescript, scenes-3d) can read the same lists:
   - LEVELS: the layer config per level. 'full' on the landing page and the app home, 'quiet' everywhere else
     (constellations only, slower, no featured story). No motion (reduced motion, Pause motion, Calm) draws one still
     frame of the same level.
   - DIGITS: the Devanagari numerals ० to ९ as constellations (points joined by lines, in a box 1.2 wide and 2 high).
   - STORIES: the featured heritage pieces, shown one at a time, each with its caption. The captions reuse the history
     notes this app already had (they were the old background's notes); nothing here is a new claim.
   - TIMING and storyAt(): when a story draws in, holds, fades out, and when the next one starts.
   - placeStory(): where a story may sit: a spot of the screen with no text, control or card in it. */

/* ---------- Captions: the history notes (the old background's BG_NOTES, kept word for word) ---------- */
export const NOTES = {
  sulba: ['Śulba Sūtras', 'Rope geometry for building Vedic fire altars, written down by Baudhāyana around 800 to 500 BCE. It states the diagonal rule now called Pythagoras and gives √2 as 1 + 1/3 + 1/12 − 1/408.'],
  falcon: ['Falcon altar', 'The śyenaciti, a fire altar shaped like a falcon, built from about a thousand bricks laid by exact rules.'],
  meru: ['Meru-prastāra', 'Piṅgala\'s triangle for counting poetic meters (about 200 BCE), the pattern later called Pascal\'s triangle.'],
  powers: ['Powers of ten', 'The Taittirīya Saṃhitā names every power of ten from eka (1) to parārdha (one trillion).'],
  nakshatras: ['Nakshatras', 'The 27 lunar mansions of the Vedāṅga Jyotiṣa, the Vedic star calendar.'],
  brahmi: ['Brahmi numerals', 'Early Indian digits, ancestors of the 0 to 9 used worldwide today. The shapes here are stylized.'],
  devanagari: ['Devanagari numerals', 'The faint constellations are the digits ० to ९ as they are written in Devanagari today. The Nikhilam Family in the logo is three of them: १, ० and ९.']
};

/* The Taittirīya Saṃhitā's names for powers of ten (the old background's list) */
export const POWERS = [['eka', 0], ['daśa', 1], ['śata', 2], ['sahasra', 3], ['ayuta', 4], ['niyuta', 5], ['prayuta', 6], ['arbuda', 7], ['nyarbuda', 8], ['samudra', 9], ['madhya', 10], ['anta', 11], ['parārdha', 12]];
/* The names a Powers of ten story shows, in turn (a big number reads better than eka or daśa) */
export const POWER_PICKS = ['sahasra', 'prayuta', 'arbuda', 'anta', 'ayuta', 'samudra', 'parārdha', 'niyuta'];
/* 10 to the n written out with commas: 3 -> "1,000" */
export const powerNumber = n => ('1' + '0'.repeat(n)).replace(/\B(?=(\d{3})+$)/g, ',');
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const superscript = n => String(n).split('').map(d => SUP[+d]).join('');

/* Stylized Brahmi-style numerals 1 to 9 as stroke paths in a 20 by 24 box centred on 0,0 (the old background's) */
export const BRAHMI = [
  'M-8 0H8',
  'M-8 -4H8M-6 4H6',
  'M-8 -7H8M-6 0H6M-8 7H8',
  'M0 -10V10M-8 -2H8M-8 -2C-8 -8 -2 -10 0 -10',
  'M-6 -10V4C-6 10 6 10 6 4V-2',
  'M-6 -8C2 -12 8 -4 0 0C-8 4 -4 10 4 10',
  'M-6 -10V10M-6 0C2 -4 8 2 6 10',
  'M6 -10C-4 -10 -8 0 0 2C8 4 4 12 -6 10',
  'M-8 -6C-2 -12 8 -8 4 -2C0 4 -8 4 -4 10C-2 12 4 12 6 8'
];

/* ---------- Devanagari numerals as constellations ----------
   Each digit is a list of strokes; a stroke is a list of points (x -0.6 to 0.6, y -1 top to 1 bottom). ० १ ९ follow
   the brand's own drawings (brand/nikhilam-family/); the others are simple stylized shapes. */
const ring = (cx, cy, rx, ry, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const a = -Math.PI / 2 + (i % n) * 2 * Math.PI / n; return [r2(cx + rx * Math.cos(a)), r2(cy + ry * Math.sin(a))]; });
const r2 = v => Math.round(v * 100) / 100;
export const DIGITS = {
  '०': [ring(0, 0, 0.5, 0.62)],
  '१': [[[-0.55, -0.4], [-0.44, -0.84], [0.08, -1], [0.5, -0.88], [0.55, -0.56], [0.29, -0.24], [-0.18, -0.16], [0.23, 0.2], [0.44, 0.6], [0.55, 1]]],
  '२': [[[-0.5, -0.6], [-0.25, -0.95], [0.2, -0.95], [0.45, -0.62], [0.25, -0.25], [-0.25, 0.02], [-0.45, 0.25], [-0.05, 0.3], [0.3, 0.55], [0.5, 0.95]]],
  '३': [[[-0.5, -0.75], [-0.15, -1], [0.3, -0.85], [0.3, -0.5], [-0.1, -0.3], [0.4, -0.1], [0.42, 0.25], [0.05, 0.42], [-0.35, 0.3], [0, 0.6], [0.45, 0.95]]],
  '४': [[[-0.45, -0.9], [0.15, -0.25], [0.4, 0.25], [0.1, 0.85], [-0.35, 0.6], [-0.3, 0.1], [0.25, -0.45], [0.45, -0.95]]],
  '५': [[[-0.45, -0.8], [-0.2, -0.95], [0, -0.6], [-0.25, -0.1], [0.3, 0.05], [0.45, 0.45], [0.15, 0.9], [-0.35, 0.75]]],
  '६': [[[0.35, -0.9], [-0.15, -0.8], [-0.3, -0.45], [0.1, -0.25], [-0.35, 0], [-0.45, 0.4], [-0.1, 0.7], [0.3, 0.55], [0.45, 0.95]]],
  '७': [[[-0.4, -0.95], [0.3, -0.6], [0, -0.15], [-0.4, 0.15], [-0.35, 0.6], [0.05, 0.75], [0.35, 0.5], [0.45, 0.95]]],
  '८': [[[-0.55, 0.85], [-0.3, 0.1], [-0.15, -0.6], [0.15, -0.8], [0.4, -0.55], [0.2, -0.2], [0.5, 0.85]]],
  '९': [ring(0, -0.46, 0.48, 0.48), [[-0.37, -0.09], [-0.16, 0.26], [0.16, 0.46], [0.4, 0.66], [0.48, 0.98]]]
};
/* The brand's three come up most often */
export const DIGIT_ORDER = ['१', '०', '९', '२', '१', '५', '०', '९', '३', '७', '१', '४', '०', '६', '९', '८'];

/* ---------- The falcon altar (śyenaciti) as bricks: [x, y, w, h] in a box -1 to 1, in the order they are laid ----------
   A schematic plan seen from above: a square body, two long wings swept a little back, a fanned tail and the head. */
export const FALCON_BRICKS = (() => {
  const out = [], u = 0.12, v = 0.1;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) out.push([-2 * u + i * u, -0.25 + j * v, u, v]); // body, 4 by 4
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { // wings: long, a little swept back towards the tips
    const back = i * i * 0.008;
    out.push([-2 * u - (i + 1) * u, -0.2 + j * v + back, u, v]);
    out.push([2 * u + i * u, -0.2 + j * v + back, u, v]);
  }
  [[4, 0.15], [5, 0.25], [6, 0.35]].forEach(([n, y]) => { for (let i = 0; i < n; i++) out.push([-n * u * 0.5 + i * u, y, u, v]); }); // tail, fanning out
  out.push([-u / 2, -0.25 - v, u, v], [-u / 2, -0.25 - 2 * v, u, v]); // neck and head
  return out.map(b => b.map(r2));
})();

/* ---------- Meru-prastāra rows ---------- */
export const meruRows = n => { const rows = [[1]]; while (rows.length < n) { const p = rows[rows.length - 1]; rows.push([1, ...p.slice(1).map((x, i) => x + p[i]), 1]); } return rows; };

/* ---------- Stories ----------
   art: which drawing; aspect: its width over its height; draw: seconds to draw it in. The caption is short (title, one
   line, a source) so it fits beside the page; each line is taken from the notes above or the old background's own
   captions ("The falcon fire altar (śyenaciti), laid in bricks", "Meru-prastāra · Piṅgala, c. 200 BCE",
   "27 nakshatras · Vedāṅga Jyotiṣa"). */
const story = (id, art, aspect, draw, title, line, source = '') => ({ id, art, aspect, draw, title, line, source });
export const STORIES = [
  story('falcon', 'falcon', 1.6, 7, 'Falcon altar', 'The śyenaciti, a fire altar shaped like a falcon, laid in bricks by exact rules.', 'Śulba Sūtras, about 800 to 500 BCE'),
  story('powers', 'powers', 1.5, 6, 'Powers of ten', 'The Taittirīya Saṃhitā names every power of ten from eka (1) to parārdha (one trillion).'),
  story('meru', 'meru', 1.15, 7, 'Meru-prastāra', 'Piṅgala\'s triangle for counting poetic meters, the pattern later called Pascal\'s triangle.', 'Piṅgala, about 200 BCE'),
  story('brahmi', 'brahmi', 1, 6, 'Brahmi numerals', 'Early Indian digits, ancestors of the 0 to 9 used worldwide today. The shapes here are stylized.'),
  story('nakshatras', 'nakshatras', 1, 7, '27 nakshatras', 'The lunar mansions of the Vedāṅga Jyotiṣa, the Vedic star calendar.')
];

/* What the background shows, for "What is in the background?" (music panel) and the history page */
export const BG_NOTES = [NOTES.devanagari, NOTES.falcon, NOTES.powers, NOTES.meru, NOTES.brahmi, NOTES.nakshatras];

/* ---------- Levels: the layer config ----------
   fps: frame cap. stars: background stars per 100,000 square px. constellations: how many (phone, wide), their height
   in px, drift in px a second. horizon: the nakshatra wheel as a low arc. stories: featured stories on or off. */
export const LEVELS = {
  full: { fps: 24, stars: 7, constellations: { count: [4, 7], size: [64, 104], drift: 5 }, horizon: true, stories: true },
  quiet: { fps: 15, stars: 5, constellations: { count: [3, 5], size: [56, 88], drift: 2 }, horizon: false, stories: false }
};
/* The landing page and the app home (the Mode picker, the home, never the Star Quest Sky, which has its own sky) */
export const levelFor = (hash, { picker = false, sky = false } = {}) => (!sky && (picker || /^#?\/?$/.test(hash || '')) ? 'full' : 'quiet');

/* Token names per color scheme (sky-bg reads their values from the page, so colors are the design system's) */
export const PALETTE = {
  dark: { star: '--ink', line: '--sky', node: '--sun', horizon: '--plum', art: '--sun', art2: '--sky', ink: '--ink', muted: '--ink-muted', plaque: '--bg', edge: '--line' },
  light: { star: '--sun-strong', line: '--sky-strong', node: '--coral-strong', horizon: '--plum-strong', art: '--coral-strong', art2: '--sky-strong', ink: '--ink', muted: '--ink-muted', plaque: '--bg', edge: '--line' }
};
/* Opacity per layer (dark, light): faint enough that text on top keeps its contrast (e2e/tests/background.spec.ts) */
export const ALPHA = { star: [0.5, 0.35], line: [0.14, 0.12], node: [0.42, 0.32], horizon: [0.3, 0.26], art: [0.75, 0.7] };

/* ---------- Timing ---------- */
/* first: seconds before the first story; hold: seconds a finished story stays with its caption; out: fade; gap: empty
   sky before the next one */
export const TIMING = { first: 2.5, hold: 9, out: 2, gap: 6 };
/* Where the story cycle is at scene time t (seconds): { index, phase: 'gap' | 'in' | 'hold' | 'out', p (0 to 1 in the
   phase), start (scene time the story started) }. Stories run in list order, one at a time, and wrap round. */
export function storyAt(t, stories = STORIES, timing = TIMING) {
  if (!stories.length || t < timing.first) return { index: -1, phase: 'gap', p: 0, start: 0 };
  const lens = stories.map(s => s.draw + timing.hold + timing.out + timing.gap), cycle = lens.reduce((a, b) => a + b, 0);
  let x = (t - timing.first) % cycle, k = Math.floor((t - timing.first) / cycle) * stories.length, start = t - x;
  for (let i = 0; i < stories.length; i++) {
    if (x < lens[i]) {
      const s = stories[i], phases = [['in', s.draw], ['hold', timing.hold], ['out', timing.out], ['gap', timing.gap]];
      for (const [phase, d] of phases) { if (x < d) return { index: i, n: k + i, phase, p: d ? x / d : 1, start }; x -= d; }
    }
    x -= lens[i]; start += lens[i];
  }
  return { index: -1, phase: 'gap', p: 0, start: 0 };
}

/* ---------- Placement ----------
   A story sits where nothing on the page is: obstacles are the boxes of text, controls, cards and opaque bands on
   screen ([x0, y0, x1, y1] in px). The screen is split into cells; a story takes the largest size from sizes (in
   order) whose box fits on free cells, at the free spot nearest to anchor (a point as fractions of the screen).
   Returns { x, y, w, h, size } or null when nothing fits. */
export function placeStory(vw, vh, obstacles, sizes, { cell = 12, anchor = [0.78, 0.45], margin = 14 } = {}) {
  const cols = Math.max(1, Math.floor(vw / cell)), rows = Math.max(1, Math.floor(vh / cell));
  const busy = new Uint8Array(cols * rows);
  for (const [x0, y0, x1, y1] of obstacles) {
    const c0 = Math.max(0, Math.floor((x0 - margin) / cell)), c1 = Math.min(cols - 1, Math.floor((x1 + margin) / cell));
    const r0 = Math.max(0, Math.floor((y0 - margin) / cell)), r1 = Math.min(rows - 1, Math.floor((y1 + margin) / cell));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) busy[r * cols + c] = 1;
  }
  /* sum[r][c]: busy cells above and left of (r, c) */
  const sum = new Uint32Array((rows + 1) * (cols + 1));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) sum[(r + 1) * (cols + 1) + c + 1] = busy[r * cols + c] + sum[r * (cols + 1) + c + 1] + sum[(r + 1) * (cols + 1) + c] - sum[r * (cols + 1) + c];
  const free = (r, c, h, w) => sum[(r + h) * (cols + 1) + c + w] - sum[r * (cols + 1) + c + w] - sum[(r + h) * (cols + 1) + c] + sum[r * (cols + 1) + c] === 0;
  const ax = anchor[0] * vw, ay = anchor[1] * vh;
  for (const size of sizes) {
    const w = Math.ceil(size.w / cell), h = Math.ceil(size.h / cell);
    if (w > cols || h > rows) continue;
    let best = null, bestD = Infinity;
    for (let r = 0; r + h <= rows; r++) for (let c = 0; c + w <= cols; c++) {
      if (!free(r, c, h, w)) continue;
      const d = Math.hypot(c * cell + size.w / 2 - ax, r * cell + size.h / 2 - ay);
      if (d < bestD) { bestD = d; best = [c * cell, r * cell]; }
    }
    if (best) return { x: best[0], y: best[1], w: size.w, h: size.h, size };
  }
  return null;
}

/* The sizes to try for a story, largest first: the drawing above its caption, or beside it on a wide spot.
   capH(width, compact) is the caption's height at that width (sky-bg measures the text). After the full caption (title,
   line, source) come smaller drawings with the compact caption (title and source only), which fit on phones. */
export function storySizes(story, vw, capH, { maxArt = 240, minArt = 100, capMax = 300, capMin = 240, gap = 12 } = {}) {
  const out = [], add = (ah, cw, compact) => {
    const aw = Math.round(ah * story.aspect), ch = capH(cw, compact);
    out.push({ layout: 'stack', compact, w: Math.max(aw, cw), h: ah + gap + ch, art: [aw, ah], cap: [cw, ch] });
    out.push({ layout: 'side', compact, w: aw + gap + cw, h: Math.max(ah, ch), art: [aw, ah], cap: [cw, ch] });
  };
  for (let ah = Math.min(maxArt, Math.round(vw * 0.32)); ah >= minArt; ah -= 20) for (const cw of [capMax, capMin]) add(ah, cw, false);
  for (let ah = Math.min(160, Math.round((vw - 32) / story.aspect)); ah >= 64; ah -= 16) for (const cw of [Math.min(260, vw - 32), 200, 170]) add(ah, cw, true);
  return out;
}
/* The drawing alone (no caption), largest first, for a spot too small for any caption */
export function artSizes(story, vw, vh) {
  const out = [], top = glimpseBox(story, vw, vh).h;
  for (let ah = top; ah >= 96; ah -= 12) out.push({ layout: 'art', w: Math.round(ah * story.aspect), h: ah, art: [Math.round(ah * story.aspect), ah] });
  return out;
}

/* The largest a drawing may be on its own: never wider than the screen less its margins, nor taller than a fifth of
   it, and it sits above the horizon */
export function glimpseBox(story, vw, vh, { margin = 16 } = {}) {
  const h = Math.min(Math.round(vh * 0.2), 170, Math.round((vw - 2 * margin) / story.aspect));
  const w = Math.round(h * story.aspect);
  return { x: Math.round((vw - w) / 2), y: Math.round(vh * 0.86 - h), w, h };
}

/* The nakshatra wheel as a low arc: centre below the screen, radius wide enough to read as a horizon */
export function horizon(vw, vh) {
  const R = Math.max(vw * 1.1, 560), top = vh - Math.max(56, Math.min(110, vh * 0.12));
  return { cx: vw / 2, cy: top + R, R, band: 26, sectors: 27 };
}

/* A small seeded random number source, so a still frame is the same each time */
export function seeded(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
