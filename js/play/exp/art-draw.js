/* Mandala Studio renderers: each draws one piece onto a 2D canvas context in logical pixels.
   Colors come in `pal` (read from design tokens by art.js, or chosen for a wallpaper), so the same code
   draws the screen, the gallery thumbnails and the high resolution export. No DOM use at import. */
import * as A from './art-core.js';

/* pal: { bg, ink, muted, line, coral, sun, teal } as [r, g, b, a] arrays, dark, and font (the --font-display stack) */
/* Three accents cycle through sun on the way back (coral to teal directly would pass through gray) */
export const stopsOf = (pal, p) => { const s = A.PALETTES[p].keys.map(k => (k === 'ink' ? pal.ink : pal[k.slice(2)])); return s.length === 3 ? [...s, pal.sun] : s; };
const TAU = Math.PI * 2;

export function background(g, w, h, pal) {
  g.save(); g.globalCompositeOperation = 'source-over';
  g.fillStyle = A.rgba(pal.bg); g.fillRect(0, 0, w, h);
  const r = Math.max(w, h) * 0.7, grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
  grd.addColorStop(0, A.rgba(pal.sun, pal.dark ? 0.07 : 0.1)); grd.addColorStop(1, A.rgba(pal.sun, 0));
  g.fillStyle = grd; g.fillRect(0, 0, w, h); g.restore();
}
const blend = (g, pal) => { g.globalCompositeOperation = pal.dark ? 'lighter' : 'source-over'; };

/* ---------- Times-table mandala ---------- */
/* upto: how many chords to draw (fractional for the one being drawn); hot: index of a chord to glow */
export function times(g, w, h, pal, piece, { upto = Infinity, hot = -1, scale = 1 } = {}) {
  const { n, m } = piece, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.44, stops = stopsOf(pal, piece.p);
  g.save();
  g.lineWidth = 1.5 * scale; g.strokeStyle = A.rgba(pal.ink, pal.dark ? 0.14 : 0.1);
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  const alpha = pal.dark ? Math.min(0.85, Math.max(0.34, 110 / n)) : Math.min(0.9, Math.max(0.5, 150 / n)), lw = Math.max(0.7, (R / 300) * (n > 260 ? 0.85 : 1.1)) * scale;
  blend(g, pal); g.lineWidth = lw; g.lineCap = 'round';
  const N = Math.min(n, upto);
  for (let k = 0; k < Math.ceil(N); k++) {
    const t = A.target(k, m, n), [x1, y1] = A.onCircle(k, n, R, cx, cy); let [x2, y2] = A.onCircle(t, n, R, cx, cy);
    const part = Math.min(1, N - k); if (part < 1) { x2 = x1 + (x2 - x1) * part; y2 = y1 + (y2 - y1) * part; }
    g.strokeStyle = A.rgba(A.along(stops, k / n), alpha);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  if (hot >= 0 && hot < n) {
    const t = A.target(hot, m, n), [x1, y1] = A.onCircle(hot, n, R, cx, cy), [x2, y2] = A.onCircle(t, n, R, cx, cy);
    g.globalCompositeOperation = 'source-over'; g.lineWidth = 3 * scale; g.strokeStyle = A.rgba(pal.ink, 0.85);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  if (n <= 120) { g.fillStyle = A.rgba(pal.ink, 0.5); for (let k = 0; k < n; k++) { const [x, y] = A.onCircle(k, n, R, cx, cy); g.beginPath(); g.arc(x, y, 1.6 * scale, 0, TAU); g.fill(); } }
  g.restore();
}

/* ---------- Meru-prastāra ---------- */
/* Geometry of the triangle so taps can find rows: returns { s, top, cell(r, i) } */
export function meruGeom(w, h, rows) {
  const s = Math.min((w * 0.94) / rows, (h * 0.92) / (rows * 0.866 + 0.2)), top = (h - rows * s * 0.866) / 2 + s * 0.45;
  return { s, top, cell: (r, i) => [w / 2 + (i - r / 2) * s, top + r * s * 0.866] };
}
export function meru(g, w, h, pal, piece, { upto = Infinity, row = -1, diag = -1, values = null, scale = 1 } = {}) {
  const { rows, mod } = piece, stops = stopsOf(pal, piece.p), G = meruGeom(w, h, rows), res = A.meruMod(rows, mod);
  const nums = rows <= 14 && values;
  g.save();
  const R = Math.min(rows, upto);
  for (let r = 0; r < Math.ceil(R); r++) {
    const fade = Math.min(1, R - r);
    for (let i = 0; i <= r; i++) {
      const v = res[r][i], [x, y] = G.cell(r, i), rad = G.s * 0.47;
      g.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; g.lineTo(x + rad * Math.cos(a), y + rad * Math.sin(a)); }
      g.closePath();
      g.fillStyle = v === 0 ? A.rgba(pal.ink, (pal.dark ? 0.06 : 0.05) * fade) : A.rgba(A.along(stops.length > 1 ? stops : [stops[0], pal.muted], mod === 2 ? 0 : (v - 1) / (mod - 1) * (1 - 1 / stops.length)), (pal.dark ? 0.9 : 0.85) * fade);
      g.fill();
      if (nums && fade >= 1) {
        const txt = String(values[r][i]); g.fillStyle = A.rgba(v === 0 ? pal.muted : pal.dark ? pal.bg : pal.ink, 0.95);
        g.font = `600 ${Math.max(9, G.s * (txt.length > 3 ? 0.26 : txt.length > 2 ? 0.32 : 0.4))}px ${pal.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + 1);
      }
    }
  }
  if (row >= 0 && row < rows) {
    const [x0, y0] = G.cell(row, 0), [x1] = G.cell(row, row);
    g.strokeStyle = A.rgba(pal.ink, 0.8); g.lineWidth = 2.5 * scale; g.beginPath(); g.roundRect ? g.roundRect(x0 - G.s * 0.55, y0 - G.s * 0.5, x1 - x0 + G.s * 1.1, G.s, G.s * 0.5) : g.rect(x0 - G.s * 0.55, y0 - G.s * 0.5, x1 - x0 + G.s * 1.1, G.s); g.stroke();
  }
  if (diag >= 0) {
    const cells = A.diagonalCells(diag).filter(([r]) => r < rows);
    g.strokeStyle = A.rgba(pal.ink, 0.85); g.lineWidth = 3 * scale; g.lineCap = 'round'; g.beginPath();
    cells.forEach(([r, i], j) => { const [x, y] = G.cell(r, i); j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    cells.forEach(([r, i]) => { const [x, y] = G.cell(r, i); g.beginPath(); g.arc(x, y, G.s * 0.2, 0, TAU); g.fillStyle = A.rgba(pal.ink, 0.9); g.fill(); });
  }
  g.restore();
  return G;
}

/* ---------- Digital-root square ---------- */
export function square(g, w, h, pal, piece, { upto = Infinity, scale = 1 } = {}) {
  const { d, view } = piece, stops = stopsOf(pal, piece.p), cx = w / 2, cy = h / 2, S = Math.min(w, h);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (view === 'grid') {
    const sq = A.vedicSquare(), c = (S * 0.86) / 9, x0 = cx - c * 4.5, y0 = cy - c * 4.5, on = A.cellsOf(d);
    const shown = Math.min(on.length, upto);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      const v = sq[i][j], k = on.findIndex(([a, b]) => a === i && b === j), lit = k >= 0 && k < shown;
      g.fillStyle = lit ? A.rgba(A.along(stops, (i + j) / 18), 0.95) : A.rgba(pal.ink, 0.05);
      g.beginPath(); g.roundRect ? g.roundRect(x0 + j * c + 2, y0 + i * c + 2, c - 4, c - 4, c * 0.2) : g.rect(x0 + j * c + 2, y0 + i * c + 2, c - 4, c - 4); g.fill();
      g.fillStyle = A.rgba(lit ? (pal.dark ? pal.bg : pal.ink) : pal.muted, lit ? 1 : 0.8); g.font = `600 ${c * 0.42}px ${pal.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v, x0 + j * c + c / 2, y0 + i * c + c / 2 + 1);
    }
  } else if (view === 'star') {
    const R = S * 0.4, P = k => { const a = -Math.PI / 2 + (TAU * (k % 9)) / 9; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; };
    const order = A.starOrder(d), path = [...order, order[0]], n = Math.min(path.length - 1, upto);
    g.strokeStyle = A.rgba(pal.ink, 0.12); g.lineWidth = 1.5 * scale; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    blend(g, pal);
    for (let rep = pal.dark ? 0 : 2; rep < 3; rep++) {
      g.lineWidth = (10 - rep * 3.5) * scale;
      for (let s = 0; s < Math.ceil(n); s++) {
        const [x1, y1] = P(path[s]), [x2b, y2b] = P(path[s + 1]), f = Math.min(1, n - s);
        g.strokeStyle = A.rgba(A.along(stops, s / 9), rep === 2 ? 0.95 : 0.18);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + (x2b - x1) * f, y1 + (y2b - y1) * f); g.stroke();
      }
    }
    g.globalCompositeOperation = 'source-over';
    for (let k = 1; k <= 9; k++) { const [x, y] = P(k); g.fillStyle = A.rgba(pal.bg); g.beginPath(); g.arc(x, y, 15 * scale, 0, TAU); g.fill(); g.strokeStyle = A.rgba(pal.ink, 0.5); g.lineWidth = 2 * scale; g.stroke(); g.fillStyle = A.rgba(pal.ink); g.font = `600 ${15 * scale}px ${pal.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k, x, y + 1); }
  } else {
    const { pts } = A.turtle(d, piece.a);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const k = (S * 0.82) / Math.max(maxX - minX, maxY - minY, 1), ox = cx - ((minX + maxX) / 2) * k, oy = cy - ((minY + maxY) / 2) * k;
    const n = Math.min(pts.length - 1, upto), P = i => [ox + pts[i][0] * k, oy + pts[i][1] * k];
    if (n >= pts.length - 1) {
      /* the closed walk as stained glass: even-odd fill of the whole path */
      const grd = g.createLinearGradient(cx - S / 2, cy - S / 2, cx + S / 2, cy + S / 2);
      stops.forEach((c, i) => grd.addColorStop(i / Math.max(1, stops.length - 1), A.rgba(c, pal.dark ? 0.16 : 0.2)));
      g.beginPath(); pts.forEach((_, i) => (i ? g.lineTo(...P(i)) : g.moveTo(...P(i)))); g.closePath(); g.fillStyle = grd; g.fill('evenodd');
    }
    blend(g, pal);
    for (let pass = pal.dark ? 0 : 1; pass < 2; pass++) {
      g.lineWidth = (pass ? 3 : 12) * scale;
      for (let s = 0; s < Math.ceil(n); s++) {
        const [x1, y1] = P(s), [x2, y2] = P(s + 1), f = Math.min(1, n - s);
        g.strokeStyle = A.rgba(A.along(stops, s / (pts.length - 1)), pass ? 0.95 : 0.16);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f); g.stroke();
      }
    }
    g.globalCompositeOperation = 'source-over';
    const [sx, sy] = P(0); g.fillStyle = A.rgba(pal.ink, 0.8); g.beginPath(); g.arc(sx, sy, 4 * scale, 0, TAU); g.fill();
  }
  g.restore();
}

/* ---------- Śulba altar ---------- */
export function altarGeom(w, h) { const S = Math.min(w, h) * 0.42; return { S, map: ([x, y]) => [w / 2 + x * S, h / 2 + y * S], unmap: (px, py) => [(px - w / 2) / S, (py - h / 2) / S] }; }
export function altar(g, w, h, pal, piece, { hover = -1, scale = 1 } = {}) {
  const G = altarGeom(w, h), regs = A.altar(piece.levels), fills = [null, pal.coral, pal.sun, pal.teal, pal.ink];
  g.save(); g.lineJoin = 'round';
  regs.forEach((r, i) => {
    const f = piece.f[i] || 0; g.beginPath(); r.pts.forEach((p, j) => { const [x, y] = G.map(p); j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
    g.fillStyle = f ? A.rgba(fills[f], 0.92) : A.rgba(pal.ink, i === hover ? 0.12 : 0.04); g.fill();
    g.strokeStyle = A.rgba(pal.ink, 0.65); g.lineWidth = 2 * scale; g.stroke();
  });
  /* the region under the pointer or the keyboard cursor gets a heavy outline, visible on any fill */
  if (hover >= 0 && regs[hover]) { g.beginPath(); regs[hover].pts.forEach((p, j) => { const [x, y] = G.map(p); j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.strokeStyle = A.rgba(pal.ink, 0.95); g.lineWidth = 4.5 * scale; g.stroke(); }
  /* pegs at every corner, like the stakes of the rope */
  const seen = new Set();
  regs.forEach(r => r.pts.forEach(p => { const key = p.map(v => v.toFixed(3)).join(); if (seen.has(key)) return; seen.add(key); const [x, y] = G.map(p); g.beginPath(); g.arc(x, y, 3.5 * scale, 0, TAU); g.fillStyle = A.rgba(pal.bg); g.fill(); g.strokeStyle = A.rgba(pal.ink, 0.9); g.lineWidth = 1.8 * scale; g.stroke(); }));
  g.restore();
  return G;
}

/* ---------- Ropes ---------- */
/* A rope of length `len` between two points: straight when taut, sagging in a parabola when slack
   (arc length of a shallow parabola is about d + 8 s² / (3 d)) */
export function rope(g, p, q, len, { color, width = 3, taut = false } = {}) {
  const d = Math.hypot(q[0] - p[0], q[1] - p[1]), slack = Math.max(0, len - d), sag = d > 0 ? Math.sqrt((3 * d * slack) / 8) : slack / 2;
  g.save(); g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round';
  if (taut) { g.shadowColor = color; g.shadowBlur = 10; }
  g.setLineDash([width * 2.2, width * 1.1]);
  g.beginPath(); g.moveTo(p[0], p[1]);
  if (sag < 0.5) g.lineTo(q[0], q[1]); else g.quadraticCurveTo((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + 2 * sag, q[0], q[1]);
  g.stroke(); g.restore();
}
export function peg(g, [x, y], pal, { r = 7, label = '', hot = false } = {}) {
  g.save();
  if (hot) { g.beginPath(); g.arc(x, y, r * 2.4, 0, TAU); g.fillStyle = A.rgba(pal.sun, 0.35); g.fill(); }
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = A.rgba(pal.sun); g.fill(); g.lineWidth = 2.5; g.strokeStyle = A.rgba(pal.ink); g.stroke();
  if (label) { g.fillStyle = A.rgba(pal.ink); g.font = `700 14px ${pal.font}`; g.textAlign = 'center'; g.fillText(label, x, y - r - 8); }
  g.restore();
}
