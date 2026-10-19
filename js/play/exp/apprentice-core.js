/* Teach the Apprentice: pure logic (no DOM). The mistake bank: templates that generate a problem and the
   apprentice's worked steps, either all correct or with exactly one planted misconception. Every step carries
   the honest value (what that step should give from the work before it) and the value the apprentice wrote,
   so tests can prove the right steps are right and the planted step is really wrong. */
import { int, pick, shuffle, rng } from '../kit.js';

const MINUS = '−', TIMES = '×', DIV = '÷';
/* Numbers for display: a true minus sign, and no floating point dust */
export const R = v => Math.round(v * 1e9) / 1e9;
export const N = v => { const r = R(v); return r < 0 ? `${MINUS}${-r}` : String(r); };
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const F = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; n /= g; d /= g; return d === 1 ? N(n) : `${N(n)}/${d}`; };
const st = (t, honest, wrote = honest, noCheck = false) => ({ t, honest, wrote, noCheck });

/* Values are numbers, or functions of x for algebra; equal means equal at several test points */
const XS = [-3, -1, 0.5, 2, 5];
export const same = (a, b) => (typeof a === 'function' || typeof b === 'function'
  ? XS.every(x => Math.abs(R(a(x)) - R(b(x))) < 1e-9)
  : Math.abs(R(a) - R(b)) < 1e-9);

/* T(id, level, topic, fix, gen): gen(r, slip) -> { q, answer, steps } */
const T = (id, lv, topic, fix, gen) => ({ id, lv, topic, fix, gen });

export const BANK = [
  /* ---------- Explorer: counting and adding ---------- */
  T('count-on', 'explorer', 'Counting on', 'Start counting from the next number, not the one you are standing on.', (r, s) => {
    const a = int(r, 3, 9), b = int(r, 2, 4);
    const list = Array.from({ length: b }, (_, i) => (s ? a + i : a + 1 + i)), w = list[b - 1];
    return { q: `${a} + ${b}`, answer: a + b, steps: [st(`Start at ${a}.`, a), st(`Count on ${b}: ${list.join(', ')}.`, a + b, w), st(`So ${a} + ${b} = ${w}.`, w)] };
  }),
  T('make-ten', 'explorer', 'Making ten', 'The two parts you split a number into must add back up to that number.', (r, s) => {
    const a = int(r, 6, 9), b = int(r, 12 - a, 9), need = 10 - a, part = b - need, p = s ? part - 1 : part;
    return { q: `${a} + ${b}`, answer: a + b, steps: [st(`Split ${b} into ${need} and ${p}.`, part, p), st(`${a} + ${need} = 10.`, 10), st(`10 + ${p} = ${10 + p}.`, 10 + p)] };
  }),
  T('near-double', 'explorer', 'Near doubles', 'Check how much bigger the second number really is than the first.', (r, s) => {
    const a = int(r, 3, 8), b = a + 1, extra = s ? 2 : 1;
    return { q: `${a} + ${b}`, answer: a + b, steps: [st(`${b} is ${a} + ${extra}.`, 1, extra), st(`Double ${a} is ${2 * a}.`, 2 * a), st(`${2 * a} + ${extra} = ${2 * a + extra}.`, 2 * a + extra)] };
  }),
  T('add-tens', 'explorer', 'Tens and ones', 'Tens join the tens and ones join the ones.', (r, s) => {
    const a = 10 * int(r, 1, 6) + int(r, 1, 6), k = int(r, 1, 3), b = 10 * k, w = s ? a + k : a + b;
    const tens = `${k} ten${k === 1 ? '' : 's'}`;
    return { q: `${a} + ${b}`, answer: a + b, steps: [st(`${b} is ${tens}.`, k), st(s ? `Add the ${k} to the ones: ${w}.` : `Add ${tens} to ${a}: ${w}.`, a + b, w), st(`So ${a} + ${b} = ${w}.`, w)] };
  }),
  T('sub-trade', 'explorer', 'Taking away', 'When the top ones digit is smaller, trade a ten for ten ones first. Never flip the digits.', (r, s) => {
    let a1, a0, b1, b0;
    do { a1 = int(r, 3, 9); a0 = int(r, 0, 4); b1 = int(r, 1, a1 - 1); b0 = int(r, a0 + 1, 9); } while (b0 - a0 === 5);
    const a = 10 * a1 + a0, b = 10 * b1 + b0, o = s ? b0 - a0 : 10 + a0 - b0, tt = s ? a1 - b1 : a1 - 1 - b1;
    return { q: `${a} ${MINUS} ${b}`, answer: a - b, steps: [
      st(s ? `Ones: ${a0} take away ${b0}? Flip it: ${b0} ${MINUS} ${a0} = ${o}.` : `Ones: trade a ten, ${10 + a0} ${MINUS} ${b0} = ${o}.`, 10 + a0 - b0, o),
      st(`Tens: ${s ? a1 : a1 - 1} ${MINUS} ${b1} = ${tt}.`, tt), st(`So ${a} ${MINUS} ${b} = ${tt * 10 + o}.`, tt * 10 + o)] };
  }),
  T('sub-zero', 'explorer', 'Taking from a round ten', 'Zero take away a number needs a trade: borrow a ten, it is not the number itself.', (r, s) => {
    let b; do { b = int(r, 2, 9); } while (b === 5);
    const t = int(r, 3, 9), a = 10 * t, o = s ? b : 10 - b, tt = s ? t : t - 1;
    return { q: `${a} ${MINUS} ${b}`, answer: a - b, steps: [
      st(s ? `Ones: 0 take ${b}? Just write ${b}.` : `Ones: trade a ten, 10 ${MINUS} ${b} = ${o}.`, 10 - b, o),
      st(`Tens: ${tt} left.`, tt), st(`So ${a} ${MINUS} ${b} = ${tt * 10 + o}.`, tt * 10 + o)] };
  }),
  T('skip-five', 'explorer', 'Counting by fives', 'Say exactly one number for each hand. No skipping.', (r, s) => {
    const k = int(r, 3, 6), j = int(r, 1, k - 1);
    const list = Array.from({ length: k }, (_, i) => 5 * (i + 1) + (s && i >= j ? 5 : 0)), w = list[k - 1];
    return { q: `How many fingers on ${k} hands?`, answer: 5 * k, steps: [st(`Count by fives, one for each hand: ${list.join(', ')}.`, 5 * k, w), st(`So ${k} hands have ${w} fingers.`, w)] };
  }),
  T('compare', 'explorer', 'Which is bigger', 'Look at the tens first: tens are worth more than ones.', (r, s) => {
    const x = int(r, 1, 8), y = int(r, x + 1, 9), A = 10 * x + y, B = 10 * y + x, w = s ? A : B;
    return { q: `Which is bigger, ${A} or ${B}?`, answer: B, steps: [st(s ? `Look at the ones: ${y} beats ${x}, so ${A} wins.` : `Look at the tens: ${y} tens beats ${x} ten${x === 1 ? '' : 's'}, so ${B} wins.`, B, w), st(`The bigger number is ${w}.`, w)] };
  }),
  T('three-add', 'explorer', 'Adding three numbers', 'Tick off each number as you use it, so none is used twice.', (r, s) => {
    const a = int(r, 1, 9), c = 10 - a; let b; do { b = int(r, 2, 9); } while (b === c);
    const w = s ? 10 + c : 10 + b;
    return { q: `${a} + ${b} + ${c}`, answer: a + b + c, steps: [st(`${a} + ${c} = 10.`, 10), st(`10 + ${s ? c : b} = ${w}.`, 10 + b, w), st(`So the total is ${w}.`, w)] };
  }),
  T('teen', 'explorer', 'Writing teen numbers', 'The ones go right next to the tens digit, in the ones place.', (r, s) => {
    const o = int(r, 1, 9), w = s ? 100 + o : 10 + o;
    const ones = `${o} one${o === 1 ? '' : 's'}`;
    return { q: `Write 1 ten and ${ones} as a number.`, answer: 10 + o, steps: [st('1 ten is 10.', 10), st(s ? `Write 10, then ${o}: ${w}.` : `Put the ${ones} in the ones place: ${w}.`, 10 + o, w), st(`So the number is ${w}.`, w)] };
  }),
  T('add-nine', 'explorer', 'Adding 9', '9 is one less than 10, so after adding 10, take one away.', (r, s) => {
    const a = int(r, 12, 80), w = s ? a + 11 : a + 9;
    return { q: `${a} + 9`, answer: a + 9, steps: [st(`${a} + 10 = ${a + 10}.`, a + 10), st(s ? `Then add 1 more: ${w}.` : `Then take 1 back: ${w}.`, a + 9, w), st(`So ${a} + 9 = ${w}.`, w)] };
  }),
  T('double', 'explorer', 'Doubling', 'Double means the same number twice.', (r, s) => {
    const n = int(r, 3, 9), w = s ? n + 2 : 2 * n;
    return { q: `Double ${n}`, answer: 2 * n, steps: [st(s ? `Double means add 2: ${n} + 2 = ${w}.` : `Double means ${n} + ${n} = ${w}.`, 2 * n, w), st(`So double ${n} is ${w}.`, w)] };
  }),

  /* ---------- Challenger: multiplication, fractions, decimals, Vedic tricks ---------- */
  T('mul-carry', 'challenger', 'Multiplying with a carry', 'Add the carried digit to the next product.', (r, s) => {
    let a, m; do { a = 10 * int(r, 2, 9) + int(r, 3, 9); m = int(r, 3, 9); } while ((a % 10) * m < 10);
    const a0 = a % 10, a1 = Math.floor(a / 10), u = a0 * m, uw = u % 10, c = Math.floor(u / 10), t = a1 * m, w = s ? t : t + c;
    return { q: `${a} ${TIMES} ${m}`, answer: a * m, steps: [st(`${a0} ${TIMES} ${m} = ${u}: write ${uw}, carry ${c}.`, u), st(`${a1} ${TIMES} ${m} = ${t}.`, t), st(s ? `Write ${t} in front.` : `${t} + ${c} carried = ${w}.`, t + c, w), st(`So ${a} ${TIMES} ${m} = ${w * 10 + uw}.`, w * 10 + uw)] };
  }),
  T('long-shift', 'challenger', 'Long multiplication', 'The 1 in the tens place is worth 10, so that row moves one place left.', (r, s) => {
    const a = int(r, 12, 49), b0 = int(r, 2, 9), b = 10 + b0, x = s ? a : a * 10;
    return { q: `${a} ${TIMES} ${b}`, answer: a * b, steps: [st(`${a} ${TIMES} ${b0} = ${a * b0}.`, a * b0), st(s ? `${a} ${TIMES} 1 = ${x}.` : `${a} ${TIMES} 10 = ${x}.`, a * 10, x), st(`${a * b0} + ${x} = ${a * b0 + x}.`, a * b0 + x)] };
  }),
  T('frac-add', 'challenger', 'Adding fractions', 'Make the bottoms the same first; never add the bottoms together.', (r, s) => {
    const a = int(r, 2, 5), b = int(r, a + 1, 7), D = s ? a + b : a * b, v = s ? 2 / (a + b) : (a + b) / (a * b);
    return { q: `1/${a} + 1/${b}`, answer: 1 / a + 1 / b, steps: [
      st(s ? `Add the bottoms: ${a} + ${b} = ${D}.` : `Common bottom: ${a} ${TIMES} ${b} = ${D}.`, a * b, D),
      st(s ? `Add the tops: 1 + 1 = 2, so 2/${D}.` : `${b}/${D} + ${a}/${D} = ${F(a + b, D)}.`, v, v, true)] };
  }),
  T('dec-mul', 'challenger', 'Multiplying decimals', 'Count the decimal places in both numbers and give the answer that many.', (r, s) => {
    let a, b; do { a = int(r, 2, 9); b = int(r, 2, 9); } while (a * b < 10);
    const w = s ? (a * b) / 10 : (a * b) / 100;
    return { q: `0.${a} ${TIMES} 0.${b}`, answer: (a * b) / 100, steps: [st(`${a} ${TIMES} ${b} = ${a * b}.`, a * b), st(s ? `One decimal place: ${N(w)}.` : `Two decimal places in total: ${N(w)}.`, (a * b) / 100, w)] };
  }),
  T('dec-align', 'challenger', 'Adding decimals', 'Line up the decimal points, not the last digits.', (r, s) => {
    const x = R(int(r, 1, 9) + int(r, 1, 9) / 10), y = R(int(r, 1, 9) + int(r, 1, 9) / 10 + int(r, 1, 9) / 100), w = s ? R(x / 10) : x;
    return { q: `${N(x)} + ${N(y)}`, answer: x + y, steps: [st(s ? `Line up the last digits: ${N(w)} + ${N(y)}.` : `Line up the points: ${x.toFixed(2)} + ${N(y)}.`, x, w), st(`Add: ${N(w + y)}.`, w + y)] };
  }),
  T('nikhilam-sign', 'challenger', 'Nikhilam below 100', 'Below the base the gap is taken away: cross-subtract, do not add.', (r, s) => {
    let a, b; do { a = int(r, 90, 98); b = int(r, 90, 98); } while (a === b);
    const ga = 100 - a, gb = 100 - b, w = s ? a + gb : a - gb;
    return { q: `${a} ${TIMES} ${b}`, answer: a * b, steps: [st(`Gaps from 100: ${ga} and ${gb}.`, ga), st(s ? `Cross: ${a} + ${gb} = ${w}.` : `Cross: ${a} ${MINUS} ${gb} = ${w}.`, a - gb, w), st(`Gaps: ${ga} ${TIMES} ${gb} = ${ga * gb}.`, ga * gb), st(`Join, gaps as two digits: ${w * 100 + ga * gb}.`, w * 100 + ga * gb)] };
  }),
  T('nikhilam-above', 'challenger', 'Nikhilam above 100', 'Above the base the extra is added on: cross-add, do not subtract.', (r, s) => {
    let a, b; do { a = int(r, 102, 109); b = int(r, 102, 109); } while (a === b);
    const sa = a - 100, sb = b - 100, w = s ? a - sb : a + sb;
    return { q: `${a} ${TIMES} ${b}`, answer: a * b, steps: [st(`Extras over 100: ${sa} and ${sb}.`, sa), st(s ? `Cross: ${a} ${MINUS} ${sb} = ${w}.` : `Cross: ${a} + ${sb} = ${w}.`, a + sb, w), st(`Extras: ${sa} ${TIMES} ${sb} = ${sa * sb}.`, sa * sb), st(`Join, extras as two digits: ${w * 100 + sa * sb}.`, w * 100 + sa * sb)] };
  }),
  T('sq5', 'challenger', 'Squares ending in 5', 'Ekādhikena: multiply the first digit by one MORE than itself.', (r, s) => {
    const t = int(r, 2, 9), n = 10 * t + 5, w = s ? t * t : t * (t + 1);
    return { q: `${n}²`, answer: n * n, steps: [st(s ? `${t} ${TIMES} ${t} = ${w}.` : `${t} ${TIMES} ${t + 1} = ${w}.`, t * (t + 1), w), st(`Write 25 after it: ${w * 100 + 25}.`, w * 100 + 25)] };
  }),
  T('by11-carry', 'challenger', 'Times 11', 'When the middle sum is 10 or more, carry its 1 into the left digit.', (r, s) => {
    let x, y; do { x = int(r, 2, 9); y = int(r, 1, 9); } while (x + y < 10);
    const n = 10 * x + y, w = s ? Number(`${x}${x + y}${y}`) : n * 11;
    return { q: `${n} ${TIMES} 11`, answer: n * 11, steps: [st(`${x} + ${y} = ${x + y}.`, x + y), st(s ? `Put it in the middle: ${w}.` : `Put the ${(x + y) % 10} in the middle, carry 1 to the ${x}: ${w}.`, n * 11, w)] };
  }),
  T('by99', 'challenger', 'Times 99', 'Ekanyūnena: the left part is one LESS than the number.', (r, s) => {
    const n = int(r, 11, 98), w = s ? n : n - 1;
    return { q: `${n} ${TIMES} 99`, answer: n * 99, steps: [st(s ? `Keep the number: ${w}.` : `One less: ${w}.`, n - 1, w), st(`The rest of the way to 100: ${100 - n}.`, 100 - n), st(`Join, right part as two digits: ${w * 100 + 100 - n}.`, w * 100 + 100 - n)] };
  }),
  T('remainder', 'challenger', 'Remainders', 'A remainder must be smaller than the number you divide by. If it is not, one more fits.', (r, s) => {
    const d = int(r, 3, 9), q = int(r, 4, 9), rr = int(r, 1, d - 1), n = d * q + rr, qq = s ? q - 1 : q;
    return { q: `${n} ${DIV} ${d}`, answer: q * 1000 + rr, steps: [st(`How many ${d}s fit in ${n}? ${qq}.`, q, qq), st(`${d} ${TIMES} ${qq} = ${d * qq}.`, d * qq), st(`${n} ${MINUS} ${d * qq} = ${n - d * qq}, so ${qq} remainder ${n - d * qq}.`, qq * 1000 + n - d * qq, qq * 1000 + n - d * qq, true)] };
  }),
  T('perimeter', 'challenger', 'Perimeter', 'A rectangle has four sides. Count all of them.', (r, s) => {
    const l = int(r, 5, 12), w0 = int(r, 2, l - 1), w = s ? l + w0 : 2 * (l + w0);
    return { q: `Perimeter of a ${l} by ${w0} rectangle`, answer: 2 * (l + w0), steps: [st(`One long and one short side: ${l} + ${w0} = ${l + w0}.`, l + w0), st(s ? `So the perimeter is ${w}.` : `Two of each: 2 ${TIMES} ${l + w0} = ${w}.`, 2 * (l + w0), w)] };
  }),
  T('order-ops', 'challenger', 'Order of operations', 'Multiply before you add, even when the adding comes first.', (r, s) => {
    let a, b, c; do { a = int(r, 2, 9); b = int(r, 2, 6); c = int(r, 2, 6); } while (a + b === b * c);
    const first = s ? a + b : b * c, v = s ? (a + b) * c : a + b * c;
    return { q: `${a} + ${b} ${TIMES} ${c}`, answer: a + b * c, steps: [st(s ? `${a} + ${b} = ${first} first.` : `${b} ${TIMES} ${c} = ${first} first.`, b * c, first), st(s ? `${first} ${TIMES} ${c} = ${v}.` : `${a} + ${first} = ${v}.`, v)] };
  }),
  T('equiv-frac', 'challenger', 'Equivalent fractions', 'Whatever you multiply the bottom by, multiply the top by the same.', (r, s) => {
    const d = int(r, 3, 6), n = int(r, 1, d - 1), k = int(r, 2, 4), D = d * k, f = s ? D - d : k, top = s ? n + D - d : n * k;
    return { q: `${n}/${d} = ?/${D}`, answer: n * k, steps: [st(s ? `${d} + ${D - d} = ${D}, so add ${f}.` : `${d} ${TIMES} ${k} = ${D}, so multiply by ${f}.`, k, f), st(s ? `Top: ${n} + ${f} = ${top}.` : `Top: ${n} ${TIMES} ${f} = ${top}.`, top)] };
  }),
  T('crosswise', 'challenger', 'Vertically and crosswise', 'Crosswise means BOTH diagonals, added together.', (r, s) => {
    let a1, a0, b1, b0; do { a1 = int(r, 1, 3); a0 = int(r, 1, 3); b1 = int(r, 1, 3); b0 = int(r, 1, 3); } while (a1 * b0 + a0 * b1 > 9);
    const A = 10 * a1 + a0, B = 10 * b1 + b0, u = a0 * b0, cr = a1 * b0 + a0 * b1, cw = s ? a1 * b0 : cr, tt = a1 * b1;
    return { q: `${A} ${TIMES} ${B}`, answer: A * B, steps: [st(`Units: ${a0} ${TIMES} ${b0} = ${u}.`, u), st(s ? `Cross: ${a1} ${TIMES} ${b0} = ${cw}.` : `Cross: ${a1} ${TIMES} ${b0} + ${a0} ${TIMES} ${b1} = ${cw}.`, cr, cw), st(`Tens: ${a1} ${TIMES} ${b1} = ${tt}.`, tt), st(`Together: ${tt * 100 + cw * 10 + u}.`, tt * 100 + cw * 10 + u)] };
  }),
  T('times10', 'challenger', 'Times 10 with decimals', 'Times 10 moves every digit one place left. Adding a zero after the point changes nothing.', (r, s) => {
    const x = R(int(r, 1, 9) + int(r, 1, 9) / 10), w = s ? x : R(x * 10);
    return { q: `${N(x)} ${TIMES} 10`, answer: x * 10, steps: [st(s ? `Times 10: add a zero, ${x.toFixed(2)}.` : `Times 10: every digit moves one place left, ${N(w)}.`, x * 10, w), st(`So ${N(x)} ${TIMES} 10 = ${N(w)}.`, w)] };
  }),
  T('ends10', 'challenger', 'Last digits add to ten', 'The tens digit meets one MORE than itself.', (r, s) => {
    const t = int(r, 2, 9), u = int(r, 1, 9), a = 10 * t + u, b = 10 * t + 10 - u, w = s ? t * t : t * (t + 1), p = u * (10 - u);
    return { q: `${a} ${TIMES} ${b}`, answer: a * b, steps: [st(s ? `${t} ${TIMES} ${t} = ${w}.` : `${t} ${TIMES} ${t + 1} = ${w}.`, t * (t + 1), w), st(`${u} ${TIMES} ${10 - u} = ${p}.`, p), st(`Join, last part as two digits: ${w * 100 + p}.`, w * 100 + p)] };
  }),
  T('dec-compare', 'challenger', 'Comparing decimals', 'More digits does not mean bigger. Give both the same number of decimal places, then compare.', (r, s) => {
    const d = int(r, 3, 8), A = d / 10, B = R((d - 1) / 10 + int(r, 1, 9) / 100), w = s ? B : A;
    return { q: `Which is bigger, ${N(A)} or ${N(B)}?`, answer: A, steps: [st(s ? `${N(B)} has more digits, so ${N(w)} wins.` : `${N(A)} is ${A.toFixed(2)}, more than ${N(B)}, so ${N(w)} wins.`, A, w), st(`The bigger one is ${N(w)}.`, w)] };
  }),

  /* ---------- Pro: algebra, exponents, percentages ---------- */
  T('neg-square', 'pro', 'Squaring a negative', 'A negative times a negative is positive: (−a)² is positive.', (r, s) => {
    const x = -int(r, 2, 6), c = int(r, 2, 5), sq = s ? -x * x : x * x;
    return { q: `x² ${MINUS} ${c}x when x = ${N(x)}`, answer: x * x - c * x, steps: [st(`x² = (${N(x)})² = ${N(sq)}.`, x * x, sq), st(`${c}x = ${c} ${TIMES} (${N(x)}) = ${N(c * x)}.`, c * x), st(`${N(sq)} ${MINUS} (${N(c * x)}) = ${N(sq - c * x)}.`, sq - c * x)] };
  }),
  T('binomial-square', 'pro', 'Squaring a bracket', '(x + a)² means (x + a)(x + a): every term meets every term, so the middle 2ax appears.', (r, s) => {
    const a = int(r, 2, 9), f = x => (x + a) ** 2, w = s ? x => x * x + a * a : f;
    return { q: `Expand (x + ${a})²`, answer: f, steps: [st(`(x + ${a})² = (x + ${a})(x + ${a})`, f), st(s ? `= x² + ${a * a}` : `= x² + ${a}x + ${a}x + ${a * a}`, f, w), st(s ? `So the answer is x² + ${a * a}.` : `= x² + ${2 * a}x + ${a * a}`, w)] };
  }),
  T('distribute-neg', 'pro', 'Minus before a bracket', 'A minus in front of a bracket flips the sign of everything inside.', (r, s) => {
    const a = int(r, 4, 9), b = int(r, 2, 9), f = x => a - (x - b), w = s ? x => a - x - b : f;
    return { q: `Simplify ${a} ${MINUS} (x ${MINUS} ${b})`, answer: f, steps: [st(s ? `Remove the brackets: ${a} ${MINUS} x ${MINUS} ${b}` : `Remove the brackets: ${a} ${MINUS} x + ${b}`, f, w), st(`= ${N(s ? a - b : a + b)} ${MINUS} x`, w)] };
  }),
  T('solve-linear', 'pro', 'Solving an equation', 'To undo + 5, subtract 5 from both sides.', (r, s) => {
    const a = int(r, 2, 6), x = int(r, 2, 9), b = int(r, 2, 9), c = a * x + b, rhs = s ? c + b : c - b;
    return { q: `Solve ${a}x + ${b} = ${c}`, answer: x, steps: [st(s ? `${a}x = ${c} + ${b} = ${rhs}` : `${a}x = ${c} ${MINUS} ${b} = ${rhs}`, c - b, rhs), st(`x = ${rhs} ${DIV} ${a} = ${F(rhs, a)}`, rhs / a, rhs / a, true)] };
  }),
  T('power-product', 'pro', 'Multiplying powers', 'Same base, multiplying: ADD the powers.', (r, s) => {
    let b, m, n; do { b = int(r, 2, 3); m = int(r, 2, 4); n = int(r, 2, 4); } while (m * n === m + n);
    const e = s ? m * n : m + n;
    return { q: `${b}^${m} ${TIMES} ${b}^${n}`, answer: b ** (m + n), steps: [st(s ? `Multiply the powers: ${b}^${e}` : `Add the powers: ${b}^${e}`, m + n, e), st(`${b}^${e} = ${b ** e}`, b ** e)] };
  }),
  T('power-power', 'pro', 'Power of a power', 'A power of a power MULTIPLIES the powers.', (r, s) => {
    let b, m, n; do { b = 2; m = int(r, 2, 4); n = int(r, 2, 3); } while (m * n === m + n);
    const e = s ? m + n : m * n;
    return { q: `(${b}^${m})^${n}`, answer: b ** (m * n), steps: [st(s ? `Add the powers: ${b}^${e}` : `Multiply the powers: ${b}^${e}`, m * n, e), st(`${b}^${e} = ${b ** e}`, b ** e)] };
  }),
  T('zero-power', 'pro', 'The zero power', 'Anything (except 0) to the power 0 is 1: a number divided by itself.', (r, s) => {
    const b = int(r, 2, 9), k = int(r, 2, 5), w = s ? 0 : 1;
    return { q: `${b}^${k} ${DIV} ${b}^${k}`, answer: 1, steps: [st(`Subtract the powers: ${b}^${k} ${DIV} ${b}^${k} = ${b}^0`, 0), st(`${b}^0 = ${w}`, 1, w)] };
  }),
  T('percent-of-percent', 'pro', 'Discount on a discount', 'The second discount is a percent of the NEW price, so the percents do not simply add.', (r, s) => {
    const [p, q] = shuffle(r, [10, 20, 25, 50]).slice(0, 2), honest = ((100 - q) * (100 - p)) / 100, w = s ? 100 - p - q : honest;
    return { q: `${p}% off, then ${q}% off. Total discount?`, answer: 100 - honest, steps: [st(`After ${p}% off you pay ${100 - p}%.`, 100 - p), st(s ? `Then ${q}% more off: you pay ${N(w)}%.` : `Then ${q}% off that: ${100 - q}% of ${100 - p}% = ${N(w)}%.`, honest, w), st(`So the total discount is ${N(100 - w)}%.`, 100 - w)] };
  }),
  T('up-down', 'pro', 'Up then down', 'A percent down is taken from the NEW, bigger price, so it does not undo the rise.', (r, s) => {
    const P = 20 * int(r, 2, 10), pc = pick(r, [10, 20, 25, 50]), up = (P * (100 + pc)) / 100, honest = (up * (100 - pc)) / 100, w = s ? P : honest;
    return { q: `${P} goes up ${pc}%, then down ${pc}%`, answer: honest, steps: [st(`Up ${pc}%: ${P} becomes ${N(up)}.`, up), st(s ? `Down ${pc}% undoes it: back to ${N(w)}.` : `Down ${pc}% of ${N(up)}: ${N(w)}.`, honest, w)] };
  }),
  T('percent-decimal', 'pro', 'Percent as a decimal', 'Percent means out of 100: divide by 100, two places.', (r, s) => {
    let p; do { p = int(r, 11, 49); } while (p % 10 === 0);
    const n = 20 * int(r, 1, 10), w = s ? p / 10 : p / 100;
    return { q: `${p}% of ${n}`, answer: (p * n) / 100, steps: [st(`${p}% = ${N(w)}`, p / 100, w), st(`${N(w)} ${TIMES} ${n} = ${N(w * n)}`, w * n)] };
  }),
  T('power-first', 'pro', 'Powers before multiplying', 'Powers come before multiplying: square only the number it sits on.', (r, s) => {
    let a, b; do { a = int(r, 2, 5); b = int(r, 2, 5); } while (a === b);
    const first = s ? a * b : b * b, v = s ? (a * b) ** 2 : a * b * b;
    return { q: `${a} ${TIMES} ${b}²`, answer: a * b * b, steps: [st(s ? `${a} ${TIMES} ${b} = ${first} first.` : `${b}² = ${first} first.`, b * b, first), st(s ? `${first}² = ${v}.` : `${a} ${TIMES} ${first} = ${v}.`, v)] };
  }),
  T('minus-negative', 'pro', 'Subtracting a negative', 'Taking away a negative is the same as adding.', (r, s) => {
    const a = int(r, 3, 9), b = int(r, 2, 9), w = s ? -b : b;
    return { q: `${a} ${MINUS} (${MINUS}${b})`, answer: a + b, steps: [st(s ? `The minuses cancel out to minus: ${a} ${MINUS} ${b}` : `Minus a negative is plus: ${a} + ${b}`, b, w, true), st(`= ${N(a + w)}`, a + w)] };
  }),
  T('frac-divide', 'pro', 'Dividing fractions', 'To divide by a fraction, flip it and multiply.', (r, s) => {
    const n = int(r, 1, 5), d = int(r, n + 1, 8), k = int(r, 2, 5), w = s ? 1 / k : k;
    return { q: `${n}/${d} ${DIV} 1/${k}`, answer: (n * k) / d, steps: [st(s ? `Multiply straight across: ${TIMES} 1/${k}` : `Flip the second and multiply: ${TIMES} ${k}/1`, k, w, true), st(`${n}/${d} ${TIMES} ${s ? `1/${k}` : k} = ${s ? F(n, d * k) : F(n * k, d)}`, (n / d) * w, (n / d) * w, true)] };
  }),
  T('root-sum', 'pro', 'Square root of a sum', 'The square root of a sum is not the sum of the square roots: add first, then take the root.', (r, s) => {
    const [a, b, c] = pick(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]]), w = s ? a + b : a * a + b * b;
    return { q: `√(${a * a} + ${b * b})`, answer: c, steps: [st(s ? `√${a * a} + √${b * b} = ${a} + ${b} = ${w}` : `${a * a} + ${b * b} = ${w}`, a * a + b * b, w), st(s ? `So it is ${w}.` : `√${w} = ${c}`, s ? w : Math.sqrt(w))] };
  }),
  T('like-terms', 'pro', 'Collecting like terms', 'Only like terms combine: x terms with x terms, plain numbers with plain numbers.', (r, s) => {
    const a = int(r, 2, 7), c = int(r, 2, 9), b = int(r, 2, 7), f = x => (a + b) * x + c, w = s ? x => (a + c) * x + b * x : f;
    return { q: `Simplify ${a}x + ${c} + ${b}x`, answer: f, steps: [st(s ? `${a}x + ${c} = ${a + c}x, so ${a + c}x + ${b}x` : `Group the x terms: ${a}x + ${b}x + ${c}`, f, w), st(s ? `= ${a + b + c}x` : `= ${a + b}x + ${c}`, w)] };
  }),
  T('mean', 'pro', 'The mean', 'Divide the total by how many numbers there are.', (r, s) => {
    let v; do { v = [int(r, 4, 30), int(r, 4, 30), int(r, 4, 30)]; } while ((v[0] + v[1] + v[2]) % 6);
    const S = v[0] + v[1] + v[2], w = s ? S / 2 : S / 3;
    return { q: `Mean of ${v.join(', ')}`, answer: S / 3, steps: [st(`Total: ${v.join(' + ')} = ${S}.`, S), st(s ? `Divide by 2: ${N(w)}.` : `Divide by 3: ${N(w)}.`, S / 3, w)] };
  }),
  T('neg-divide', 'pro', 'Dividing by a negative', 'Dividing by a negative flips the sign of the answer.', (r, s) => {
    const k = int(r, 2, 9), x0 = int(r, 2, 9), m = k * x0, w = s ? x0 : -x0;
    return { q: `Solve ${MINUS}${k}x = ${m}`, answer: -x0, steps: [st(`Divide both sides by ${N(-k)}.`, -k), st(`x = ${m} ${DIV} (${N(-k)}) = ${N(w)}`, -x0, w)] };
  }),
  T('slope', 'pro', 'Slope', 'Slope is rise over run: up and down on top.', (r, s) => {
    let x1, y1, U, Rr; do { x1 = int(r, 0, 5); y1 = int(r, 0, 5); U = int(r, 1, 6); Rr = int(r, 1, 9); } while (U === Rr);
    const x2 = x1 + U, y2 = y1 + Rr, w = s ? U / Rr : Rr / U;
    return { q: `Slope from (${x1}, ${y1}) to (${x2}, ${y2})`, answer: Rr / U, steps: [st(`Rise: ${y2} ${MINUS} ${y1} = ${Rr}.`, Rr), st(`Run: ${x2} ${MINUS} ${x1} = ${U}.`, U), st(s ? `Slope = run ${DIV} rise = ${F(U, Rr)}.` : `Slope = rise ${DIV} run = ${F(Rr, U)}.`, Rr / U, w, true)] };
  })
];

/* ---------- Rounds ---------- */
/* A round: a template, its steps (slip or clean), the index of the wrong step (-1 when all are right),
   and three coaching tips (the fix plus two from other templates at the same level) */
export function makeRound(r, lv, { clean = r() < 0.25, avoid = [] } = {}) {
  const pool = BANK.filter(t => t.lv === lv);
  const fresh = pool.filter(t => !avoid.includes(t.id));
  const tpl = pick(r, fresh.length ? fresh : pool);
  const seed = Math.floor(r() * 2 ** 31);
  const right = tpl.gen(rng(seed), false), slipped = tpl.gen(rng(seed), true);
  const work = clean ? right : slipped;
  const wrongAt = clean ? -1 : work.steps.findIndex(s => !same(s.honest, s.wrote));
  const others = shuffle(r, pool.filter(t => t.id !== tpl.id && t.fix !== tpl.fix)).slice(0, 2).map(t => t.fix);
  return { tpl, q: work.q, steps: work.steps, right: right.steps, wrongAt, tips: shuffle(r, [tpl.fix, ...others]), fix: tpl.fix };
}

/* ---------- Belts ---------- */
export const BELTS = [
  { id: 'white', name: 'White belt' }, { id: 'yellow', name: 'Yellow belt' }, { id: 'orange', name: 'Orange belt' },
  { id: 'green', name: 'Green belt' }, { id: 'blue', name: 'Blue belt' }, { id: 'brown', name: 'Brown belt' }, { id: 'black', name: 'Black belt' }
];
export const PER_BELT = 4;
export const beltOf = points => { const i = Math.min(BELTS.length - 1, Math.floor(points / PER_BELT)); return { ...BELTS[i], index: i, into: i === BELTS.length - 1 ? PER_BELT : points % PER_BELT }; };
