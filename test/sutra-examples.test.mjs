/* Worked examples in the sutra deep dives (js/sutra-details.js, openspec change sutra-examples).
   Every sutra and sub-sutra has at least three examples, and every example's result (the text in hl())
   is checked here with exact arithmetic: BigInt, exact fractions, or polynomials evaluated at many points. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { DETAILS } from '../js/sutra-details.js';
import { SUTRAS, SUBSUTRAS } from '../js/sutras.js';

/* ---------- reading the HTML ---------- */
const text = html => html
  .replace(/<span class="fr"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '($1)/($2)')
  .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const hls = html => [...html.matchAll(/<b class="hl hl-\w+">(.*?)<\/b>/g)].map(m => text(m[1]));

/* ---------- exact arithmetic ---------- */
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const F = (n, d = 1n) => { n = BigInt(n); d = BigInt(d); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a, b) => F(a.n * b.n, a.d * b.d);
const inv = a => F(a.d, a.n);
const eq = (a, b) => a.n * b.d === b.n * a.d;
const sq = n => BigInt(n) ** 2n;
const digitRoot = n => { n = BigInt(n) % 9n; return n; };
/* Polynomials as functions: two expressions are equal when they agree at many points */
const PTS = [-7, -3, -2, -1, 0, 1, 2, 3, 5, 11, 13];
const same1 = (f, g) => PTS.every(x => f(BigInt(x)) === g(BigInt(x)));
const same3 = (f, g) => PTS.every(x => PTS.slice(0, 6).every(y => [1, -4, 9].every(z => f(BigInt(x), BigInt(y), BigInt(z)) === g(BigInt(x), BigInt(y), BigInt(z)))));
/* The repeating block of 1/d as a string of digits, and its length */
const period = d => { let r = 1, s = ''; const seen = new Map(); while (!seen.has(r)) { seen.set(r, s.length); r *= 10; s += Math.floor(r / d); r %= d; } return s.slice(seen.get(r)); };
const decimal = (num, d, n) => { let r = num % d, s = ''; for (let i = 0; i < n; i++) { r *= 10; s += Math.floor(r / d); r %= d; } return s; };
const remainders = (d, n) => { const out = []; let r = 1; for (let i = 0; i < n; i++) { r = (r * 10) % d; out.push(r); } return out; };

/* ---------- the table: [question, result in hl(), check] per sutra, in order ---------- */
const X = {
  'Ekādhikena Pūrveṇa': [
    ['25²', '625', () => sq(25) === 625n && 2 * 3 === 6],
    ['65²', '4225', () => sq(65) === 4225n],
    ['115²', '13225', () => sq(115) === 13225n],
    ['1/19', '0.052631578947368421…', () => period(19) === '052631578947368421' && (period(19) + period(19)).includes('789473684210526315')]],
  'Nikhilaṃ Navataścaramaṃ Daśataḥ': [
    ['100 − 43', '57', () => 100 - 43 === 57],
    ['1000 − 368', '632', () => 1000 - 368 === 632],
    ['$100 − $47.35 change', '$52.65', () => 10000 - 4735 === 5265],
    ['97 × 94 (near 100)', '9118', () => 97 * 94 === 9118 && 97 - 6 === 91 && 3 * 6 === 18]],
  'Ūrdhva-Tiryagbhyām': [
    ['12 × 13', '156', () => 12 * 13 === 156],
    ['23 × 41', '943', () => 23 * 41 === 943],
    ['123 × 321', '39483', () => 123 * 321 === 39483 && 1 * 1 + 2 * 2 + 3 * 3 === 14],
    ['(2x + 3)(x + 4)', '2x² + 11x + 12', () => same1(x => (2n * x + 3n) * (x + 4n), x => 2n * x * x + 11n * x + 12n)]],
  'Parāvartya Yojayet': [
    ['x + 5 = 12', 'x = 7', () => 7 + 5 === 12],
    ['3x + 4 = x + 10', 'x = 3', () => 3 * 3 + 4 === 3 + 10],
    ['7x − 5 = 2x + 20', '5', () => 7 * 5 - 5 === 2 * 5 + 20],
    ['1452 ÷ 12', '121', () => 12 * 121 === 1452 && 4 + 1 * -2 === 2 && 5 + 2 * -2 === 1 && 2 + 1 * -2 === 0]],
  'Śūnyaṃ Sāmyasamuccaye': [
    ['12x + 3x = 4x + 5x', 'x = 0', () => 12 * 0 + 3 * 0 === 4 * 0 + 5 * 0 && 15 !== 9],
    ['(x + 3)(x + 8) = (x + 4)(x + 6)', 'x = 0', () => 3 * 8 === 4 * 6 && (0 + 3) * (0 + 8) === (0 + 4) * (0 + 6) && 11 !== 10],
    ['(3x + 4)/(6x + 7) = (x + 1)/(2x + 3)', 'x = −5/4', () => { const x = F(-5, 4), l = (a, b) => add(mul(F(a), x), F(b)); return eq(mul(l(3, 4), inv(l(6, 7))), mul(l(1, 1), inv(l(2, 3)))); }]],
  '(Ānurūpye) Śūnyamanyat': [
    ['3x + 5y = 10, 7x + 15y = 30', 'y = 2', () => 3 * 0 + 5 * 2 === 10 && 7 * 0 + 15 * 2 === 30],
    ['4x + 5y = 12, 7x + 10y = 21', 'x = 3', () => 4 * 3 + 5 * 0 === 12 && 7 * 3 + 10 * 0 === 21],
    ['6x + 7y = 8, 19x + 14y = 16', 'x = 0', () => { const y = F(8, 7); return eq(mul(F(7), y), F(8)) && eq(mul(F(14), y), F(16)); }]],
  'Saṅkalana-Vyavakalanābhyām': [
    ['x + y = 10, x − y = 4', 'x = 7, y = 3', () => 7 + 3 === 10 && 7 - 3 === 4],
    ['5x + 3y = 13, 3x + 5y = 11', 'x = 2, y = 1', () => 5 * 2 + 3 * 1 === 13 && 3 * 2 + 5 * 1 === 11],
    ['45x − 23y = 113, 23x − 45y = 91', 'x = 2, y = −1', () => 45 * 2 - 23 * -1 === 113 && 23 * 2 - 45 * -1 === 91]],
  'Pūraṇāpūraṇābhyām': [
    ['x² + 4x = 12', 'x = 2 or −6', () => [2, -6].every(x => x * x + 4 * x === 12)],
    ['x² + 6x = 7', 'x = 1 or −7', () => [1, -7].every(x => x * x + 6 * x === 7)],
    ['x³ + 6x² + 12x = 19', 'x = 1', () => 1 + 6 + 12 === 19 && same1(x => x ** 3n + 6n * x * x + 12n * x + 8n, x => (x + 2n) ** 3n)]],
  'Calana-Kalanābhyām': [
    ['6² from 5²', '36', () => 25 + 2 * 5 + 1 === 36],
    ['How fast x² grows', '2x + 1', () => same1(x => (x + 1n) ** 2n - x * x, x => 2n * x + 1n)],
    ['x² − 5x + 6 = 0', 'x = 3 or 2', () => [3, 2].every(x => x * x - 5 * x + 6 === 0) && 25 - 24 === 1],
    ['x² − 7x + 10 = 0', 'x = 5 or 2', () => [5, 2].every(x => x * x - 7 * x + 10 === 0) && 49 - 40 === 9]],
  'Yāvadūnam': [
    ['9² (base 10)', '81', () => sq(9) === 81n],
    ['96²', '9216', () => sq(96) === 9216n],
    ['993²', '986049', () => sq(993) === 986049n]],
  'Vyaṣṭisamaṣṭiḥ': [
    ['9 × 11', '99', () => 9 * 11 === 99],
    ['48 × 52', '2496', () => 48 * 52 === 2496],
    ['97 × 103', '9991', () => 97 * 103 === 9991],
    ['Two numbers add to 20, multiply to 96', '8 and 12', () => 8 + 12 === 20 && 8 * 12 === 96]],
  'Śeṣāṇyaṅkena Carameṇa': [
    ['1/3', '0.333…', () => decimal(1, 3, 3) === '333' && remainders(3, 3).every(r => r === 1)],
    ['1/7', '0.142857…', () => period(7) === '142857' && remainders(7, 6).join() === '3,2,6,4,5,1' && remainders(7, 6).map(r => (r * 7) % 10).join('') === '142857'],
    ['1/7 again', '6 digits', () => period(7).length === 6],
    ['1/13', '0.076923…', () => period(13) === '076923' && remainders(13, 6).join() === '10,9,12,3,4,1' && remainders(13, 6).map(r => (r * 13) % 10).join('') === '076923']],
  'Sopāntyadvayamantyam': (() => {
    /* 1/(AB) + 1/(AC) = 1/(AD) + 1/(BC) with A, B, C, D = x + a, x + a + s, x + a + 2s, x + a + 3s */
    const holds = (a, s, x) => { const [A, B, C, D] = [0, 1, 2, 3].map(k => add(x, F(a + k * s))); const r = (p, q) => inv(mul(p, q)); return eq(add(r(A, B), r(A, C)), add(r(A, D), r(B, C))); };
    return [
      ['(1)/((x+1)(x+2)) + (1)/((x+1)(x+3)) = (1)/((x+1)(x+4)) + (1)/((x+2)(x+3))', 'x = −10/3', () => holds(1, 1, F(-10, 3))],
      ['(1)/((x+2)(x+3)) + (1)/((x+2)(x+4)) = (1)/((x+2)(x+5)) + (1)/((x+3)(x+4))', 'x = −13/3', () => holds(2, 1, F(-13, 3))],
      ['(1)/((x+1)(x+3)) + (1)/((x+1)(x+5)) = (1)/((x+1)(x+7)) + (1)/((x+3)(x+5))', 'x = −17/3', () => holds(1, 2, F(-17, 3))]];
  })(),
  'Ekanyūnena Pūrveṇa': [
    ['8 × 9', '72', () => 8 * 9 === 72],
    ['67 × 99', '6633', () => 67 * 99 === 6633],
    ['357 × 999', '356643', () => 357 * 999 === 356643]],
  'Guṇitasamuccayaḥ': [
    ['12 × 3 = 36?', 'Passes', () => 12 * 3 === 36 && digitRoot(3n * 3n) === digitRoot(36)],
    ['47 × 23 = 1081?', 'Passes', () => 47 * 23 === 1081 && digitRoot(2n * 5n) === digitRoot(1081)],
    ['47 × 23 = 1071?', 'Caught the mistake', () => 47 * 23 !== 1071 && digitRoot(1071) === 0n && digitRoot(2n * 5n) === 1n]],
  'Guṇakasamuccayaḥ': [
    ['x² + 5x + 6 = (x + 2)(x + 3)?', 'correct', () => same1(x => x * x + 5n * x + 6n, x => (x + 2n) * (x + 3n)) && 1 + 5 + 6 === 3 * 4],
    ['x² + 5x + 6 = (x + 1)(x + 6)?', 'wrong', () => !same1(x => x * x + 5n * x + 6n, x => (x + 1n) * (x + 6n)) && 2 * 7 !== 12],
    ['x² − x − 6 = (x − 3)(x + 2)?', 'correct', () => same1(x => x * x - x - 6n, x => (x - 3n) * (x + 2n)) && 1 - 1 - 6 === (1 - 3) * (1 + 2)]],
  'Ānurūpyeṇa': [
    ['5 × 18', '90', () => 5 * 18 === 90 && 18 * 10 / 2 === 90],
    ['36 × 25', '900', () => 36 * 25 === 900],
    ['21 × 23 (working base 20)', '483', () => 21 * 23 === 483 && (21 + 3) * 2 * 10 + 1 * 3 === 483],
    ['46 × 43 (working base 50)', '1978', () => 46 * 43 === 1978 && (46 - 7) * 5 * 10 + (-4) * (-7) === 1978]],
  'Śiṣyate Śeṣasaṃjñaḥ': [
    ['1234 ÷ 9: what is left over?', '1', () => 1234 % 9 === 1 && [10, 100, 1000].every(p => p % 9 === 1)],
    ['10ⁿ divided by 9', '1', () => [1n, 2n, 3n, 10n, 25n].every(n => 10n ** n % 9n === 1n)],
    ['Powers of 10 divided by 7', 'a cycle of 6', () => [0, 1, 2, 3, 4, 5, 6].map(n => 10n ** BigInt(n) % 7n).join() === '1,3,2,6,4,5,1']],
  'Ādyamādyenāntyamantyena': [
    ['x² + 5x + 6', '(x + 2)(x + 3)', () => same1(x => x * x + 5n * x + 6n, x => (x + 2n) * (x + 3n))],
    ['2x² + 7x + 6', '(2x + 3)(x + 2)', () => same1(x => 2n * x * x + 7n * x + 6n, x => (2n * x + 3n) * (x + 2n))],
    ['3x² + 10x + 8', '(3x + 4)(x + 2)', () => same1(x => 3n * x * x + 10n * x + 8n, x => (3n * x + 4n) * (x + 2n))],
    ['6x² + 13x + 6', '(2x + 3)(3x + 2)', () => same1(x => 6n * x * x + 13n * x + 6n, x => (2n * x + 3n) * (3n * x + 2n))]],
  'Kevalaiḥ Saptakaṃ Guṇyāt': [
    ['7 × 143', '1001', () => 7 * 143 === 1001 && 7 * 140 === 980],
    ['143 × 999', '142857', () => 143 * 999 === 142857 && period(7) === '142857'],
    ['2/7, 3/7 …', '285714', () => decimal(2, 7, 6) === '285714' && decimal(3, 7, 6) === '428571']],
  'Veṣṭanam': (() => {
    const osc = d => { for (let k = 1; k < 10; k++) if ((d * k + 1) % 10 === 0) return (d * k + 1) / 10; };
    const step = (n, o) => Math.floor(n / 10) + (n % 10) * o;
    return [
      ['Osculators', '5', () => osc(7) === 5 && osc(13) === 4 && osc(19) === 2 && osc(29) === 3],
      ['Is 91 divisible by 7?', 'yes', () => 91 % 7 === 0 && 91 === 7 * 13 && step(91, 5) === 14],
      ['Is 3192 divisible by 7?', 'yes', () => 3192 === 7 * 456 && step(3192, 5) === 329 && step(329, 5) === 77],
      ['Is 1729 divisible by 13?', 'yes', () => 1729 === 13 * 133 && step(1729, 4) === 208 && step(208, 4) === 52 && 52 === 13 * 4]];
  })(),
  'Yāvadūnaṃ Tāvadūnam': [
    ['8² (base 10)', '64', () => sq(8) === 64n],
    ['97²', '9409', () => sq(97) === 9409n],
    ['988²', '976144', () => sq(988) === 976144n && 988 - 12 === 976 && 12 * 12 === 144]],
  'Yāvadūnaṃ Tāvadūnīkṛtya Vargaṃ ca Yojayet': [
    ['7² (base 10)', '49', () => sq(7) === 49n && (7 - 3) * 10 + 9 === 49],
    ['98²', '9604', () => sq(98) === 9604n],
    ['104²', '10816', () => sq(104) === 10816n],
    ['1012²', '1024144', () => sq(1012) === 1024144n]],
  "Antyayordaśake'pi": [
    ['14 × 16', '224', () => 14 * 16 === 224 && 4 + 6 === 10],
    ['43 × 47', '2021', () => 43 * 47 === 2021],
    ['51 × 59', '3009', () => 51 * 59 === 3009],
    ['62 × 68', '4216', () => 62 * 68 === 4216],
    ['104 × 106', '11024', () => 104 * 106 === 11024]],
  'Antyayoreva': (() => {
    /* Each equation N/D = n/d with N = x·n + a and D = x·d + b, so it reduces to n/d = a/b */
    const at = (x, ...c) => c.reduce((s, k) => add(mul(s, x), F(k)), F(0));
    const solves = (N, D, n, d, x) => eq(mul(at(x, ...N), inv(at(x, ...D))), mul(at(x, ...n), inv(at(x, ...d))));
    const reduces = (N, D, n, d, a, b) => same1(x => { const v = BigInt; const p = (c, t) => c.reduce((s, k) => s * t + v(k), 0n); return p(N, x) - (x * p(n, x) + v(a)) + p(D, x) - (x * p(d, x) + v(b)); }, () => 0n);
    return [
      ['(13)/(26) in lowest terms', '(1)/(2)', () => eq(F(13, 26), F(1, 2)) && eq(F(10, 20), F(3, 6))],
      ['(x² + x + 1)/(x² + 3x + 3) = (x + 1)/(x + 3)', 'x = 0', () => solves([1, 1, 1], [1, 3, 3], [1, 1], [1, 3], F(0)) && reduces([1, 1, 1], [1, 3, 3], [1, 1], [1, 3], 1, 3)],
      ['(x² + 2x + 1)/(x² + 5x + 2) = (x + 2)/(x + 5)', 'x = 1', () => solves([1, 2, 1], [1, 5, 2], [1, 2], [1, 5], F(1)) && reduces([1, 2, 1], [1, 5, 2], [1, 2], [1, 5], 1, 2)],
      ['(2x² + x + 1)/(3x² + x + 2) = (2x + 1)/(3x + 1)', 'x = −1', () => solves([2, 1, 1], [3, 1, 2], [2, 1], [3, 1], F(-1)) && reduces([2, 1, 1], [3, 1, 2], [2, 1], [3, 1], 1, 2)]];
  })(),
  'Samuccayaguṇitaḥ': [
    ['11 × 12 = 132', 'checks out', () => 11 * 12 === 132 && 2 * 3 === 1 + 3 + 2],
    ['(x + 4)(x + 5) = x² + 9x + 20', 'checks out', () => same1(x => (x + 4n) * (x + 5n), x => x * x + 9n * x + 20n) && 5 * 6 === 30],
    ['(x + 2)(x + 6) = x² + 8x + 8?', 'wrong', () => !same1(x => (x + 2n) * (x + 6n), x => x * x + 8n * x + 8n) && 3 * 7 !== 1 + 8 + 8 && 2 * 6 === 12],
    ['(2x + 3)(3x − 1) = 6x² + 7x − 3', 'checks out', () => same1(x => (2n * x + 3n) * (3n * x - 1n), x => 6n * x * x + 7n * x - 3n) && (2 + 3) * (3 - 1) === 6 + 7 - 3]],
  'Lopanasthāpanābhyām': [
    ['x² + y² + z² + 2xy + 2yz + 2zx', '(x + y + z)²', () => same3((x, y, z) => x * x + y * y + z * z + 2n * x * y + 2n * y * z + 2n * z * x, (x, y, z) => (x + y + z) ** 2n)],
    ['x² + 2y² + 3z² + 3xy + 5yz + 4zx', '(x + y + z)(x + 2y + 3z)', () => same3((x, y, z) => x * x + 2n * y * y + 3n * z * z + 3n * x * y + 5n * y * z + 4n * z * x, (x, y, z) => (x + y + z) * (x + 2n * y + 3n * z))],
    ['2x² + 6y² + 3z² + 7xy + 11yz + 7zx', '(x + 2y + 3z)(2x + 3y + z)', () => same3((x, y, z) => 2n * x * x + 6n * y * y + 3n * z * z + 7n * x * y + 11n * y * z + 7n * z * x, (x, y, z) => (x + 2n * y + 3n * z) * (2n * x + 3n * y + z))]],
  'Vilokanam': [
    ['√625', '25', () => sq(25) === 625n],
    ['√1849', '43', () => sq(43) === 1849n && sq(45) === 2025n],
    ['∛50653', '37', () => 37n ** 3n === 50653n],
    ['x + 1/x = 10/3', 'x = 3 or 1/3', () => [F(3), F(1, 3)].every(x => eq(add(x, inv(x)), F(10, 3)))]],
  'Guṇitasamuccayaḥ Samuccayaguṇitaḥ': [
    ['12 × 12 = 144', 'correct', () => 12 * 12 === 144 && 3 * 3 === 1 + 4 + 4],
    ['(2x + 1)(x + 3) = 2x² + 7x + 3', 'correct', () => same1(x => (2n * x + 1n) * (x + 3n), x => 2n * x * x + 7n * x + 3n)],
    ['(x + 1)(x + 2)(x + 3) = x³ + 6x² + 11x + 6', 'correct', () => same1(x => (x + 1n) * (x + 2n) * (x + 3n), x => x ** 3n + 6n * x * x + 11n * x + 6n)]],
};

const NAMES = [...SUTRAS, ...SUBSUTRAS].map(c => c.name);

test('every sutra and sub-sutra has at least three worked examples', () => {
  assert.equal(NAMES.length, 29);
  for (const name of NAMES) assert.ok(DETAILS[name]?.examples.length >= 3, `${name} has ${DETAILS[name]?.examples.length} examples`);
});

test('every worked example is in the checked table, in order, with its result in hl()', () => {
  assert.deepEqual(Object.keys(X).sort(), Object.keys(DETAILS).sort());
  for (const [name, d] of Object.entries(DETAILS)) {
    const want = X[name];
    assert.deepEqual(d.examples.map(([q]) => text(q)), want.map(([q]) => q), `${name}: questions`);
    d.examples.forEach(([, a], i) => {
      const got = hls(a);
      assert.ok(got.length >= 1, `${name} example ${i + 1} has no result in hl()`);
      assert.ok(got.includes(want[i][1]), `${name} example ${i + 1}: hl() shows ${JSON.stringify(got)}, expected ${want[i][1]}`);
    });
  }
});

test('every worked example is mathematically correct', () => {
  for (const [name, rows] of Object.entries(X)) rows.forEach(([q, , check]) => assert.ok(check(), `${name}: ${q}`));
});

test('worked example text has no em dashes', () => {
  for (const [name, d] of Object.entries(DETAILS)) for (const [q, a] of d.examples) assert.ok(!/—/.test(q + a), `${name}: ${text(q)}`);
});
