/* Pattern Wall: pure logic (no DOM). Number grids, paint tools, the catalog of known patterns and the
   matcher, rule tiles and their evaluation, discovery names from fixed word lists, and card share codes. */

/* ---------- Number facts ---------- */
export const isPrime = n => { if (n < 2 || n % 1) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
export const isSquare = n => n >= 0 && Number.isInteger(Math.sqrt(n));
export const isCube = n => n > 0 && Math.round(Math.cbrt(n)) ** 3 === n;
export const isTri = n => n > 0 && isSquare(8 * n + 1);
const FIB = (() => { const f = [1, 2]; while (f.at(-1) < 1e7) f.push(f.at(-1) + f.at(-2)); return new Set(f); })();
export const isFib = n => FIB.has(n);
export const digitSum = n => String(n).split('').reduce((s, d) => s + +d, 0);
export const digitalRoot = n => (n === 0 ? 0 : 1 + ((n - 1) % 9));
export const isPow2 = n => n > 0 && (n & (n - 1)) === 0;
/* n is a sum of one or more consecutive odd numbers */
export const oddRun = n => { for (let k = 1; k * k <= n; k++) { if ((n - k * k) % (2 * k) === 0 && n >= k * k) return true; } return false; };
export const twoPrimes = n => { for (let p = 2; p <= n / 2; p++) if (isPrime(p) && isPrime(n - p)) return true; return false; };
const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };

/* ---------- Grids ---------- */
export const GRIDS = {
  hundred: { title: 'Hundred chart', short: '1 to 100' },
  times: { title: 'Times table', short: '10 × 10' },
  meru: { title: 'Meru-prastāra', short: 'Triangle' },
  calendar: { title: 'Calendar month', short: 'This month' },
  spiral: { title: 'Ulam spiral', short: '1 to 121' },
  roots: { title: 'Digital roots', short: '1 to 81' }
};
/* A grid: { id, cols, rows, layout, cells: [{ i, n, r, c, k? }] }. params: calendar { y, m (1 to 12) } */
export function makeGrid(id, params = {}) {
  if (id === 'hundred') return { id, cols: 10, rows: 10, layout: 'square', cells: Array.from({ length: 100 }, (_, i) => ({ i, n: i + 1, r: Math.floor(i / 10), c: i % 10 })) };
  if (id === 'times') return { id, cols: 10, rows: 10, layout: 'square', cells: Array.from({ length: 100 }, (_, i) => ({ i, n: (Math.floor(i / 10) + 1) * ((i % 10) + 1), r: Math.floor(i / 10), c: i % 10 })) };
  if (id === 'roots') return { id, cols: 9, rows: 9, layout: 'square', cells: Array.from({ length: 81 }, (_, i) => ({ i, n: i + 1, r: Math.floor(i / 9), c: i % 9 })) };
  if (id === 'meru') { const cells = []; for (let r = 0; r < 12; r++) for (let k = 0; k <= r; k++) cells.push({ i: cells.length, n: C(r, k), r, c: k, k }); return { id, cols: 12, rows: 12, layout: 'tri', cells }; }
  if (id === 'calendar') {
    const y = params.y || 2026, m = params.m || 1, start = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
    return { id, cols: 7, rows: Math.ceil((start + days) / 7), layout: 'square', params: { y, m }, start, cells: Array.from({ length: days }, (_, i) => ({ i, n: i + 1, r: Math.floor((start + i) / 7), c: (start + i) % 7 })) };
  }
  if (id === 'spiral') {
    const N = 11, h = 5, pos = []; let x = 0, y = 0, n = 1, step = 1; pos[1] = [0, 0];
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]; let d = 0;
    while (n < N * N) { for (let t = 0; t < 2 && n < N * N; t++) { for (let s = 0; s < step && n < N * N; s++) { x += dirs[d][0]; y += dirs[d][1]; pos[++n] = [x, y]; } d = (d + 1) % 4; } step++; }
    const cells = []; for (let k = 1; k <= N * N; k++) { const [px, py] = pos[k]; cells.push({ i: 0, n: k, r: h - py, c: h + px }); }
    cells.sort((a, b) => a.r - b.r || a.c - b.c).forEach((c, i) => { c.i = i; });
    return { id, cols: N, rows: N, layout: 'square', cells };
  }
  throw new Error('unknown grid ' + id);
}
export const setOf = (grid, pred) => new Set(grid.cells.filter(pred).map(c => c.i));
export const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

/* ---------- Paint tools (each selects cells by value) ---------- */
export const TOOLS = {
  mult: { label: 'Multiples of', param: 'k', min: 2, max: 12, def: 3, pred: k => n => n % k === 0, say: k => `multiples of ${k}` },
  rem: { label: 'Remainder', param: 'rm', def: [1, 4], pred: ([r, m]) => n => n % m === r, say: ([r, m]) => `numbers leaving ${r} after dividing by ${m}` },
  dsum: { label: 'Digit sum', param: 's', min: 1, max: 18, def: 9, pred: s => n => digitSum(n) === s, say: s => `numbers whose digits add to ${s}` },
  prime: { label: 'Primes', pred: () => isPrime, say: () => 'primes' },
  square: { label: 'Squares', pred: () => isSquare, say: () => 'square numbers' },
  tri: { label: 'Triangular', pred: () => isTri, say: () => 'triangular numbers' },
  fib: { label: 'Fibonacci', pred: () => isFib, say: () => 'Fibonacci numbers' }
};
export function applyTool(grid, painted, tool, param, mode = 'new') {
  const sel = setOf(grid, c => TOOLS[tool].pred(param)(c.n));
  if (mode === 'add') return new Set([...painted, ...sel]);
  if (mode === 'overlap') return new Set([...painted].filter(i => sel.has(i)));
  return sel;
}

/* ---------- Rule tiles ---------- */
/* Subjects pick numbers. 'painted' means the painted cells themselves. */
export const SUBJECTS = {
  painted: { one: 'The painted numbers', many: true },
  all: { one: 'Every whole number', f: () => true },
  odd: { one: 'Every odd number', f: n => n % 2 === 1 },
  even: { one: 'Every even number', f: n => n % 2 === 0 },
  even2: { one: 'Every even number above 2', f: n => n % 2 === 0 && n > 2 },
  prime: { one: 'Every prime', f: isPrime },
  prime3: { one: 'Every prime above 3', f: n => isPrime(n) && n > 3 },
  square: { one: 'Every square number', f: isSquare },
  tri: { one: 'Every triangular number', f: isTri },
  fib: { one: 'Every Fibonacci number', f: isFib },
  cube: { one: 'Every cube number', f: isCube },
  ...Object.fromEntries([2, 3, 4, 5, 6, 9, 10, 11].map(k => [`mult:${k}`, { one: `Every multiple of ${k}`, f: n => n % k === 0 }]))
};
/* Claims: number claims (one, many, f) hold for each number; list claims (many, list) are about the
   painted cells together (steps, sums, shapes) and only make sense with the subject 'painted'. */
const NUM_CLAIMS = {
  odd: ['is odd', 'are all odd', n => n % 2 === 1],
  even: ['is even', 'are all even', n => n % 2 === 0],
  prime: ['is prime', 'are all prime', isPrime],
  notprime: ['is not prime', 'are none of them prime', n => !isPrime(n)],
  twofactors: ['has exactly two factors, 1 and itself', 'each have exactly two factors', isPrime],
  square: ['is a square number', 'are all square numbers', isSquare],
  tri: ['is a triangular number', 'are all triangular numbers', isTri],
  oddsum: ['is 1 + 3 + 5 + ... (odd numbers from 1)', 'are each 1 + 3 + 5 + ... (odd numbers from 1)', isSquare],
  '8n1': ['makes a square when you times it by 8 and add 1', 'each make a square when timed by 8, plus 1', n => isSquare(8 * n + 1)],
  oddsrun: ['is a sum of odd numbers in a row', 'are each a sum of odd numbers in a row', oddRun],
  next6: ['sits right next to a multiple of 6', 'each sit next to a multiple of 6', n => n % 6 === 1 || n % 6 === 5],
  end05: ['ends in 0 or 5', 'all end in 0 or 5', n => n % 5 === 0],
  endodd: ['ends in 1, 3, 5, 7 or 9', 'all end in 1, 3, 5, 7 or 9', n => n % 2 === 1],
  endeven: ['ends in 0, 2, 4, 6 or 8', 'all end in 0, 2, 4, 6 or 8', n => n % 2 === 0],
  repdigit: ['has all its digits the same', 'all have matching digits', n => new Set(String(n)).size === 1],
  dsmult3: ['has digits that add to a multiple of 3', 'have digits adding to a multiple of 3', n => digitSum(n) % 3 === 0],
  dr369: ['has digital root 3, 6 or 9', 'have digital roots 3, 6 or 9', n => [3, 6, 9].includes(digitalRoot(n))],
  dr1479: ['has digital root 1, 4, 7 or 9', 'have digital roots 1, 4, 7 or 9', n => [1, 4, 7, 9].includes(digitalRoot(n))],
  twoprimes: ['is a sum of two primes', 'are each a sum of two primes', twoPrimes],
  'ds:9': ['has digits that add to 9', 'all have digits adding to 9', n => digitSum(n) === 9],
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => [`dr:${d}`, [`has digital root ${d} (add the digits until one is left)`, `all have digital root ${d}`, n => digitalRoot(n) === d]])),
  ...Object.fromEntries([2, 3, 4, 5, 6, 7, 9, 11].map(k => [`mult:${k}`, [`is a multiple of ${k}`, `are all multiples of ${k}`, n => n % k === 0]]))
};
const sortedVals = cells => cells.map(c => c.n).sort((a, b) => a - b);
const LIST_CLAIMS = {
  ...Object.fromEntries([1, 6, 7, 8, 9, 10, 11].map(d => [`step:${d}`, [`go up by ${d} each step`, cells => { const v = sortedVals(cells); return v.length > 2 && v.every((x, i) => i === 0 || x - v[i - 1] === d); }]])),
  same: ['are all the same number', cells => cells.length > 1 && new Set(cells.map(c => c.n)).size === 1],
  mirror: ['mirror each other across the corner-to-corner diagonal', (cells, g) => { const k = new Set(cells.map(c => `${c.r},${c.c}`)); return cells.length > 1 && g.layout === 'square' && g.id === 'times' && cells.every(c => k.has(`${c.c},${c.r}`)); }],
  sumfib: ['add up to a Fibonacci number', cells => cells.length > 1 && isFib(cells.reduce((s, c) => s + c.n, 0))],
  sumpow2: ['add up to a power of 2', cells => cells.length > 1 && isPow2(cells.reduce((s, c) => s + c.n, 0))],
  fibsum: ['each equal the two before added together', cells => { const v = sortedVals(cells); return v.length > 3 && v.every((x, i) => i < 2 || x === v[i - 1] + v[i - 2]); }],
  cross: ['add up the same across both diagonals', cells => { if (cells.length !== 4) return false; const s = cells.slice().sort((a, b) => a.r - b.r || a.c - b.c); return s[0].r === s[1].r && s[2].r === s[0].r + 1 && s[1].c === s[0].c + 1 && s[2].c === s[0].c && s[3].c === s[1].c && s[0].n + s[3].n === s[1].n + s[2].n; }],
  box9: ['add up to 9 times the middle number', cells => { if (cells.length !== 9) return false; const s = cells.slice().sort((a, b) => a.r - b.r || a.c - b.c); const sum = s.reduce((t, c) => t + c.n, 0); return sum === 9 * s[4].n; }],
  sierp: ['make triangles inside triangles', (cells, g) => g.id === 'meru' && sameSet(new Set(cells.map(c => c.i)), setOf(g, c => c.n % 2 === 1))]
};
export const CLAIMS = { ...Object.fromEntries(Object.entries(NUM_CLAIMS).map(([id, [one, many, f]]) => [id, { one, many, f }])), ...Object.fromEntries(Object.entries(LIST_CLAIMS).map(([id, [many, list]]) => [id, { many, list }])) };

export function ruleText({ s, c }) {
  const S = SUBJECTS[s], K = CLAIMS[c]; if (!S || !K) return '';
  return s === 'painted' ? `${S.one} ${K.many}.` : `${S.one} ${K.one || K.many}.`;
}
/* Evaluate a rule. ok: no counterexample. fits: the rule's subject is exactly the painted cells (or it
   is about the painted cells themselves). tested: how many numbers it was checked on. */
export function evalRule({ s, c }, grid, painted, N = 1000) {
  const S = SUBJECTS[s], K = CLAIMS[c];
  if (!S || !K) return { ok: false, fits: false, reason: 'missing' };
  const cells = grid.cells.filter(x => painted.has(x.i));
  if (K.list) {
    if (s !== 'painted') return { ok: false, fits: false, reason: 'list-needs-painted' };
    const ok = cells.length > 0 && K.list(cells, grid);
    return { ok, fits: true, tested: cells.length, scope: 'painted' };
  }
  if (s === 'painted') {
    const bad = cells.find(x => !K.f(x.n));
    return { ok: cells.length > 0 && !bad, fits: true, counter: bad?.n, tested: cells.length, scope: 'painted' };
  }
  let counter = null, tested = 0;
  for (let n = 1; n <= N; n++) { if (!S.f(n)) continue; tested++; if (!K.f(n)) { counter = n; break; } }
  const fits = sameSet(setOf(grid, x => S.f(x.n)), painted);
  return { ok: counter === null && tested > 0, fits, counter, tested, scope: 'numbers', upTo: N };
}

/* ---------- Catalog of known patterns ----------
   Each pattern: id, grid, title, blurb, rule (canonical {s, c}), decoys (claim ids), history (optional,
   for the Famous shelf), and variants(grid) => [{ key, label, set }] (single patterns have one). */
const one = (pred, label = '') => g => [{ key: '', label, set: setOf(g, pred) }];
const lines = (g, dr, dc, minLen) => {
  const at = new Map(g.cells.map(c => [`${c.r},${c.c}`, c])); const out = [];
  for (const c of g.cells) {
    if (at.has(`${c.r - dr},${c.c - dc}`)) continue; /* start of a line */
    const run = []; let r = c.r, cc = c.c; while (at.has(`${r},${cc}`)) { run.push(at.get(`${r},${cc}`).i); r += dr; cc += dc; }
    if (run.length >= minLen) out.push({ key: `${c.r}.${c.c}`, label: `from ${c.n}`, set: new Set(run) });
  }
  return out;
};
export const PATTERNS = [
  /* Hundred chart */
  { id: 'h-mult9', grid: 'hundred', title: 'The nines keep their root', blurb: 'Multiples of 9 slide down a diagonal, and their digits always add back to 9 (99 gives 18, and 1 + 8 = 9).', rule: { s: 'mult:9', c: 'dr:9' }, decoys: ['ds:9', 'odd', 'end05', 'repdigit'], variants: one(c => c.n % 9 === 0) },
  { id: 'h-mult11', grid: 'hundred', title: 'Twin digits', blurb: 'The multiples of 11 on the chart are 11, 22, ... 99: twin digits marching down the long diagonal.', rule: { s: 'painted', c: 'repdigit' }, decoys: ['odd', 'prime', 'step:10', 'end05'], variants: one(c => c.n % 11 === 0) },
  { id: 'h-mult3', grid: 'hundred', title: 'The threes test', blurb: 'Multiples of 3 make slanted stripes, and every one has digits adding to a multiple of 3. That is the divisibility test for 3.', rule: { s: 'mult:3', c: 'dsmult3' }, decoys: ['odd', 'dr:3', 'ds:9', 'endodd'], variants: one(c => c.n % 3 === 0) },
  { id: 'h-mult5', grid: 'hundred', title: 'Two columns of fives', blurb: 'Multiples of 5 make two straight columns: they all end in 0 or 5.', rule: { s: 'mult:5', c: 'end05' }, decoys: ['odd', 'even', 'endodd', 'dsmult3'], variants: one(c => c.n % 5 === 0) },
  { id: 'h-even', grid: 'hundred', title: 'Even stripes', blurb: 'Even numbers fill every other column, because the last digit decides.', rule: { s: 'even', c: 'endeven' }, decoys: ['end05', 'notprime', 'mult:4', 'dsmult3'], variants: one(c => c.n % 2 === 0) },
  { id: 'h-odd', grid: 'hundred', title: 'Odd stripes', blurb: 'Odd numbers fill the other columns: they end in 1, 3, 5, 7 or 9.', rule: { s: 'odd', c: 'endodd' }, decoys: ['prime', 'end05', 'notprime', 'dsmult3'], variants: one(c => c.n % 2 === 1) },
  { id: 'h-column', grid: 'hundred', title: 'Straight down', blurb: 'A column of the chart: each number is 10 more than the one above, so the last digit never changes.', rule: { s: 'painted', c: 'step:10' }, decoys: ['step:11', 'step:9', 'same', 'mult:3'], variants: g => Array.from({ length: 10 }, (_, d) => ({ key: String(d), label: `ending in ${d}`, set: setOf(g, c => c.n % 10 === d) })) },
  { id: 'h-diag11', grid: 'hundred', title: 'Down-right slide', blurb: 'Step down one row (+10) and right one column (+1): every step on this diagonal adds 11.', rule: { s: 'painted', c: 'step:11' }, decoys: ['step:10', 'step:9', 'step:1', 'odd'], variants: g => lines(g, 1, 1, 4) },
  { id: 'h-diag9', grid: 'hundred', title: 'Down-left slide', blurb: 'Down one row (+10) and left one column (-1): this diagonal adds 9 each step.', rule: { s: 'painted', c: 'step:9' }, decoys: ['step:11', 'step:10', 'step:8', 'odd'], variants: g => lines(g, 1, -1, 4) },
  { id: 'h-squares', grid: 'hundred', title: 'Squares from odd numbers', blurb: '1, 4, 9, 16, 25... and 1 = 1, 4 = 1 + 3, 9 = 1 + 3 + 5. Each square is the one before plus the next odd number, like adding an L-shaped border.', rule: { s: 'square', c: 'oddsum' }, decoys: ['odd', 'tri', 'even', 'prime'], history: 'Greek mathematicians drew this with L-shaped borders called gnomons; it appears in many ancient traditions.', variants: one(c => isSquare(c.n)) },
  { id: 'h-tri', grid: 'hundred', title: 'Triangle numbers', blurb: '1, 3, 6, 10, 15: stack 1, 2, 3, 4... dots in rows. Times one by 8 and add 1 and you always get a square.', rule: { s: 'tri', c: '8n1' }, decoys: ['odd', 'square', 'end05', 'notprime'], variants: one(c => isTri(c.n)) },
  { id: 'h-primes', grid: 'hundred', title: 'The prime sieve', blurb: 'Primes have exactly two factors. Cross out multiples of 2, 3, 5 and 7 and the primes below 100 are what remain.', rule: { s: 'prime', c: 'twofactors' }, decoys: ['odd', 'endodd', 'next6', 'dsmult3'], famous: 'Sieve of Eratosthenes', history: 'Eratosthenes of Cyrene (3rd century BCE) is credited with this sieve: cross out multiples and the primes remain.', variants: one(c => isPrime(c.n)) },
  { id: 'h-prime3', grid: 'hundred', title: 'Primes hug the sixes', blurb: 'Every prime above 3 sits right next to a multiple of 6. Any other number is a multiple of 2 or 3.', rule: { s: 'prime3', c: 'next6' }, decoys: ['even', 'dr369', 'twoprimes', 'dsmult3'], variants: one(c => isPrime(c.n) && c.n > 3) },
  { id: 'h-fib', grid: 'hundred', title: 'Each from the two before', blurb: '1, 2, 3, 5, 8, 13, 21, 34, 55, 89: each is the two before added together.', rule: { s: 'painted', c: 'fibsum' }, decoys: ['odd', 'prime', 'step:9', 'sumfib'], famous: 'Virahāṅka\'s numbers', history: 'Indian prosodists counted meters by beats and found these numbers: Virahāṅka (6th to 8th century), then Gopāla and Hemacandra (12th century), before Fibonacci\'s book of 1202.', variants: one(c => isFib(c.n)) },
  { id: 'h-cubes', grid: 'hundred', title: 'Cubes from odd runs', blurb: '1 = 1, 8 = 3 + 5, 27 = 7 + 9 + 11, 64 = 13 + 15 + 17 + 19. Each cube is a run of odd numbers in a row.', rule: { s: 'cube', c: 'oddsrun' }, decoys: ['even', 'square', 'odd', 'end05'], variants: one(c => isCube(c.n)) },
  /* Times table */
  { id: 't-diag', grid: 'times', title: 'The square diagonal', blurb: 'The corner-to-corner diagonal of the times table is 1 × 1, 2 × 2, 3 × 3: the squares.', rule: { s: 'painted', c: 'square' }, decoys: ['step:9', 'odd', 'even', 'prime'], variants: one(c => c.r === c.c) },
  { id: 't-value', grid: 'times', title: 'Mirror twins', blurb: 'The same answer appears in mirror spots: 3 × 4 and 4 × 3. The table folds onto itself along the diagonal.', rule: { s: 'painted', c: 'mirror' }, decoys: ['step:1', 'prime', 'step:6', 'sumfib'], variants: g => { const by = new Map(); for (const c of g.cells) by.set(c.n, [...(by.get(c.n) || []), c.i]); return [...by].filter(([, l]) => l.length >= 3).map(([v, l]) => ({ key: String(v), label: `${v}`, set: new Set(l) })); } },
  { id: 't-odd', grid: 'times', title: 'Odd only from odd', blurb: 'Odd answers only appear where an odd row meets an odd column: odd × odd is odd, anything × even is even.', rule: { s: 'painted', c: 'odd' }, decoys: ['prime', 'square', 'even', 'tri'], variants: one(c => c.n % 2 === 1) },
  { id: 't-even', grid: 'times', title: 'Mostly even', blurb: 'Three quarters of the table is even: any row or column with an even number makes even answers.', rule: { s: 'painted', c: 'even' }, decoys: ['mult:4', 'odd', 'notprime', 'mult:3'], variants: one(c => c.n % 2 === 0) },
  { id: 't-line', grid: 'times', title: 'A times-table line', blurb: 'Each row (and each column) of the table counts up by the same step: the 7 row goes 7, 14, 21...', rule: { s: 'painted', c: 'step:7' }, ruleBy: key => ({ s: 'painted', c: `step:${+key.slice(1)}` }), decoys: ['step:11', 'same', 'odd', 'mirror'], variants: g => [6, 7, 8, 9, 10, 11].flatMap(k => (k > 10 ? [] : [{ key: `r${k}`, label: `row ${k}`, set: setOf(g, c => c.r === k - 1) }, { key: `c${k}`, label: `column ${k}`, set: setOf(g, c => c.c === k - 1) }])) },
  { id: 't-five', grid: 'times', title: 'Fives in a cross', blurb: 'Answers ending in 0 or 5 sit in the 5 and 10 rows and columns: a multiple of 5 needs a factor of 5.', rule: { s: 'mult:5', c: 'end05' }, decoys: ['odd', 'even', 'step:10', 'dsmult3'], variants: one(c => c.n % 5 === 0) },
  /* Meru-prastāra */
  { id: 'm-odd', grid: 'meru', title: 'Triangles in triangles', blurb: 'Paint the odd numbers of the Meru and triangles appear inside triangles, again and again.', rule: { s: 'painted', c: 'sierp' }, decoys: ['prime', 'same', 'sumpow2', 'mirror'], famous: 'Sierpiński\'s triangle in the Meru', history: 'The shape is named after Wacław Sierpiński (1915). The triangle of numbers is the Meru-prastāra, described by Halāyudha in the 10th century for Piṅgala\'s meters.', variants: one(c => c.n % 2 === 1) },
  { id: 'm-shallow', grid: 'meru', title: 'Hidden Fibonacci', blurb: 'Add the stones along a shallow diagonal of the Meru and you get 1, 1, 2, 3, 5, 8, 13...', rule: { s: 'painted', c: 'sumfib' }, decoys: ['fibsum', 'step:1', 'same', 'prime'], famous: 'Fibonacci in the Meru', history: 'Counting meters by beats (mātrā-meru) and by syllables (Meru-prastāra) are linked: the shallow diagonals of the Meru add up to the beat counts Virahāṅka and Hemacandra found.', variants: g => Array.from({ length: 9 }, (_, j) => { const d = j + 3; return { key: String(d), label: `diagonal ${d}`, set: setOf(g, c => c.r + c.k === d && c.k <= c.r) }; }) },
  { id: 'm-row', grid: 'meru', title: 'Rows of doubles', blurb: 'Each row of the Meru adds up to a power of 2: every syllable is long or short, so n syllables give 2 × 2 × ... patterns.', rule: { s: 'painted', c: 'sumpow2' }, decoys: ['fibsum', 'same', 'mirror', 'prime'], variants: g => Array.from({ length: 10 }, (_, j) => ({ key: String(j + 2), label: `row ${j + 2}`, set: setOf(g, c => c.r === j + 2) })) },
  { id: 'm-edge', grid: 'meru', title: 'Edges of ones', blurb: 'Both edges of the Meru are all 1: there is exactly one way to make a line all long or all short.', rule: { s: 'painted', c: 'same' }, decoys: ['step:1', 'sumpow2', 'prime', 'even'], variants: one(c => c.n === 1) },
  { id: 'm-count', grid: 'meru', title: 'The counting diagonal', blurb: 'One step in from the edge, the Meru simply counts: 1, 2, 3, 4...', rule: { s: 'painted', c: 'step:1' }, decoys: ['same', 'sumfib', 'tri', 'odd'], variants: g => [{ key: 'l', label: 'left', set: setOf(g, c => c.k === 1) }, { key: 'r', label: 'right', set: setOf(g, c => c.r >= 1 && c.k === c.r - 1) }] },
  { id: 'm-tri', grid: 'meru', title: 'Triangles on the slope', blurb: 'Two steps in from the edge: 1, 3, 6, 10, 15, the triangular numbers.', rule: { s: 'painted', c: 'tri' }, decoys: ['square', 'step:1', 'odd', 'sumpow2'], variants: g => [{ key: 'l', label: 'left', set: setOf(g, c => c.k === 2) }, { key: 'r', label: 'right', set: setOf(g, c => c.r >= 2 && c.k === c.r - 2) }] },
  { id: 'm-prime', grid: 'meru', title: 'Prime rows divide', blurb: 'In a row whose number is prime, every stone except the 1s is a multiple of that prime.', rule: { s: 'painted', c: 'mult:7' }, ruleBy: key => ({ s: 'painted', c: `mult:${key}` }), decoys: ['prime', 'even', 'sumpow2', 'same'], variants: g => [2, 3, 5, 7, 11].map(p => ({ key: String(p), label: `row ${p}`, set: setOf(g, c => c.r === p && c.k > 0 && c.k < p) })) },
  /* Calendar */
  { id: 'c-week', grid: 'calendar', title: 'Same day each week', blurb: 'A column of the calendar is the same weekday, 7 days apart.', rule: { s: 'painted', c: 'step:7' }, decoys: ['step:8', 'step:6', 'odd', 'same'], variants: g => Array.from({ length: 7 }, (_, d) => ({ key: String(d), label: 'weekday', set: setOf(g, c => c.c === d) })) },
  { id: 'c-diag8', grid: 'calendar', title: 'A week and a day', blurb: 'Down-right on a calendar: one week plus one day, 8 each step.', rule: { s: 'painted', c: 'step:8' }, decoys: ['step:7', 'step:6', 'step:9', 'same'], variants: g => lines(g, 1, 1, 3) },
  { id: 'c-diag6', grid: 'calendar', title: 'A week less a day', blurb: 'Down-left on a calendar: one week minus one day, 6 each step.', rule: { s: 'painted', c: 'step:6' }, decoys: ['step:8', 'step:7', 'mult:4', 'same'], variants: g => lines(g, 1, -1, 3) },
  { id: 'c-box2', grid: 'calendar', title: 'Crossing corners', blurb: 'In any 2 by 2 box of dates, the two diagonals add up to the same total.', rule: { s: 'painted', c: 'cross' }, decoys: ['same', 'box9', 'step:7', 'odd'], variants: g => boxes(g, 2) },
  { id: 'c-box3', grid: 'calendar', title: 'Nine around the middle', blurb: 'Any 3 by 3 box of dates adds up to 9 times the middle date. Try it as a party trick.', rule: { s: 'painted', c: 'box9' }, decoys: ['cross', 'same', 'step:8', 'sumpow2'], variants: g => boxes(g, 3) },
  /* Ulam spiral */
  { id: 's-oddsq', grid: 'spiral', title: 'Odd squares on a diagonal', blurb: '1, 9, 25, 49, 81, 121 lie on one diagonal of the spiral: each finishes a full ring.', rule: { s: 'painted', c: 'square' }, decoys: ['prime', 'step:8', 'even', 'same'], variants: one(c => isSquare(c.n) && c.n % 2 === 1) },
  { id: 's-evensq', grid: 'spiral', title: 'Even squares on a diagonal', blurb: '4, 16, 36, 64, 100 sit on the opposite diagonal, one step off the middle.', rule: { s: 'painted', c: 'square' }, decoys: ['prime', 'odd', 'step:8', 'same'], variants: one(c => isSquare(c.n) && c.n % 2 === 0) },
  { id: 's-primes', grid: 'spiral', title: 'Prime lines', blurb: 'Wind the numbers into a spiral and the primes line up along diagonals far more than chance suggests.', rule: { s: 'prime', c: 'twofactors' }, decoys: ['odd', 'next6', 'endodd', 'square'], famous: 'Ulam spiral', history: 'Stanisław Ulam doodled this spiral in 1963 and saw the primes cluster on diagonal lines.', variants: one(c => isPrime(c.n)) },
  { id: 's-line', grid: 'spiral', title: 'A prime-rich diagonal', blurb: 'Every diagonal of the spiral follows a quadratic rule, and some quadratics give primes again and again, like Euler\'s n² + n + 41.', rule: { s: 'painted', c: 'prime' }, decoys: ['tri', 'square', 'step:8', 'same'], variants: g => [...lines(g, 1, 1, 6), ...lines(g, 1, -1, 6)].map(v => ({ ...v, set: new Set([...v.set].filter(i => isPrime(g.cells[i].n))) })).filter(v => v.set.size >= 4) },
  /* Digital roots */
  { id: 'd-col', grid: 'roots', title: 'Root columns', blurb: 'In nine columns, each column shares one digital root: going down adds 9, which never changes the root.', rule: { s: 'painted', c: 'step:9' }, decoys: ['step:10', 'same', 'odd', 'step:8'], variants: g => Array.from({ length: 9 }, (_, d) => ({ key: String(d + 1), label: `root ${d + 1}`, set: setOf(g, c => digitalRoot(c.n) === d + 1) })) },
  { id: 'd-mult3', grid: 'roots', title: 'Three of nine', blurb: 'Multiples of 3 have digital root 3, 6 or 9, so they fill exactly three columns.', rule: { s: 'mult:3', c: 'dr369' }, decoys: ['odd', 'dr1479', 'end05', 'step:9'], variants: one(c => c.n % 3 === 0) },
  { id: 'd-squares', grid: 'roots', title: 'Squares avoid some roots', blurb: 'The digital root of a square is always 1, 4, 7 or 9. Never 2, 3, 5, 6 or 8: a quick test that a number is not a square.', rule: { s: 'square', c: 'dr1479' }, decoys: ['odd', 'dr369', 'even', 'dr:1'], variants: one(c => isSquare(c.n)) }
];
function boxes(g, size) {
  const at = new Map(g.cells.map(c => [`${c.r},${c.c}`, c.i])); const out = [];
  for (const c of g.cells) { const s = []; for (let dr = 0; dr < size; dr++) for (let dc = 0; dc < size; dc++) { const i = at.get(`${c.r + dr},${c.c + dc}`); if (i !== undefined) s.push(i); } if (s.length === size * size) out.push({ key: String(c.n), label: `from ${c.n}`, set: new Set(s) }); }
  return out;
}
export const patternById = id => PATTERNS.find(p => p.id === id);
/* A pattern's variants on a grid, keeping only sets of at least three cells */
export const variantsOf = (p, g) => p.variants(g).filter(v => v.set.size >= 3);
export const ruleFor = (p, key) => (p.ruleBy ? p.ruleBy(key) : p.rule);
/* Every catalog pattern (with variant) whose cells equal the painted set */
export function match(grid, painted) {
  if (painted.size < 3) return [];
  const out = [];
  for (const p of PATTERNS) if (p.grid === grid.id) for (const v of variantsOf(p, grid)) if (sameSet(v.set, painted)) out.push({ pattern: p, variant: v });
  return out;
}

/* ---------- Names from fixed word lists (no free text) ---------- */
export const NICKS = ['Meera', 'Arjun', 'Asha', 'Kabir', 'Diya', 'Rohan', 'Anaya', 'Vikram', 'Leela', 'Ishaan', 'Kavya', 'Neel', 'Priya', 'Ravi', 'Tara', 'Zoya', 'Aarav', 'Nila', 'Sam', 'Maya', 'Leo', 'Zara', 'Omar', 'Ivy', 'Noah', 'Mei', 'Kofi', 'Lina', 'Hugo', 'Ana', 'Professor', 'Captain', 'Explorer', 'Star', 'Owl', 'Tiger'];
export const ADJ = ['Sparkling', 'Hidden', 'Dancing', 'Golden', 'Secret', 'Marching', 'Whispering', 'Twin', 'Spinning', 'Mighty', 'Gentle', 'Shining', 'Lucky', 'Patient', 'Wandering', 'Clever', 'Brave', 'Silent', 'Bright', 'Endless', 'Curious', 'Sleepy', 'Electric', 'Velvet'];
export const NOUN = ['Staircase', 'Ladder', 'River', 'Comet', 'Lantern', 'Garden', 'Bridge', 'Necklace', 'Ribbon', 'Mountain', 'Rainbow', 'Spiral', 'Diamond', 'Kite', 'Peacock', 'Lotus', 'Drumbeat', 'Echo', 'Pathway', 'Constellation', 'Zigzag', 'Lighthouse', 'Waterfall', 'Tiger'];
export const nameOf = ([a, b, c]) => `${NICKS[a] ?? NICKS[0]}'s ${ADJ[b] ?? ADJ[0]} ${NOUN[c] ?? NOUN[0]}`;
export const suggestName = (r, nick = 0) => [nick, Math.floor(r() * ADJ.length), Math.floor(r() * NOUN.length)];

/* ---------- Cards and share codes ---------- */
/* A card: { p: pattern id or null (a conjecture), k: variant key, g: grid id, gp: grid params,
   cells: [indices], name: [nick, adj, noun], rule: { s, c }, test: { ok, counter, tested } | null, t: day key } */
export const encodeCard = c => JSON.stringify({ v: 1, p: c.p || 0, k: c.k || '', g: c.g, gp: c.gp || 0, x: c.cells.join('.'), n: c.name, r: [c.rule.s, c.rule.c], t: c.test ? [c.test.ok ? 1 : 0, c.test.counter ?? 0, c.test.tested ?? 0] : 0 });
export function decodeCard(s) {
  const o = JSON.parse(s);
  if (o.v !== 1 || !GRIDS[o.g] || !Array.isArray(o.n) || o.n.length !== 3) throw new Error('bad card');
  const g = makeGrid(o.g, o.gp || {});
  const cells = String(o.x).split('.').filter(Boolean).map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < g.cells.length);
  const name = o.n.map((v, i) => Math.max(0, Math.min([NICKS, ADJ, NOUN][i].length - 1, v | 0)));
  const rule = { s: SUBJECTS[o.r?.[0]] ? o.r[0] : 'painted', c: CLAIMS[o.r?.[1]] ? o.r[1] : 'odd' };
  return { p: o.p && patternById(o.p) ? o.p : null, k: String(o.k || ''), g: o.g, gp: o.gp || null, cells, name, rule, test: o.t ? { ok: !!o.t[0], counter: o.t[1] || null, tested: o.t[2] } : null };
}
