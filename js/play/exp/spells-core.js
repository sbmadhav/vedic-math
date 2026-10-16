/* Sutra Spellbook: pure logic (no DOM). Spells, problem generators, the digit board each spell is cast on,
   stroke recognition (which digit nodes a path passes through) and the judge that turns strokes into steps.
   Sutras come from Bharati Krishna Tirtha's 1965 book "Vedic Mathematics"; explanations are written fresh. */
import { int } from '../kit.js';

/* ---------- Small helpers ---------- */
export const ek = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const digitsOf = n => String(n).split('').map(Number);
const len = n => String(Math.abs(n)).length;
const MINUS = '−', TIMES = '×';
const sgn = n => (n < 0 ? `${MINUS}${-n}` : `+${n}`);
export const LEVEL_RANK = { explorer: 0, challenger: 1, pro: 2 };

/* Problems are always a multiplication { a, b }; a square has a === b */
export const show = p => (p.a === p.b ? `${p.a}²` : `${p.a} ${TIMES} ${p.b}`);
export const answerOf = p => p.a * p.b;

/* Nearest power-of-ten base for near-base tricks, or 0 when the number is not near one */
export function baseNear(n) {
  for (const B of [10, 100, 1000]) if (n > 0 && Math.abs(n - B) <= Math.floor(B * 0.45)) return B;
  return 0;
}
export function nearPair(a, b) {
  const B = baseNear(a);
  if (!B || baseNear(b) !== B) return 0;
  const da = a - B, db = b - B;
  if (da === 0 || db === 0) return 0;
  if (da * db < 0) return 0; /* one above and one below makes the right part negative; not cast here */
  return B;
}

/* ---------- Answer assembly: parts listed right to left, each with a value v and a width w in digits.
   The last part has width Infinity. Carries flow left exactly like column arithmetic. ---------- */
export function assemble(parts, done = parts.map(() => true)) {
  let carry = 0, ready = true, shift = 1, total = 0;
  const cells = parts.map((p, i) => {
    if (done[i] && ready) {
      const t = p.v + carry;
      if (Number.isFinite(p.w)) {
        const m = 10 ** p.w, c = Math.floor(t / m);
        const cell = { text: String(t - c * m).padStart(p.w, '0'), carryIn: carry, carryOut: c, state: 'set' };
        carry = c; return cell;
      }
      const cell = { text: String(t), carryIn: carry, carryOut: 0, state: 'set' }; carry = 0; return cell;
    }
    if (done[i]) { ready = false; return { text: String(p.v), carryIn: 0, carryOut: 0, state: 'raw' }; }
    ready = false;
    return { text: Number.isFinite(p.w) ? '?'.repeat(p.w) : '?', carryIn: 0, carryOut: 0, state: 'empty' };
  });
  parts.forEach(p => { total += p.v * shift; if (Number.isFinite(p.w)) shift *= 10 ** p.w; });
  return { cells, value: total, complete: parts.every((_, i) => done[i]) };
}

/* ---------- The spells ----------
   Each spell: id, sutra (IAST), meaning, title, needs (when it applies), why (shown after casting),
   fits(problem), gen(r, tier, level) -> problem, board(problem) -> { nodes, steps, parts, given, edge(key, nodesById) }.
   Board coordinates are in a 320 x 240 viewBox. A step lists options (alternative sets of edges, any order,
   any direction) and the steps that must come before it (after). */
export const VIEW = { w: 320, h: 240, r: 25, hit: 36 };
const tensUnits = n => [Math.floor(n / 10), n % 10];
const times = (x, y) => `${x} ${TIMES} ${y} = ${x * y}`;

const crosswise = {
  id: 'crosswise', sutra: 'Ūrdhva-Tiryagbhyām', meaning: 'Vertically and crosswise',
  title: 'Criss-cross multiply', short: 'Criss-cross',
  needs: 'two numbers with two digits each',
  why: 'Each column of the answer collects every pair of digits whose places add up to that column: units with units, the two crosswise pairs in the tens, tens with tens in the hundreds.',
  fits: p => p.a >= 10 && p.a <= 99 && p.b >= 10 && p.b <= 99,
  gen(r, tier, lv) {
    const hi = [[3, 4, 6, 9], [4, 6, 9, 9], [6, 9, 9, 9]][LEVEL_RANK[lv]][Math.min(tier, 3)];
    const d = () => int(r, 1, hi);
    return { a: d() * 10 + d(), b: d() * 10 + d() };
  },
  board(p) {
    const [a1, a0] = tensUnits(p.a), [b1, b0] = tensUnits(p.b);
    return {
      nodes: [
        { id: 'a1', label: String(a1), x: 110, y: 62 }, { id: 'a0', label: String(a0), x: 210, y: 62 },
        { id: 'b1', label: String(b1), x: 110, y: 178 }, { id: 'b0', label: String(b0), x: 210, y: 178 }
      ],
      steps: [
        { name: 'Vertical units', say: 'Draw straight down through the units', opts: [[ek('a0', 'b0')]], after: [], part: 0, note: times(a0, b0) },
        { name: 'Crosswise', partial: true, say: 'Draw both diagonals; their products add up', opts: [[ek('a1', 'b0'), ek('a0', 'b1')]], after: [0], part: 1, note: `${a1} ${TIMES} ${b0} + ${a0} ${TIMES} ${b1} = ${a1 * b0 + a0 * b1}` },
        { name: 'Vertical tens', say: 'Draw straight down through the tens', opts: [[ek('a1', 'b1')]], after: [1], part: 2, note: times(a1, b1) }
      ],
      parts: [{ v: a0 * b0, w: 1 }, { v: a1 * b0 + a0 * b1, w: 1 }, { v: a1 * b1, w: Infinity }],
      given: [],
      edge(k, n) {
        const [x, y] = k.split('|').map(id => n[id]);
        return { calc: times(+x.label, +y.label), hint: x.y === y.y ? 'Those two live in the same number. Every stroke joins the top number to the bottom one.' : '' };
      }
    };
  }
};

/* Squares ending in 5 and its big sibling (same tens, units add to ten) share a board: the tens vertical
   turns the bottom tens digit into its "one more". Drawing the cross fizzles and shows why: the crosswise
   pair always makes a whole number of tens, exactly one more tens digit. */
const ekBoard = (p, unitsName) => {
  const t = Math.floor(p.a / 10), u1 = p.a % 10, u2 = p.b % 10;
  return {
    nodes: [
      { id: 'a1', label: String(t), x: 110, y: 62 }, { id: 'a0', label: String(u1), x: 210, y: 62 },
      { id: 'b1', label: String(t), x: 110, y: 178, morph: { by: ek('a1', 'b1'), label: String(t + 1), tag: 'one more' } }, { id: 'b0', label: String(u2), x: 210, y: 178 }
    ],
    steps: [
      { name: unitsName, say: 'Draw straight down through the units', opts: [[ek('a0', 'b0')]], after: [], part: 0, note: `${u1} ${TIMES} ${u2} = ${String(u1 * u2).padStart(2, '0')}` },
      { name: 'One more than the one before', say: 'Draw down through the tens: the bottom one grows by one', opts: [[ek('a1', 'b1')]], after: [], part: 1, note: times(t, t + 1) }
    ],
    parts: [{ v: u1 * u2, w: 2 }, { v: t * (t + 1), w: Infinity }],
    given: [],
    edge(k, n) {
      const [x, y] = k.split('|').map(id => n[id]);
      if (k === ek('a1', 'b0') || k === ek('a0', 'b1')) {
        const cross = t * u2 + u1 * t;
        return { calc: `${t} ${TIMES} ${u2} + ${u1} ${TIMES} ${t} = ${cross}`, hint: `No cross in this spell. The crosswise pair always makes ${cross}, which is ${t} more tens: that is where the "one more" comes from.` };
      }
      return { calc: times(+x.label, +y.label), hint: 'Strokes go straight down, from the top number to the bottom one.' };
    }
  };
};

const sq5 = {
  id: 'sq5', sutra: 'Ekādhikena Pūrveṇa', meaning: 'By one more than the one before',
  title: 'Squares ending in 5', short: 'Fives squared',
  needs: 'a number ending in 5, squared',
  why: 'The two crosswise pairs always add up to one extra tens digit, so the tens meets its "one more", and 5 times 5 always leaves 25.',
  fits: p => p.a === p.b && p.a % 10 === 5 && p.a >= 15 && p.a < 200,
  gen(r, tier, lv) {
    const rank = LEVEL_RANK[lv];
    const hi = [[4, 6, 9, 9], [9, 9, 9, 9], [9, 9, 14, 19]][rank][Math.min(tier, 3)];
    const lo = rank === 2 && tier >= 2 ? 6 : 1;
    const n = int(r, lo, hi) * 10 + 5; return { a: n, b: n };
  },
  board: p => ekBoard(p, 'Five times five')
};

const ends10 = {
  id: 'ends10', sutra: "Antyayordaśake'pi", meaning: 'When the last digits add to ten',
  title: 'Same tens, units make ten', short: 'Ten buddies',
  needs: 'the same tens digit, with units that add to 10',
  why: 'Units that add to ten make the crosswise pairs one whole extra tens digit again, so the tens meets its "one more" and the units multiply on their own.',
  fits: p => p.a >= 10 && p.b >= 10 && p.a < 200 && Math.floor(p.a / 10) === Math.floor(p.b / 10) && (p.a % 10) + (p.b % 10) === 10,
  gen(r, tier, lv) {
    const hi = [[3, 5, 9, 9], [5, 9, 9, 9], [9, 9, 14, 19]][LEVEL_RANK[lv]][Math.min(tier, 3)];
    const t = int(r, 1, hi), u = int(r, 1, 9);
    return { a: t * 10 + u, b: t * 10 + 10 - u };
  },
  board: p => ekBoard(p, 'Units times units')
};

const by11 = {
  id: 'by11', sutra: 'Ūrdhva-Tiryagbhyām with 11', meaning: 'Vertically and crosswise, with 11',
  title: 'Split and sum by 11', short: 'Times 11',
  needs: 'any number times 11',
  why: 'Times 11 is times 10 plus times 1, so every digit lands beside its own neighbor: each inside place is a neighbor sum, and the two ends stay as they are.',
  fits: p => (p.b === 11 && p.a >= 10 && p.a <= 999) || (p.a === 11 && p.b >= 10 && p.b <= 999),
  gen(r, tier, lv) {
    const rank = LEVEL_RANK[lv];
    if (rank === 0 && tier < 2) { const a = int(r, 1, 8), b = int(r, 0, 9 - a); return { a: a * 10 + b, b: 11 }; }
    if (rank === 0 || (rank === 1 && tier < 2)) return { a: int(r, 12, 99), b: 11 };
    return { a: int(r, 102, 989), b: 11 };
  },
  board(p) {
    const n = p.b === 11 ? p.a : p.b, d = digitsOf(n), k = d.length;
    const xs = k === 2 ? [110, 210] : [70, 160, 250];
    const nodes = d.map((v, i) => ({ id: 'd' + i, label: String(v), x: xs[i], y: 120 }));
    const steps = [];
    for (let i = k - 2; i >= 0; i--) steps.push({ name: `Neighbors ${d[i]} and ${d[i + 1]}`, say: 'Swipe across two neighbors to add them', opts: [[ek('d' + i, 'd' + (i + 1))]], after: [], part: k - 1 - i, note: `${d[i]} + ${d[i + 1]} = ${d[i] + d[i + 1]}` });
    const parts = [{ v: d[k - 1], w: 1 }];
    for (let i = k - 2; i >= 0; i--) parts.push({ v: d[i] + d[i + 1], w: 1 });
    parts.push({ v: d[0], w: Infinity });
    return {
      nodes, steps, parts, given: [0, parts.length - 1],
      edge(key, nd) { const [x, y] = key.split('|').map(id => nd[id]); return { calc: `${x.label} + ${y.label} = ${+x.label + +y.label}`, hint: 'Only next-door neighbors meet in this spell.' }; }
    };
  }
};

const by9s = {
  id: 'by9s', sutra: 'Ekanyūnena Pūrveṇa', meaning: 'By one less than the one before',
  title: 'Times 9, 99 or 999', short: 'Nines',
  needs: 'a number times 9, 99 or 999, with as many digits as there are nines',
  why: 'Times 99 is times 100 minus the number. One less on the left borrows a hundred; the right gets back that hundred minus the number, which is all from 9 and the last from 10.',
  fits: p => { const [n, z] = p.b >= p.a ? [p.a, p.b] : [p.b, p.a]; return [9, 99, 999].includes(z) && len(n) === len(z) && n >= 2; },
  gen(r, tier, lv) {
    const rank = LEVEL_RANK[lv];
    if (rank === 0 && tier < 3) return { a: int(r, 2, 9), b: 9 };
    if (rank === 2 && tier >= 1 && r() < 0.6) return { a: int(r, 101, 998), b: 999 };
    return { a: int(r, 11, 98), b: 99 };
  },
  board(p) {
    const [n, z] = p.b >= p.a ? [p.a, p.b] : [p.b, p.a], w = len(z);
    return {
      nodes: [
        { id: 'n', label: String(n), x: 82, y: 64 },
        { id: 'm', label: `${MINUS}1`, x: 82, y: 180, ghost: true, morph: { by: ek('n', 'm'), label: String(n - 1), tag: 'one less' } },
        { id: 'z', label: String(z), x: 238, y: 180 }
      ],
      steps: [
        { name: 'One less', say: 'Drag the number down onto its one-less twin', opts: [[ek('n', 'm')]], after: [], part: 1, note: `${n} ${MINUS} 1 = ${n - 1}` },
        { name: `All from ${'9'.repeat(w)}`, say: `Then swipe across to the ${z}`, opts: [[ek('m', 'z')]], after: [0], part: 0, note: `${z} ${MINUS} ${n - 1} = ${z - (n - 1)}` }
      ],
      parts: [{ v: z - (n - 1), w }, { v: n - 1, w: Infinity }],
      given: [],
      edge(k) {
        if (k === ek('n', 'z')) return { calc: `${z} ${MINUS} ${n} = ${z - n}`, hint: 'So close. Take one less first, then the nines.' };
        return { calc: '', hint: '' };
      }
    };
  }
};

const gapWord = d => (d < 0 ? 'below' : 'above');
const nikhilam = {
  id: 'nikhilam', sutra: 'Nikhilaṃ Navataścaramaṃ Daśataḥ', meaning: 'All from 9 and the last from 10',
  title: 'Near-base multiply', short: 'Near base',
  needs: 'two different numbers near the same 10, 100 or 1000, on the same side',
  why: '(B + x)(B + y) = B(B + x + y) + xy. Crossing a number to the other gap gives B + x + y; the gaps multiplied give xy.',
  fits: p => p.a !== p.b && nearPair(p.a, p.b) > 0,
  gen(r, tier, lv) {
    const rank = LEVEL_RANK[lv];
    let a, b;
    if (rank === 0) { do { a = int(r, tier < 2 ? 7 : 6, 9); b = int(r, tier < 2 ? 7 : 6, 9); } while (a === b); return { a, b }; }
    let B = 100, lo = [92, 86, 80, 75][Math.min(tier, 3)], above = false;
    if (rank === 2) { above = r() < 0.4; if (tier >= 3 && r() < 0.4) { B = 1000; lo = 985; } }
    do { a = int(r, lo, B - 1); b = int(r, lo, B - 1); } while (a === b);
    if (above) { a = 2 * B - a; b = 2 * B - b; }
    return { a, b };
  },
  board(p) {
    const B = nearPair(p.a, p.b), da = p.a - B, db = p.b - B, w = len(B) - 1;
    return {
      nodes: [
        { id: 'a', label: String(p.a), x: 70, y: 54 }, { id: 'B', label: String(B), x: 70, y: 120, base: true },
        { id: 'b', label: String(p.b), x: 70, y: 186 },
        { id: 'da', label: sgn(da), x: 250, y: 54, hidden: true, revealBy: ek('a', 'B') }, { id: 'db', label: sgn(db), x: 250, y: 186, hidden: true, revealBy: ek('b', 'B') }
      ],
      steps: [
        { name: 'Find the gaps', say: `Swipe each number onto the ${B} line to see how far away it is`, opts: [[ek('a', 'B'), ek('b', 'B')]], after: [], part: -1, note: `${p.a} is ${Math.abs(da)} ${gapWord(da)}, ${p.b} is ${Math.abs(db)} ${gapWord(db)}` },
        { name: 'Crosswise', say: 'Cross from one number to the other one’s gap', opts: [[ek('a', 'db')], [ek('b', 'da')]], after: [0], part: 1, note: `${p.a} ${db < 0 ? MINUS : '+'} ${Math.abs(db)} = ${p.a + db}` },
        { name: 'Gap times gap', say: 'Draw down the two gaps to multiply them', opts: [[ek('da', 'db')]], after: [0], part: 0, note: `${Math.abs(da)} ${TIMES} ${Math.abs(db)} = ${da * db}` }
      ],
      parts: [{ v: da * db, w }, { v: p.a + db, w: Infinity }],
      given: [],
      edge(k) {
        if (k === ek('a', 'b')) return { calc: `${p.a} ${TIMES} ${p.b}, the long way`, hint: 'That is the whole problem. Visit the base line first.' };
        if (k === ek('a', 'da') || k === ek('b', 'db')) {
          const [x, d] = k.includes('da') ? [p.a, da] : [p.b, db];
          return { calc: `${x} ${d < 0 ? MINUS : '+'} ${Math.abs(d)} = ${x + d}`, hint: 'That is a number and its own gap. Cross over to the other gap instead.' };
        }
        if (k === ek('B', 'da') || k === ek('B', 'db')) return { calc: '', hint: 'The base already did its job. Cross from a number to the other gap.' };
        return { calc: '', hint: '' };
      }
    };
  }
};

const yavad = {
  id: 'yavad', sutra: 'Yāvadūnam', meaning: 'Whatever the extent of its deficiency',
  title: 'Squares near a base', short: 'Near squares',
  needs: 'a number near 10, 100 or 1000, squared',
  why: '(B + d)² = B(B + 2d) + d². Going the gap again gives B + 2d on the left; the gap squared fills the right.',
  fits: p => p.a === p.b && nearPair(p.a, p.a) > 0,
  gen(r, tier, lv) {
    const rank = LEVEL_RANK[lv];
    if (rank === 0) { const n = tier < 2 ? int(r, 7, 9) : (r() < 0.5 ? int(r, 6, 9) : int(r, 11, 13)); return { a: n, b: n }; }
    let B = 100, g = [5, 9, 15, 25][Math.min(tier, 3)];
    if (rank === 2 && tier >= 3 && r() < 0.4) { B = 1000; g = 15; }
    let d; do { d = int(r, -g, g); } while (d === 0 || (rank === 1 && tier < 1 && d > 0));
    return { a: B + d, b: B + d };
  },
  board(p) {
    const B = nearPair(p.a, p.a), d = p.a - B, w = len(B) - 1;
    return {
      nodes: [
        { id: 'n', label: String(p.a), x: 70, y: 64 }, { id: 'B', label: String(B), x: 70, y: 180, base: true },
        { id: 'd', label: sgn(d), x: 250, y: 64, hidden: true, revealBy: ek('B', 'n') }, { id: 'e', label: sgn(d), x: 250, y: 180, hidden: true, revealBy: ek('B', 'n') }
      ],
      steps: [
        { name: 'Find the gap', say: `Swipe the number onto the ${B} line`, opts: [[ek('n', 'B')]], after: [], part: -1, note: `${p.a} is ${Math.abs(d)} ${gapWord(d)} ${B}` },
        { name: 'Go that far again', say: 'From the number across to its gap', opts: [[ek('n', 'd')], [ek('n', 'e')]], after: [0], part: 1, note: `${p.a} ${d < 0 ? MINUS : '+'} ${Math.abs(d)} = ${p.a + d}` },
        { name: 'Gap squared', say: 'Down the two gaps: square it', opts: [[ek('d', 'e')]], after: [0], part: 0, note: `${Math.abs(d)} ${TIMES} ${Math.abs(d)} = ${d * d}` }
      ],
      parts: [{ v: d * d, w }, { v: p.a + d, w: Infinity }],
      given: [],
      edge(k) {
        if (k === ek('B', 'd') || k === ek('B', 'e')) return { calc: '', hint: 'The base already showed the gap. Start from the number.' };
        return { calc: '', hint: '' };
      }
    };
  }
};

export const SPELLS = [crosswise, by11, sq5, by9s, nikhilam, ends10, yavad];
export const spellById = id => SPELLS.find(s => s.id === id);
/* The order spells are taught in, by level */
export const ORDER = {
  explorer: ['by11', 'sq5', 'by9s', 'nikhilam', 'crosswise', 'ends10', 'yavad'],
  challenger: ['crosswise', 'sq5', 'by11', 'by9s', 'nikhilam', 'ends10', 'yavad'],
  pro: ['crosswise', 'sq5', 'nikhilam', 'by11', 'by9s', 'yavad', 'ends10']
};
export const fitting = (p, ids = SPELLS.map(s => s.id)) => ids.filter(id => spellById(id).fits(p));

/* ---------- Stroke recognition ---------- */
/* Nodes a path passes through, in order, within a forgiving radius (wider for longer labels). Points between
   samples are filled in so a fast flick still touches every node it crosses. Hidden nodes cannot be hit. */
export function pathNodes(points, nodes, radius = VIEW.hit) {
  const live = nodes.filter(n => !n.hidden);
  const out = [];
  const visit = (x, y) => {
    let best = null, bd = 1;
    for (const n of live) {
      const L = String(n.label).length, rx = radius * (L > 2 ? 1.5 : L > 1 ? 1.25 : 1);
      const dd = ((x - n.x) / rx) ** 2 + ((y - n.y) / radius) ** 2;
      if (dd <= bd) { bd = dd; best = n; }
    }
    if (best && out[out.length - 1] !== best.id) out.push(best.id);
  };
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    if (i > 0) {
      const [px, py] = points[i - 1], steps = Math.ceil(Math.hypot(x - px, y - py) / (radius / 3));
      for (let s = 1; s < steps; s++) visit(px + ((x - px) * s) / steps, py + ((y - py) * s) / steps);
    }
    visit(x, y);
  }
  return out;
}
export const pathEdges = ids => ids.slice(1).map((id, i) => ek(ids[i], id));

/* ---------- The judge ---------- */
export const newCast = board => ({ done: board.steps.map(() => false), got: board.steps.map(() => new Set()), seen: new Set() });
const available = (board, cast, i) => !cast.done[i] && board.steps[i].after.every(j => cast.done[j]);

/* Apply one edge. Returns { kind, step, complete, edge, wait } where kind is
   ok (counted toward a step), dup (already drawn or part of a finished step), early (belongs to a step whose
   earlier step is not done; wait names it), stray (not part of this spell). Mutates cast. */
export function applyEdge(board, cast, key) {
  for (let i = 0; i < board.steps.length; i++) {
    const s = board.steps[i];
    if (!s.opts.some(o => o.includes(key))) continue;
    if (cast.done[i] || cast.got[i].has(key)) return { kind: 'dup', step: i, edge: key };
    if (!available(board, cast, i)) continue;
    const next = new Set([...cast.got[i], key]);
    const opt = s.opts.find(o => [...next].every(k => o.includes(k)));
    if (!opt) continue;
    cast.got[i] = next; cast.seen.add(key);
    const complete = opt.every(k => next.has(k));
    if (complete) cast.done[i] = true;
    return { kind: 'ok', step: i, complete, edge: key };
  }
  const later = board.steps.findIndex(s => s.opts.some(o => o.includes(key)));
  if (later >= 0) return { kind: 'early', step: later, edge: key, wait: board.steps[later].after.find(j => !cast.done[j]) };
  return { kind: 'stray', step: -1, edge: key };
}
/* Nodes as they look now: hidden nodes appear once the edge that reveals them is drawn, twins morph */
export function visibleNodes(board, cast) {
  return board.nodes.map(n => {
    const morphed = !!(n.morph && cast.seen.has(n.morph.by));
    return { ...n, hidden: !!n.hidden && !cast.seen.has(n.revealBy), label: morphed ? n.morph.label : n.label, morphed, ghost: n.ghost && !morphed };
  });
}
/* Which answer parts are done: given parts at once, the rest when their step completes */
export const partsDone = (board, cast) => board.parts.map((_, i) => board.given.includes(i) || board.steps.some((s, j) => s.part === i && cast.done[j]));
export const castDone = cast => cast.done.every(Boolean);
/* A perfect cast: the steps in a valid order with the first option of each (used by the guide and tests) */
export function solution(board) {
  const done = board.steps.map(() => false), out = [];
  while (out.length < board.steps.length) {
    const i = board.steps.findIndex((s, k) => !done[k] && s.after.every(j => done[j]));
    if (i < 0) throw new Error('step order has a cycle');
    done[i] = true; out.push({ step: i, edges: board.steps[i].opts[0] });
  }
  return out;
}
/* Describe a fizzle for the player: what the stroke computed, and a nudge */
export function fizzleText(board, cast, res) {
  const nodes = Object.fromEntries(board.nodes.map(n => [n.id, n]));
  const info = board.edge(res.edge, nodes) || {};
  if (res.kind === 'early') {
    const s = board.steps[res.step], w = board.steps[res.wait];
    return { calc: s.note, hint: `That is "${s.name}". It comes after "${w.name}".` };
  }
  return { calc: info.calc || 'a wobbly squiggle', hint: info.hint || 'That stroke is not part of this spell.' };
}

/* ---------- Pacing and difficulty ---------- */
/* A spell's tier moves up after 3 clean casts in a row and down after 2 fizzles in a row */
export function nextTier(tier, streak, misses) {
  if (streak >= 3) return { tier: Math.min(3, tier + 1), streak: 0, misses: 0 };
  if (misses >= 2) return { tier: Math.max(0, tier - 1), streak: 0, misses: 0 };
  return { tier, streak, misses };
}
/* Seconds for a monster to walk up to the ward at brisk pace */
export const walkSeconds = (lv, tier) => [70, 55, 45][LEVEL_RANK[lv]] - tier * 4;
