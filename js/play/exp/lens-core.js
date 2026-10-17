/* Math Lens core: pure logic, no DOM. Exact fractions, a safe expression reader (no eval), the make-N
   solver, divisibility rules, clock math, receipt shortcuts, digit sources and the challenge builder. */

/* ---------- Exact fractions [n, d], d > 0, lowest terms ---------- */
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const frac = (n, d = 1) => { if (d === 0) return null; if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return [n / g, d / g]; };
export const fadd = (a, b) => frac(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
export const fsub = (a, b) => frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
export const fmul = (a, b) => frac(a[0] * b[0], a[1] * b[1]);
export const fdiv = (a, b) => (b[0] === 0 ? null : frac(a[0] * b[1], a[1] * b[0]));
export const fkey = a => `${a[0]}/${a[1]}`;
export const fshow = a => (a[1] === 1 ? String(a[0]) : `${a[0]}/${a[1]}`);
const OPF = { '+': fadd, '-': fsub, '*': fmul, '/': fdiv };
export const OP_SHOW = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };

/* ---------- Safe expression reader: digits, + - x * / and brackets. Never uses eval. ---------- */
/* Returns { ok, value, nums: [numbers in reading order], ops: [operators used], error } */
export function parseExpr(src) {
  const s = String(src ?? '').replace(/[×xX✕]/g, '*').replace(/[÷:]/g, '/').replace(/[−–]/g, '-').replace(/[[{]/g, '(').replace(/[\]}]/g, ')');
  const toks = [];
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/\d/.test(c)) { let j = i; while (j < s.length && /\d/.test(s[j])) j++; toks.push({ t: 'n', v: s.slice(i, j) }); i = j; continue; }
    if ('+-*/()'.includes(c)) { toks.push({ t: c }); i++; continue; }
    return { ok: false, error: `I do not know the sign "${c}". Use digits, + − × ÷ and brackets.` };
  }
  if (!toks.length) return { ok: false, error: 'Type an expression first.' };
  if (toks.length > 80) return { ok: false, error: 'That is too long.' };
  let p = 0; const nums = [], ops = [];
  const fail = msg => { throw new Error(msg); };
  const factor = () => {
    const tk = toks[p];
    if (!tk) fail('It ends too early. Add a number.');
    if (tk.t === 'n') { p++; nums.push(Number(tk.v)); return frac(Number(tk.v)); }
    if (tk.t === '(') { p++; const v = expr(); if (!toks[p] || toks[p].t !== ')') fail('A bracket is not closed.'); p++; return v; }
    if (tk.t === '-' || tk.t === '+') fail('Start with a number, not a sign.');
    fail(tk.t === ')' ? 'A closing bracket has nothing to close.' : 'Two signs in a row.');
  };
  const term = () => {
    let v = factor();
    while (toks[p] && (toks[p].t === '*' || toks[p].t === '/')) {
      const op = toks[p++].t; ops.push(op); const r = factor();
      v = OPF[op](v, r); if (!v) fail('Dividing by zero is not allowed.');
    }
    return v;
  };
  const expr = () => {
    let v = term();
    while (toks[p] && (toks[p].t === '+' || toks[p].t === '-')) { const op = toks[p++].t; ops.push(op); v = OPF[op](v, term()); }
    return v;
  };
  try {
    const value = expr();
    if (p < toks.length) fail(toks[p].t === ')' ? 'A closing bracket has nothing to close.' : toks[p].t === 'n' ? 'Put a sign between two numbers.' : 'Something is left over at the end.');
    return { ok: true, value, nums, ops };
  } catch (e) { return { ok: false, error: e.message }; }
}

/* Is this player expression a valid make-N answer? spec: { digits: [..], target, ordered, ops: '+-*\/', concat } */
export function checkMake(src, spec) {
  const r = parseExpr(src);
  if (!r.ok) return { ok: false, reason: r.error };
  const want = spec.digits.map(Number);
  const allowed = spec.ops || '+-*/';
  const bad = r.ops.find(o => !allowed.includes(o));
  if (bad) return { ok: false, reason: `This one uses only ${[...allowed].map(o => OP_SHOW[o]).join(' ')}.`, value: r.value };
  let used = r.nums;
  if (spec.concat) used = r.nums.flatMap(n => String(n).split('').map(Number));
  else if (r.nums.some(n => n > 9 || String(n).length > 1)) return { ok: false, reason: 'Use each digit on its own, no gluing digits together.', value: r.value };
  if (spec.ordered) {
    if (used.join(',') !== want.join(',')) return { ok: false, reason: `Use the digits in order: ${want.join(' ')}.`, value: r.value };
  } else if ([...used].sort().join(',') !== [...want].sort().join(',')) return { ok: false, reason: `Use each of ${want.join(' ')} exactly once.`, value: r.value };
  if (r.value[0] !== spec.target * r.value[1]) return { ok: false, reason: `That makes ${fshow(r.value)}, not ${spec.target}.`, value: r.value };
  return { ok: true, value: r.value };
}

/* ---------- The make-N solver ---------- */
const leaf = (n, text = String(n)) => ({ v: frac(n), e: text, p: 3 });
function join(a, op, b) {
  const v = OPF[op](a.v, b.v); if (!v) return null;
  const L = a.p < PREC[op] ? `(${a.e})` : a.e;
  const R = b.p < PREC[op] || (b.p === PREC[op] && (op === '-' || op === '/')) ? `(${b.e})` : b.e;
  return { v, e: `${L} ${op} ${R}`, p: PREC[op] };
}
const COMMUTE = { '+': true, '*': true };

/* Digits in the given order (adjacent digits may be glued when concat). Interval DP over value sets.
   Returns a Map key -> { v, e } of every reachable value (first expression found for each). */
export function orderedValues(digits, ops = '+-*/', concat = false) {
  const n = digits.length, T = [];
  for (let len = 1; len <= n; len++) for (let i = 0; i + len <= n; i++) {
    const j = i + len - 1, m = new Map();
    const s = digits.slice(i, j + 1).join('');
    if (len === 1 || (concat && s[0] !== '0')) m.set(fkey(frac(+s)), leaf(+s, s));
    for (let k = i; k < j; k++) {
      for (const a of T[i][k].values()) for (const b of T[k + 1][j].values()) for (const op of ops) {
        const c = join(a, op, b); if (!c) continue;
        const key = fkey(c.v); if (!m.has(key)) m.set(key, c);
      }
    }
    (T[i] ||= [])[j] = m;
  }
  return T[0][n - 1];
}

/* Any order: combine any two numbers until one is left. Returns an expression string or null. */
export function solveAny(digits, target, ops = '+-*/') {
  const goal = fkey(frac(target)), seen = new Set();
  const go = items => {
    if (items.length === 1) return fkey(items[0].v) === goal ? items[0].e : null;
    const sig = items.map(x => fkey(x.v)).sort().join('|'); if (seen.has(sig)) return null; seen.add(sig);
    for (let i = 0; i < items.length; i++) for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const rest = items.filter((_, k) => k !== i && k !== j);
      for (const op of ops) {
        if (COMMUTE[op] && j < i) continue;
        const c = join(items[i], op, items[j]); if (!c) continue;
        const r = go([...rest, c]); if (r) return r;
      }
    }
    return null;
  };
  return go(digits.map(d => leaf(+d)));
}
/* One solver for every make challenge spec */
export function solveMake({ digits, target, ordered = false, ops = '+-*/', concat = false }) {
  if (ordered) { const hit = orderedValues(digits.map(String), ops, concat).get(fkey(frac(target))); return hit ? hit.e : null; }
  return solveAny(digits, target, ops);
}
export const pretty = e => String(e).replace(/\*/g, '×').replace(/\//g, '÷').replace(/(\d|\)) - /g, '$1 − ');

/* ---------- Digit sums, digital roots, divisibility ---------- */
export const digitsOf = n => String(n).replace(/\D/g, '').split('').map(Number);
export const digitSum = n => digitsOf(n).reduce((s, d) => s + d, 0);
/* The chain of digit sums down to one digit, e.g. 7482 -> [7482, 21, 3] */
export function rootChain(n) { const out = [Number(String(n).replace(/\D/g, '')) || 0]; let x = String(n).replace(/\D/g, '') || '0'; while (x.length > 1) { x = String(digitSum(x)); out.push(+x); } return out; }
export const digitalRoot = n => { const s = String(n).replace(/\D/g, '').replace(/^0+/, ''); return s ? 1 + ((digitSum(s) - 1) % 9) : 0; };
/* Alternating sum from the units digit: + - + - ... (the rule for 11) */
export const altSum = n => digitsOf(n).reverse().reduce((s, d, i) => s + (i % 2 ? -d : d), 0);
export const RULES = {
  3: { test: n => digitSum(n) % 3 === 0, clue: n => `digit sum ${digitsOf(n).join(' + ')} = ${digitSum(n)}`, rule: 'A number is in the 3 times table exactly when its digit sum is.' },
  9: { test: n => digitSum(n) % 9 === 0, clue: n => `digit sum ${digitsOf(n).join(' + ')} = ${digitSum(n)}`, rule: 'A number is in the 9 times table exactly when its digit sum is (keep adding digits until one is left: it is 9).' },
  11: { test: n => altSum(n) % 11 === 0, clue: n => `alternating sum from the right ${digitsOf(n).reverse().map((d, i) => (i ? (i % 2 ? '− ' : '+ ') : '') + d).join(' ')} = ${altSum(n)}`, rule: 'Add and subtract the digits in turn, starting from the units. If the result is 0 or a multiple of 11, so is the number.' }
};
export const divides = (n, k) => Number(String(n).replace(/\D/g, '')) % k === 0;

/* ---------- Clock ---------- */
/* Read a time from digits like "10:47", "1047", "947" or "21:15" (24 hour clocks fold to 12 for the hands) */
export function asTime(raw) {
  const s = String(raw).trim(); let h, m;
  const c = s.match(/^(\d{1,2})[:.h ](\d{2})$/);
  if (c) { h = +c[1]; m = +c[2]; } else {
    const d = s.replace(/\D/g, ''); if (d.length < 3 || d.length > 4) return null;
    h = +d.slice(0, d.length - 2); m = +d.slice(-2);
  }
  if (h > 23 || m > 59) return null;
  return { h, m };
}
export const showTime = ({ h, m }) => `${h}:${String(m).padStart(2, '0')}`;
export const h12 = h => (h % 12 === 0 ? 12 : h % 12);
/* Smaller angle between the hands in degrees (can be a half degree) */
export function clockAngle(h, m) { const a = Math.abs(30 * (h % 12) - 5.5 * m); return Math.min(a, 360 - a); }
const isPal = s => s === [...s].reverse().join('');
/* Next time on a 12 hour display (h:mm, read without the colon) that is a palindrome, strictly later */
export function nextPalindrome(h, m) {
  for (let k = 1; k <= 720; k++) {
    const t = (h12(h) % 12) * 60 + m + k, hh = h12(Math.floor(t / 60) % 12), mm = t % 60;
    if (isPal(`${hh}${String(mm).padStart(2, '0')}`)) return { h: hh, m: mm, minutes: k };
  }
  return null;
}
export const minutesToHour = m => 60 - m;

/* ---------- Money in cents ---------- */
export const money = c => `$${(c / 100).toFixed(2)}`;
/* Read "$23.47", "23.47", "23,47" or digits "2347" (last two are cents) as cents */
export function asCents(raw) {
  const s = String(raw).replace(/[$\s]/g, '').replace(',', '.');
  const m = s.match(/^(\d{1,6})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  if (m[2] !== undefined) return +m[1] * 100 + +m[2].padEnd(2, '0');
  return m[1].length >= 3 ? +m[1] : +m[1] * 100;
}
/* Read a typed money answer ("4.79", "$4.79", "4") as cents; null if it is not money */
export function readMoney(raw) {
  const s = String(raw).replace(/[$\s]/g, '').replace(',', '.');
  const m = s.match(/^(\d{1,7})(?:\.(\d{0,2}))?$|^\.(\d{1,2})$/);
  if (!m) return null;
  if (m[3] !== undefined) return +m[3].padEnd(2, '0');
  return +m[1] * 100 + (m[2] ? +m[2].padEnd(2, '0') : 0);
}
/* Percent tip rounded to the nearest cent, half up: integer math only */
export const tipCents = (cents, pct) => Math.floor((cents * pct + 50) / 100);
/* Vedic shortcut steps for 10% and 15% */
export function tipSteps(cents, pct) {
  const ten = cents / 10, tenR = tipCents(cents, 10);
  const dollars = (cents / 100).toFixed(2), tenRaw = (cents / 1000).toFixed(3).replace(/0$/, '');
  const steps = [`10%: slide the decimal point one place left. ${'$' + dollars} becomes $${tenRaw}${ten % 1 ? `, about ${money(tenR)}` : ''}.`];
  if (pct === 15) {
    const five = ten / 2;
    steps.push(`5% is half of that: half of $${tenRaw} is $${(five / 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}.`);
    steps.push(`15% = 10% + 5% = ${money(tipCents(cents, 15))} (rounded to the cent).`);
  }
  return steps;
}
/* Change from a round base (L followed by zeros, like 500 or 1000 in dollars) with "all from 9 and the
   last from 10": the leading digit comes from L - 1, every other digit from 9, the last non-zero from 10. */
export function changeFrom(baseCents, amountCents) {
  if (amountCents <= 0 || amountCents >= baseCents) return { cents: baseCents - amountCents, steps: [] };
  const bs = String(baseCents), L = +bs[0], k = bs.length;
  if (!/^\d0*$/.test(bs)) return { cents: baseCents - amountCents, steps: [] };
  const a = String(amountCents).padStart(k, '0').split('').map(Number);
  let last = a.length - 1; while (last > 0 && a[last] === 0) last--;
  const out = [], steps = [];
  a.forEach((d, i) => {
    if (i > last) { out.push(0); return; }
    const from = i === 0 ? (i === last ? L : L - 1) : i === last ? 10 : 9;
    out.push(from - d); steps.push({ from, d, r: from - d });
  });
  return { cents: Number(out.join('')), steps };
}

/* ---------- Digit sources ---------- */
export const KINDS = { plate: 'Plate or sign', clock: 'Clock', receipt: 'Receipt', number: 'Any number' };
/* Normalize what the camera read or the player typed */
export const cleanRead = s => String(s ?? '').replace(/[oO]/g, '0').replace(/[lI|]/g, '1').replace(/[sS]/g, '5').replace(/[^\d:.$ ]/g, '').replace(/\s+/g, ' ').trim();
/* Guess the kind of a digit string */
export function guessKind(raw) {
  const s = String(raw).trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) return 'clock';
  if (/\d\.\d{2}$/.test(s) || /^\$/.test(s)) return 'receipt';
  return 'plate';
}
/* Build a source from typed or read text. Returns null when there are no digits to play with. */
export function sourceFrom(raw, kind = guessKind(raw)) {
  const s = String(raw ?? '').trim(), digits = s.replace(/\D/g, '');
  if (!digits) return null;
  if (kind === 'clock') { const tm = asTime(s); if (!tm) return null; return { kind, raw: showTime(tm), digits: digits.slice(0, 4), time: tm }; }
  if (kind === 'receipt') {
    const items = s.split(/[\s,;+]+/).map(asCents).filter(c => c != null && c > 0);
    if (!items.length) return null;
    const total = items.reduce((x, y) => x + y, 0);
    return { kind, raw: money(total), digits: String(total), total, items: items.length > 1 ? items.map(c => ({ name: '', cents: c })) : [] };
  }
  /* A plate or a number keeps only what a plate shows (capital letters, digits, a space or hyphen), at most 12
     characters: the label is shown and goes into a shared link, so it never carries other typed text */
  const label = s.toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').slice(0, 12).trim();
  return { kind, raw: label || digits.slice(0, 9), digits: digits.slice(0, 9) };
}

/* "Surprise me": a realistic plate, clock, receipt or number, seeded */
const ITEMS = ['Mangoes', 'Bread', 'Masala chai', 'Notebook', 'Pencils', 'Rice', 'Paneer', 'Bananas', 'Milk', 'Samosas', 'Crayons', 'Apples', 'Yogurt', 'Lentils', 'Juice', 'Stickers'];
const PLACES = [['Jersey', 2], ['Page', 3], ['House', 4], ['Bus', 3], ['Room', 3], ['Gate', 2]];
export function surprise(r, level = 'challenger', kind) {
  const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  kind = kind || ['plate', 'clock', 'receipt', 'number'][ri(0, 3)];
  if (kind === 'plate') {
    const ch = () => L[ri(0, L.length - 1)], dg = n => Array.from({ length: n }, (_, i) => ri(i ? 0 : 1, 9)).join('');
    const fmt = ri(0, 2);
    const nd = level === 'explorer' ? 3 : 4;
    const d = dg(nd);
    const label = fmt === 0 ? `${ch()}${ch()}${ch()} ${d}` : fmt === 1 ? `${d[0]}${ch()}${ch()} ${d.slice(1)}` : `${ch()}${ch()} ${d}`;
    return { kind, raw: label, digits: d, label: 'Plate' };
  }
  if (kind === 'clock') { const tm = { h: ri(1, 12), m: ri(0, 59) }; return { kind, raw: showTime(tm), digits: `${tm.h}${String(tm.m).padStart(2, '0')}`, time: tm }; }
  if (kind === 'receipt') {
    const n = level === 'explorer' ? 2 : ri(3, 4);
    const names = [...ITEMS].sort(() => r() - 0.5).slice(0, n);
    const items = names.map(name => ({ name, cents: level === 'explorer' ? ri(1, 8) * 100 : level === 'pro' ? ri(300, 6400) : ri(99, 1299) }));
    const total = items.reduce((s, x) => s + x.cents, 0);
    return { kind, raw: money(total), digits: String(total), total, items };
  }
  const [label, len] = PLACES[ri(0, PLACES.length - 1)];
  const nd = level === 'explorer' ? Math.min(len, 2) : Math.max(len, level === 'pro' ? 4 : 3);
  const d = Array.from({ length: nd }, (_, i) => ri(i ? 0 : 1, 9)).join('');
  return { kind: 'number', raw: d, digits: d, label };
}

/* ---------- Challenges ---------- */
/* Every challenge: { id, type, title, prompt, input: 'expr'|'number'|'money'|'yesno', check(v) -> { ok, msg },
   hint, solution: [lines], ... }. Every one is solvable: build() only offers what the solver verified. */
const LV = ['explorer', 'challenger', 'pro'];
/* Choose a make-N spec from the digits that the solver can solve, preferring the classic targets */
export function makeSpec(digitStr, level = 'challenger') {
  const ds = String(digitStr).replace(/\D/g, '').split('').map(Number);
  if (ds.length < 2) return null;
  const tries = [];
  if (level === 'explorer') {
    const w = ds.slice(0, Math.min(3, ds.length));
    for (const target of [10, 9, 8, 12, 7, 11, 6, 5]) tries.push({ digits: w, target, ordered: false, ops: '+-' });
  } else if (level === 'challenger') {
    const w = ds.slice(-4);
    for (const target of [24, 10, 12, 20]) tries.push({ digits: w, target, ordered: false, ops: '+-*/' });
    for (const target of [10, 24]) tries.push({ digits: ds.slice(0, 6), target, ordered: true, ops: '+-*/' });
  } else {
    const w = ds.slice(0, 6);
    tries.push({ digits: w, target: 100, ordered: true, ops: '+-*/' });
    tries.push({ digits: w, target: 100, ordered: true, ops: '+-*/', concat: true });
    for (const target of [24, 10]) tries.push({ digits: w, target, ordered: true, ops: '+-*/' });
    for (const target of [24, 10]) tries.push({ digits: ds.slice(-4), target, ordered: false, ops: '+-*/' });
  }
  /* Fallback: the friendliest target these digits can reach */
  const w = level === 'explorer' ? ds.slice(0, 3) : ds.slice(-4), ops = level === 'explorer' ? '+-' : '+-*/';
  const near10 = level === 'explorer' ? [5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 4, 3, 2, 1] : [30, 36, 48, 50, 60, 12, 20, 15, 16, 18, 21, 25, 27, 28, 32, 40, 42, 45, 9, 8, 7, 6, 5];
  for (const target of near10) tries.push({ digits: w, target, ordered: false, ops });
  for (const sp of tries) { const sol = solveMake(sp); if (sol) return { ...sp, solution: sol }; }
  return null;
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const numIn = v => { const n = Number(String(v).replace(/[^\d.\-]/g, '')); return String(v).trim() === '' || Number.isNaN(n) ? null : n; };

export function makeChallenge(sp) {
  const opsTxt = [...sp.ops].map(o => OP_SHOW[o]).join(' ');
  return {
    id: `make${sp.target}`, type: 'make', spec: sp, input: 'expr',
    title: `Make ${sp.target}`,
    prompt: `Use ${sp.ordered ? 'the digits in this order' : 'each digit once, in any order'}: ${sp.digits.join(' ')}. Signs: ${opsTxt}${sp.ops.length > 2 ? ' and brackets' : ''}${sp.concat ? '. You may glue neighbors into one number, like 4 and 8 into 48' : ''}.`,
    check: v => { const r = checkMake(v, sp); return r.ok ? { ok: true, msg: `${pretty(v)} = ${sp.target}. You did it.` } : { ok: false, msg: r.reason }; },
    hint: `Try to make a number that is easy to finish from, like ${sp.target === 24 ? '4 × 6, 3 × 8 or 12 × 2' : sp.target === 100 ? '10 × 10, 50 + 50 or 4 × 25' : `${sp.target - 1} + 1 or ${sp.target / 2 === Math.floor(sp.target / 2) ? `2 × ${sp.target / 2}` : `${sp.target + 1} − 1`}`}.`,
    solution: [`One way: ${pretty(sp.solution)} = ${sp.target}.`, 'There are often several. Can you find another?']
  };
}

export function rootChallenge(digitStr, level) {
  const n = String(digitStr).replace(/\D/g, ''), chain = rootChain(n), root = digitalRoot(n);
  const ask = level === 'explorer' ? 'sum' : 'root';
  const ans = ask === 'sum' ? digitSum(n) : root;
  return {
    id: 'root', type: 'root', input: 'number', answer: ans,
    title: ask === 'sum' ? 'Digit sum' : 'Digital root',
    prompt: ask === 'sum' ? `Add up the digits of ${n}.` : `Add the digits of ${n}, then add the digits of that, until one digit is left. That digit is the digital root.`,
    check: v => { const x = numIn(v); return x === ans ? { ok: true, msg: `${chain.join(' → ')}. ${ask === 'sum' ? `The digit sum is ${ans}.` : `The digital root is ${ans}.`}` } : { ok: false, msg: x == null ? 'Type a number.' : `Not ${x}. Add them one at a time: ${digitsOf(n).join(' + ')}.` }; },
    hint: `Shortcut: skip any 9, and any pair that adds to 9. They never change the digital root. That is "casting out nines".`,
    solution: [`${digitsOf(n).join(' + ')} = ${digitSum(n)}`, ...(chain.length > 2 ? [`${digitsOf(chain[1]).join(' + ')} = ${chain[2]}${chain.length > 3 ? ` → ${chain.slice(3).join(' → ')}` : ''}`] : []), ask === 'sum' ? `Digit sum ${ans}.` : `Digital root ${root}.`]
  };
}

export function divChallenge(digitStr, k) {
  const n = String(digitStr).replace(/\D/g, '').replace(/^0+(?=\d)/, ''), yes = divides(n, k), R = RULES[k];
  const q = Math.floor(Number(n) / k), rem = Number(n) % k;
  return {
    id: `div${k}`, type: 'div', k, n, input: 'yesno', answer: yes,
    title: `Is it in the ${k} times table?`,
    prompt: `Can ${n} be shared into ${k} equal groups with nothing left over? Guess first, then we find out.`,
    check: v => {
      const said = v === true || v === 'yes';
      const fact = rem ? `${n} ÷ ${k} = ${q} remainder ${rem}` : `${n} ÷ ${k} = ${q} exactly`;
      return said === yes ? { ok: true, msg: `Right: ${fact}.` } : { ok: false, msg: `Not this time: ${fact}.` };
    },
    clue: () => ({ n, k, yes, clue: R.clue(n) }),
    hint: `Look at the ${k === 11 ? 'digits taking turns: add one, subtract the next' : 'sum of the digits'}. Is that in the ${k} times table?`,
    solution: [R.clue(n) + '.', `${yes ? 'It is' : 'It is not'} a multiple of ${k}, so ${n} ${yes ? 'is' : 'is not'} either.`, R.rule]
  };
}

export function clockChallenges(time, level) {
  const out = [], { h, m } = time, show = showTime(time);
  if (level === 'explorer') {
    const ans = minutesToHour(m);
    out.push({ id: 'tohour', type: 'clock', input: 'number', answer: ans, title: 'Minutes to the next hour',
      prompt: `The clock says ${show}. How many minutes until the next o'clock?`,
      check: v => (numIn(v) === ans ? { ok: true, msg: `${m} + ${ans} = 60. Then it is ${h12(h + 1)} o'clock.` } : { ok: false, msg: `Count up from ${m} to 60.` }),
      hint: `${m} to ${Math.ceil((m + 1) / 10) * 10} is ${Math.ceil((m + 1) / 10) * 10 - m}, then count in tens to 60.`,
      solution: [`60 − ${m} = ${ans} minutes.`] });
  } else {
    const ang = clockAngle(h, m), H = h % 12;
    out.push({ id: 'angle', type: 'clock', input: 'number', answer: ang, title: 'Angle between the hands',
      prompt: `At ${show}, what is the smaller angle between the hour hand and the minute hand, in degrees?`,
      check: v => { const x = numIn(v); return x != null && near(x, ang, level === 'pro' ? 0.01 : 0.6) ? { ok: true, msg: `${ang}°. Nice.` } : { ok: false, msg: x == null ? 'Type a number of degrees.' : `Not quite. The hour hand also creeps forward ${m ? `${m / 2}° in ${m} minutes` : 'as minutes pass'}.` }; },
      hint: 'The minute hand moves 6° a minute. The hour hand moves 30° an hour, plus half a degree every minute.',
      solution: [`Minute hand: ${m} × 6 = ${6 * m}°.`, `Hour hand: ${H} × 30 + ${m} × 0.5 = ${30 * H + 0.5 * m}°.`, `Gap: |${30 * H + 0.5 * m} − ${6 * m}| = ${Math.abs(30 * H - 5.5 * m)}°${Math.abs(30 * H - 5.5 * m) > 180 ? `, the other way round 360 − ${Math.abs(30 * H - 5.5 * m)} = ${ang}°` : ''}.`] });
  }
  const p = nextPalindrome(h, m);
  if (p && level !== 'explorer') out.push({ id: 'pal', type: 'clock', input: 'number', answer: p.minutes, title: 'Next palindrome time',
    prompt: `${show} on a 12 hour clock. A palindrome time reads the same backwards, like 12:21 or 4:04. How many minutes until the next one?`,
    check: v => (numIn(v) === p.minutes ? { ok: true, msg: `${showTime(p)} reads the same both ways, ${p.minutes} minutes away.` } : { ok: false, msg: 'Find the next palindrome time first, then count the minutes.' }),
    hint: `Try times in the ${h12(p.h === h12(h) ? h : p.h)} o'clock hour. The minutes must mirror the hour digit.`,
    solution: [`The next palindrome is ${showTime(p)}.`, `From ${show} that is ${p.minutes} minutes.`] });
  return out;
}

export function receiptChallenges(src, level) {
  const out = [], total = src.total, items = src.items || [];
  const kTol = c => Math.max(100, Math.round(c * 0.1));
  if (items.length > 1) {
    const est = items.reduce((s, x) => s + Math.round(x.cents / 100), 0);
    out.push({ id: 'estimate', type: 'receipt', input: 'money', answer: total, title: 'Estimate the total',
      prompt: `No adding cents. Round each price to the nearest dollar and estimate the total.`,
      check: v => { const c = readMoney(v); return c != null && near(c, total, kTol(total)) ? { ok: true, msg: `Close! Rounded it is about $${est}; the exact total is ${money(total)}.` } : { ok: false, msg: c == null ? 'Type an amount in dollars.' : c < total ? 'A bit higher.' : 'A bit lower.' }; },
      hint: `${items.map(x => `${money(x.cents)} is about $${Math.round(x.cents / 100)}`).join(', ')}.`,
      solution: [`${items.map(x => `$${Math.round(x.cents / 100)}`).join(' + ')} = $${est}.`, `Exact: ${money(total)}.`] });
  }
  for (const pct of level === 'explorer' ? [] : level === 'challenger' ? [10, 15] : [15]) {
    const tip = tipCents(total, pct);
    out.push({ id: `tip${pct}`, type: 'receipt', input: 'money', answer: tip, title: `${pct}% tip`,
      prompt: `What is a ${pct}% tip on ${money(total)}?`,
      check: v => { const c = readMoney(v); return c != null && near(c, tip, 1) ? { ok: true, msg: `${money(tip)}. ${pct === 15 ? '10% plus half of it.' : 'Just slide the decimal point.'}` } : { ok: false, msg: c == null ? 'Type an amount, like 4.75.' : `Not quite. Start with 10%: slide the decimal point one place left.` }; },
      hint: pct === 10 ? 'Slide the decimal point one place to the left.' : 'Find 10% first. 5% is half of that. Add them.',
      solution: tipSteps(total, pct) });
  }
  const base = level === 'explorer' ? [1000, 2000, 5000, 10000].find(b => b > total) : [50000, 100000, 500000, 1000000].find(b => b > total);
  if (base) {
    const ch = changeFrom(base, total);
    out.push({ id: 'change', type: 'receipt', input: 'money', answer: ch.cents, title: `Change from ${money(base).replace('.00', '')}`,
      prompt: `You pay with ${money(base).replace('.00', '')}. What change do you get?`,
      check: v => { const c = readMoney(v); return c === ch.cents ? { ok: true, msg: `${money(ch.cents)}. All from 9 and the last from 10!` } : { ok: false, msg: c == null ? 'Type an amount.' : `Check it: ${money(total)} + your change should make ${money(base)}.` }; },
      hint: level === 'explorer' ? `Count up from ${money(total)} to ${money(base)}.` : `"All from 9 and the last from 10": take each digit from 9, and the last one from 10${String(base)[0] !== '1' ? `; the first digit comes from ${+String(base)[0] - 1}` : ''}.`,
      solution: ch.steps.length ? [`Digits of ${money(total)}: ${ch.steps.map(s => `${s.from} − ${s.d} = ${s.r}`).join(', ')}.`, `Change: ${money(ch.cents)}.`, 'This is Nikhilam: "all from 9 and the last from 10", a sutra from Bharati Krishna Tirtha\'s 1965 book.'] : [`${money(base)} − ${money(total)} = ${money(ch.cents)}.`] });
  }
  if (level === 'pro' && items.length > 1) {
    const roots = items.map(x => digitalRoot(x.cents)), sumR = digitalRoot(roots.reduce((s, x) => s + x, 0)), tR = digitalRoot(total);
    out.push({ id: 'nines', type: 'receipt', input: 'number', answer: tR, title: 'Check it with casting out nines',
      prompt: `Find the digital root of each price (ignore the decimal point), add those and take the digital root. It must match the total's digital root. What is it?`,
      check: v => (numIn(v) === tR ? { ok: true, msg: `Both sides give ${tR}, so the total passes the check.` } : { ok: false, msg: 'Add the digits of each price until one digit is left.' }),
      hint: 'Cross out 9s and pairs that make 9 first. They do not change a digital root.',
      solution: [`Prices: ${items.map((x, i) => `${(x.cents / 100).toFixed(2)} → ${roots[i]}`).join(', ')}.`, `${roots.join(' + ')} → ${sumR}. Total ${money(total)} → ${tR}. They match.`, 'If they did not match, the total would be wrong. (A match is strong evidence, not a proof: swapped digits still pass.)'] });
  }
  return out;
}

/* All challenges for a source at a level, every one verified solvable */
export function build(src, level = 'challenger') {
  if (!src) return [];
  level = LV.includes(level) ? level : 'challenger';
  const out = [];
  if (src.kind === 'receipt') out.push(...receiptChallenges(src, level));
  if (src.kind === 'clock' && src.time) out.push(...clockChallenges(src.time, level));
  const digits = src.kind === 'receipt' ? String(src.total) : src.digits;
  const sp = makeSpec(digits, level);
  if (sp) out.push(makeChallenge(sp));
  if (src.kind !== 'receipt' || level !== 'explorer') out.push(rootChallenge(digits, level));
  if (src.kind !== 'receipt') {
    const ks = level === 'explorer' ? [3] : level === 'challenger' ? [3, 9] : [9, 11];
    if (String(digits).replace(/\D/g, '').length >= 2) for (const k of ks) out.push(divChallenge(digits, k));
  }
  return out;
}
