/* Mandala Studio core: the math behind every piece, with no DOM, so node tests can check it.
   Times-table mandalas (chords k to m k mod n), Meru-prastāra (Piṅgala's triangle of binomial numbers, drawn
   out by Halāyudha in the 10th century), the digital-root square, and Śulba rope geometry (Baudhāyana's
   diagonal rule and his value for the diagonal of a square). */

/* ---------- Colors (canvas needs real values; they come from design tokens at run time) ---------- */
/* Parse "#rgb", "#rrggbb", "#rrggbbaa", "rgb(...)" or "rgba(...)" to [r, g, b, a] */
export function parseColor(s) {
  s = String(s || '').trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0] || 0, p[1] || 0, p[2] || 0, p.length > 3 ? p[3] : 1]; }
  return [128, 128, 128, 1];
}
export const rgba = (c, a = 1) => { const [r, g, b, a0] = Array.isArray(c) ? c : parseColor(c); return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${Math.round(a * a0 * 1000) / 1000})`; };
export const mix = (c1, c2, t) => { const a = Array.isArray(c1) ? c1 : parseColor(c1), b = Array.isArray(c2) ? c2 : parseColor(c2); return a.map((v, i) => v + (b[i] - v) * t); };
export const luminance = c => { const [r, g, b] = (Array.isArray(c) ? c : parseColor(c)).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/* A color along a palette of stops, t in [0, 1] (wraps) */
export function along(stops, t) {
  if (stops.length === 1) return stops[0];
  t = ((t % 1) + 1) % 1; const x = t * stops.length, i = Math.floor(x) % stops.length;
  return mix(stops[i], stops[(i + 1) % stops.length], x - Math.floor(x));
}
/* Palettes name which token accents to use: dawn coral and sun, sea teal and sun, all three, and ink */
export const PALETTES = [
  { id: 'dawn', name: 'Dawn', keys: ['--coral', '--sun'] },
  { id: 'sea', name: 'Sea', keys: ['--teal', '--sun'] },
  { id: 'festival', name: 'Festival', keys: ['--coral', '--sun', '--teal'] },
  { id: 'ink', name: 'Ink', keys: ['ink'] }
];

/* ---------- Pentatonic notes (C major pentatonic, two octaves and a bit) ---------- */
export const PENTA = [130.81, 146.83, 164.81, 196, 220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];
/* Map x in [0, 1] to a note index in PENTA */
export const noteIndex = (x, lo = 0, hi = PENTA.length - 1) => lo + Math.round(Math.min(1, Math.max(0, x)) * (hi - lo));

/* ---------- Times-table mandala ---------- */
/* n points on a circle; chord from point k to point m k (mod n). m may be a decimal: the end point then
   sits between points, which is what lets the shape morph smoothly. */
export const TIMES = { n: [10, 400], m: [1, 99.99] };
export const target = (k, m, n) => { const x = (m * k) % n; return x < 0 ? x + n : x; };
export const chords = (n, m) => Array.from({ length: n }, (_, k) => [k, target(k, m, n)]);
/* Position of point i (may be fractional) on a circle of radius r, starting at the left, going clockwise */
export const onCircle = (i, n, r = 1, cx = 0, cy = 0) => { const a = Math.PI + (2 * Math.PI * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
/* Chord length on a unit circle (0 to 2) */
export const chordLength = (k, t, n) => 2 * Math.abs(Math.sin((Math.PI * (t - k)) / n));
/* Each chord's note: longer chords sound lower, like longer strings */
export const chordNote = (k, t, n) => noteIndex(1 - chordLength(k, t, n) / 2);
/* The name of the curve for a whole-number multiplier: an epicycloid with m - 1 cusps */
export function curveName(m, n = Infinity) {
  const r = Math.round(m);
  if (Math.abs(m - r) > 0.02 || r < 2 || r > 12 || n < 10 * r) return null;
  if (r === 2) return { name: 'Cardioid', note: 'one cusp; the name means heart-shaped' };
  if (r === 3) return { name: 'Nephroid', note: 'two cusps; the name means kidney-shaped' };
  return { name: `Epicycloid with ${r - 1} cusps`, note: `m = ${r} gives ${r - 1} cusps` };
}

/* ---------- Meru-prastāra (the binomial triangle) ---------- */
/* Rows of exact values as BigInt: row r holds C(r, 0) ... C(r, r) */
export function meruRows(R) {
  const rows = [[1n]];
  for (let r = 1; r < R; r++) { const p = rows[r - 1], row = [1n]; for (let i = 1; i < r; i++) row.push(p[i - 1] + p[i]); row.push(1n); rows.push(row); }
  return rows;
}
/* Rows of remainders mod m, built with the same addition rule mod m (exact for any size) */
export function meruMod(R, m) {
  const rows = [Uint8Array.of(1 % m)];
  for (let r = 1; r < R; r++) { const p = rows[r - 1], row = new Uint8Array(r + 1); row[0] = row[r] = 1 % m; for (let i = 1; i < r; i++) row[i] = (p[i - 1] + p[i]) % m; rows.push(row); }
  return rows;
}
export function binom(n, k) { if (k < 0 || k > n) return 0n; k = Math.min(k, n - k); let x = 1n; for (let i = 1; i <= k; i++) x = (x * BigInt(n - k + i)) / BigInt(i); return x; }
/* The shallow diagonal d: cells (d - j, j) for j = 0 .. floor(d / 2). Its sum is the Fibonacci number F(d + 1). */
export const diagonalCells = d => Array.from({ length: Math.floor(d / 2) + 1 }, (_, j) => [d - j, j]);
export const diagonalSum = d => diagonalCells(d).reduce((s, [r, i]) => s + binom(r, i), 0n);
export const fib = n => { let a = 0n, b = 1n; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };
/* Rhythms of total length n made of short (1) and long (2) syllables, as Virahāṅka counted them */
export function meters(n) { if (n === 0) return ['']; if (n < 0) return []; return [...meters(n - 1).map(s => 'S' + s), ...meters(n - 2).map(s => 'L' + s)]; }
export const MERU = { rows: [4, 64], mod: [2, 9] };

/* ---------- The digital-root square ---------- */
export const digitalRoot = n => (n === 0 ? 0 : 1 + ((n - 1) % 9));
export const vedicSquare = () => Array.from({ length: 9 }, (_, i) => Array.from({ length: 9 }, (_, j) => digitalRoot((i + 1) * (j + 1))));
export const cellsOf = d => { const out = []; vedicSquare().forEach((row, i) => row.forEach((v, j) => { if (v === d) out.push([i, j]); })); return out; };
/* Row d of the square: the digital roots of d × 1 .. d × 9 */
export const rowOf = d => Array.from({ length: 9 }, (_, k) => digitalRoot(d * (k + 1)));
/* The star: nine points on a circle (1 to 9), joined in the order row d visits them */
export const starOrder = d => rowOf(d);
/* The spiral: walk forward by each digit of row d, turning by `angle` degrees after each step, repeating the
   row until you are back at the start facing the same way (or `maxReps` times). Returns the points. */
export const ANGLES = [90, 60, 72, 144];
export function turtle(d, angle = 90, maxReps = 12) {
  const row = rowOf(d), pts = [[0, 0]]; let x = 0, y = 0, h = 0, reps = 0;
  do {
    for (const s of row) { x += s * Math.cos((h * Math.PI) / 180); y += s * Math.sin((h * Math.PI) / 180); h = (h + angle) % 360; pts.push([Math.round(x * 1e9) / 1e9, Math.round(y * 1e9) / 1e9]); }
    reps++;
  } while (reps < maxReps && !(Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6 && h % 360 === 0));
  return { pts, reps, closed: Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6 };
}

/* ---------- Śulba rope geometry ---------- */
/* Baudhāyana's value for the diagonal of a unit square (Śulba Sūtra 1.61 to 1.62): increase the measure
   by its third, and the third by its own fourth, less the thirty-fourth part of that fourth. */
export const SQRT2_STEPS = [
  { add: 'the side', value: 1, frac: [1, 1] },
  { add: 'plus a third', value: 1 + 1 / 3, frac: [4, 3] },
  { add: 'plus a fourth of that third', value: 1 + 1 / 3 + 1 / 12, frac: [17, 12] },
  { add: 'less a thirty-fourth of that fourth', value: 1 + 1 / 3 + 1 / 12 - 1 / 408, frac: [577, 408] }
];
export const SQRT2_APPROX = 1 + 1 / 3 + 1 / (3 * 4) - 1 / (3 * 4 * 34);
/* Two strings: pitch is inversely proportional to length, so the rope against the true diagonal beats at
   |f(rope) - f(diag)| times a second */
export const ropePitch = (len, base = 330) => (base * Math.SQRT2) / len;
export const beatRate = (len, base = 330) => Math.abs(ropePitch(len, base) - base);
/* Whole-number right triangles that the Śulba texts use (Āpastamba lists these) */
export const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [12, 35, 37], [15, 36, 39]];
export const isTriple = (a, b) => { const c = Math.round(Math.hypot(a, b)); return Number.isInteger(a) && Number.isInteger(b) && a > 0 && b > 0 && c * c === a * a + b * b ? c : 0; };
/* Keep a rope knot inside reach: the knot is tied to peg A by a rope of length la and to peg B by lb.
   Returns the closest point to p that both ropes can reach. */
export function reach(p, A, la, B, lb) {
  let q = [...p];
  for (let it = 0; it < 24; it++) {
    for (const [C, l] of [[A, la], [B, lb]]) { const dx = q[0] - C[0], dy = q[1] - C[1], d = Math.hypot(dx, dy); if (d > l) { q = [C[0] + (dx / d) * l, C[1] + (dy / d) * l]; } }
  }
  return q;
}
/* Where both ropes are tight: the circle intersections (upper one first) */
export function taut(A, la, B, lb) {
  const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy);
  if (d > la + lb || d < Math.abs(la - lb)) return [];
  const a = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - a * a));
  const mx = A[0] + (a * dx) / d, my = A[1] + (a * dy) / d;
  return [[mx + (h * dy) / d, my - (h * dx) / d], [mx - (h * dy) / d, my + (h * dx) / d]];
}
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
export const isTaut = (p, A, la, B, lb, tol = 0.04) => Math.abs(dist(p, A) - la) < tol * la && Math.abs(dist(p, B) - lb) < tol * lb;
export const angleAt = (B, A, C) => { const a = Math.atan2(A[1] - B[1], A[0] - B[0]), c = Math.atan2(C[1] - B[1], C[0] - B[0]); let x = Math.abs(a - c) * 180 / Math.PI; return x > 180 ? 360 - x : x; };

/* The altar: squares inside squares, each turned 45 degrees and half the area of the last (doubling in
   reverse). Regions are polygons in [-1, 1]: the inner square, then each ring of 4 corner triangles. Each
   region has a ring number and an index around the ring, so a tap can paint one or all four. */
export function altar(levels = 4) {
  const sq = k => { const s = Math.pow(Math.SQRT1_2, k); return k % 2 === 0 ? [[-s, -s], [s, -s], [s, s], [-s, s]] : [[0, -s * Math.SQRT2], [s * Math.SQRT2, 0], [0, s * Math.SQRT2], [-s * Math.SQRT2, 0]]; };
  const regions = [];
  for (let k = 0; k < levels; k++) {
    const outer = sq(k), inner = sq(k + 1);
    /* inner square k+1 has its corners on the midpoints of square k: four corner triangles of square k */
    for (let i = 0; i < 4; i++) {
      const corner = outer[i];
      const near = inner.slice().sort((p, q) => dist(p, corner) - dist(q, corner)).slice(0, 2);
      regions.push({ ring: k, i, pts: [corner, near[0], near[1]] });
    }
  }
  regions.push({ ring: levels, i: 0, pts: sq(levels) });
  return regions;
}
export const polyArea = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
export const inPoly = (x, y, pts) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };

/* ---------- Pieces, links and surprises ---------- */
export const KINDS = ['times', 'meru', 'square', 'altar'];
const clamp = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
const pal = v => clamp(Math.round(v), 0, PALETTES.length - 1, 2);
/* Clean any piece description (from a link, an old save) into safe parameters */
export function cleanPiece(p = {}) {
  const k = KINDS.includes(p.k) ? p.k : 'times';
  if (k === 'times') return { k, n: Math.round(clamp(p.n, ...TIMES.n, 200)), m: Math.round(clamp(p.m, ...TIMES.m, 2) * 100) / 100, p: pal(p.p) };
  if (k === 'meru') return { k, rows: Math.round(clamp(p.rows, ...MERU.rows, 32)), mod: Math.round(clamp(p.mod, ...MERU.mod, 2)), p: pal(p.p) };
  if (k === 'square') return { k, d: Math.round(clamp(p.d, 1, 9, 2)), view: ['grid', 'star', 'spiral'].includes(p.view) ? p.view : 'spiral', a: ANGLES.includes(+p.a) ? +p.a : 90, p: pal(p.p) };
  const levels = Math.round(clamp(p.levels, 2, 6, 4)), n = levels * 4 + 1;
  const f = Array.from({ length: n }, (_, i) => Math.round(clamp(Array.isArray(p.f) ? p.f[i] : 0, 0, 4, 0)));
  return { k, levels, f, p: pal(p.p) };
}
export const encodePiece = (p, b64) => b64.enc(JSON.stringify({ v: 1, ...cleanPiece(p) }));
export function decodePiece(code, b64) { try { const o = JSON.parse(b64.dec(code)); return o && o.v === 1 ? cleanPiece(o) : null; } catch (e) { return null; } }
/* Lovely starting points found by hand, then a seeded surprise among them and around them */
export const FAVORITES = [
  { k: 'times', n: 200, m: 2 }, { k: 'times', n: 240, m: 3 }, { k: 'times', n: 300, m: 51 }, { k: 'times', n: 360, m: 34 },
  { k: 'times', n: 180, m: 89.6 }, { k: 'times', n: 250, m: 21 }, { k: 'times', n: 320, m: 99 }, { k: 'times', n: 160, m: 41 },
  { k: 'meru', rows: 64, mod: 2 }, { k: 'meru', rows: 54, mod: 3 }, { k: 'meru', rows: 50, mod: 5 }, { k: 'meru', rows: 49, mod: 7 },
  { k: 'square', d: 2, view: 'spiral', a: 90 }, { k: 'square', d: 4, view: 'spiral', a: 72 }, { k: 'square', d: 7, view: 'spiral', a: 144 }, { k: 'square', d: 2, view: 'star' }
];
export function surprise(r) {
  const base = FAVORITES[Math.floor(r() * FAVORITES.length)], p = Math.floor(r() * 3);
  if (base.k === 'times' && r() < 0.5) return cleanPiece({ k: 'times', n: 120 + Math.floor(r() * 241), m: Math.round((2 + r() * 97) * 100) / 100, p });
  if (base.k === 'square' && r() < 0.5) return cleanPiece({ k: 'square', d: 1 + Math.floor(r() * 8), view: 'spiral', a: ANGLES[Math.floor(r() * ANGLES.length)], p });
  return cleanPiece({ ...base, p });
}
export function describe(p) {
  if (p.k === 'times') return `Times ${p.m} on ${p.n} points`;
  if (p.k === 'meru') return `Meru-prastāra, ${p.rows} rows, mod ${p.mod}`;
  if (p.k === 'square') return p.view === 'spiral' ? `Digit ${p.d} spiral, ${p.a}°` : p.view === 'star' ? `Digit ${p.d} star` : `Square of ${p.d}s`;
  return `Śulba altar, ${p.levels} squares`;
}
