/* Digit connectors (openspec working-memory-scaffolds, trick-connectors spec): for one step of the Trick animator, a
   small diagram of the question's numbers with coloured lines joining the digits that step uses. Pure: numbers in,
   markup out (no DOM at import), loaded by js/app.js the first time a Trick page draws its animator.
   linksFor(trickId, vals, step) is { svg, label, lines } or null for a step that uses no digit of the question;
   lines: [{ from, to, color, dashed }] as said in the text alternative, for tests. Colours are the category tokens the
   step's own highlights use (H() in js/vedic.js), so a line and the number it explains match. */

const BASES = [10, 100, 1000];
const word = d => (d < 0 ? 'minus ' + -d : 'plus ' + d);
const sign = d => (d < 0 ? '&minus;' + -d : '+' + d);
const line = (x1, y1, x2, y2, color, dashed = false) => `<line class="cx-line cx-${color}${dashed ? ' cx-dash' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" pathLength="1"/>`;
const text = (x, y, s, on, anchor = 'middle') => `<text class="cx-d${on ? ' on' : ''}" x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
const svg = (w, h, label, body) => ({ svg: `<svg class="cx" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">${body}</svg>`, label });

/* Nikhilaṃ near a base: each number with its distance beside it (98 | −2 over 97 | −3).
   Step 0 joins each number to its distance, step 1 crosses from the first number to the second distance (the left part;
   the other cross gives the same and is dashed), step 2 joins the two distances (multiplied for the right part). */
function nearBase([a, b], step) {
  if (step > 2) return null;
  const base = BASES.find(x => Math.abs(a - x) <= x * 0.3 && Math.abs(b - x) <= x * 0.3); if (!base) return null;
  const da = a - base, db = b - base, W = 220, NX = 78, DX = 150, Y1 = 34, Y2 = 84;
  const on = [{ a: 1, b: 1, da: 1, db: 1 }, { a: 1, db: 1 }, { da: 1, db: 1 }][step]; /* the numbers this step uses */
  const nums = text(NX, Y1, a, on.a, 'end') + text(NX, Y2, b, on.b, 'end') + text(DX, Y1, sign(da), on.da, 'start') + text(DX, Y2, sign(db), on.db, 'start')
    + `<line class="cx-rule" x1="114" y1="8" x2="114" y2="104"/>`;
  let lines, label, body;
  if (step === 0) {
    lines = [{ from: String(a), to: String(da), color: 'coral' }, { from: String(b), to: String(db), color: 'teal' }];
    body = line(NX + 6, Y1 - 8, DX - 6, Y1 - 8, 'coral') + line(NX + 6, Y2 - 8, DX - 6, Y2 - 8, 'teal');
    label = `Lines join ${a} to its distance ${word(da)}, and ${b} to its distance ${word(db)}.`;
  } else if (step === 1) {
    lines = [{ from: String(a), to: String(db), color: 'sky' }, { from: String(b), to: String(da), color: 'sky', dashed: true }];
    body = line(NX - 10, Y1 + 6, DX + 10, Y2 - 22, 'sky') + line(NX - 10, Y2 - 22, DX + 10, Y1 + 6, 'sky', true);
    label = `A line crosses from ${a} to ${word(db)}: ${a} ${db < 0 ? 'minus' : 'plus'} ${Math.abs(db)} is the left part. Crossing from ${b} to ${word(da)} gives the same.`;
  } else {
    lines = [{ from: String(da), to: String(db), color: 'sun' }];
    body = line(DX + 12, Y1 + 8, DX + 12, Y2 - 26, 'sun');
    label = `A line joins ${word(da)} and ${word(db)}: multiply them for the right part.`;
  }
  return { ...svg(W, 104, label, body + nums), lines };
}

/* Ūrdhva-Tiryagbhyām: the two numbers' digits in columns, one above the other. Column k (from the right) joins every
   top digit with the bottom digit it is multiplied by in that column: straight down, then crosswise. */
function crosswise([a, b], step) {
  const A = String(a).split('').map(Number), B = String(b).split('').map(Number), n = A.length;
  if (B.length !== n || step >= 2 * n - 1) return null;
  const C = 44, X0 = 24, YT = 30, YB = 94, W = X0 * 2 + C * (n - 1), x = j => X0 + C * j, COLORS = ['coral', 'teal', 'plum'];
  const pairs = []; for (let i = 0; i <= step; i++) if (i < n && step - i < n) pairs.push([n - 1 - i, n - 1 - (step - i)]); /* [top j, bottom j], left to right */
  const used = { t: new Set(pairs.map(p => p[0])), b: new Set(pairs.map(p => p[1])) };
  const nums = A.map((d, j) => text(x(j), YT, d, used.t.has(j))).join('') + B.map((d, j) => text(x(j), YB, d, used.b.has(j))).join('');
  const lines = pairs.map(([t, bt], k) => ({ from: String(A[t]), to: String(B[bt]), color: COLORS[k % 3] }));
  const body = pairs.map(([t, bt], k) => line(x(t), YT + 8, x(bt), YB - 26, COLORS[k % 3])).join('');
  const said = pairs.map(([t, bt]) => `the top ${A[t]} and the bottom ${B[bt]}`);
  const label = pairs.length === 1 ? `A line joins ${said[0]}.` : `Lines join ${said.slice(0, -1).join(', ')}, and ${said.at(-1)}.`;
  return { ...svg(W, 104, label, body + nums), lines };
}

const BY = { 'near-base': nearBase, crosswise };
export const hasLinks = trickId => trickId in BY;
export function linksFor(trickId, vals, step) {
  const f = BY[trickId];
  return f ? f(vals, step) : null;
}
