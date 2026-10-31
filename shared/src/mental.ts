/* Mental arithmetic for the Pro Arena (openspec arena spec): five question families, each with a 20-step ladder
   from easy (d 1) to hard (d 20), always with a whole-number answer of at most 7 digits (the Arena keypad's limit).
   Questions draw from Math.random, so makeSet() can seed them for daily rounds. Moved from js/mental.js (openspec
   change react-typescript, task 3.1). */
import { ri, pick } from './lib.ts';

export type Family = 'mul2x2' | 'square' | 'percent' | 'nearBase' | 'divide';
export const FAMILIES: Family[] = ['mul2x2', 'square', 'percent', 'nearBase', 'divide'];
export const DMIN = 1, DMAX = 20;

/* A whole number from a to b that is not a multiple of 10 (those make products trivial) */
const rn = (a: number, b: number): number => { let v: number; do v = ri(a, b); while (v % 10 === 0); return v; };
/* Two numbers with the same tens digit whose units add up to 10 (the Ekadhikena product trick), tens from a to b */
const tensPair = (a: number, b: number): Pair => { const t = ri(a, b), u = ri(1, 9); return [t * 10 + u, t * 10 + 10 - u]; };
/* A number ending in 5, tens digit from a to b */
const five = (a: number, b: number): number => ri(a, b) * 10 + 5;

/* Each step returns the two factors. The ladder follows Times sprint (js/games.js timesQ) where they overlap:
   teens by teens, numbers times 11, then 2-digit by 2-digit products of growing size. */
type Pair = [number, number];
const MUL: (() => Pair)[] = [
  () => [rn(11, 15), 11], () => [rn(12, 19), rn(11, 13)], () => [rn(13, 19), rn(13, 19)], () => [rn(21, 39), 11],
  () => [rn(21, 29), rn(12, 19)], () => tensPair(2, 3), () => [rn(31, 49), rn(12, 19)], () => [rn(21, 29), rn(21, 29)],
  () => [rn(41, 69), rn(12, 19)], () => [rn(31, 49), rn(21, 29)], () => tensPair(4, 6), () => [rn(31, 49), rn(31, 49)],
  () => [rn(51, 79), rn(21, 39)], () => tensPair(7, 9), () => [rn(41, 69), rn(41, 69)], () => [rn(71, 99), rn(31, 49)],
  () => [rn(51, 79), rn(51, 79)], () => [rn(61, 89), rn(61, 89)], () => [rn(71, 99), rn(61, 89)], () => [rn(81, 99), rn(76, 99)]
];
/* Squares: endings in 5 and teens first, then every 2-digit number, then 3-digit numbers near 100 */
const SQ: (() => number)[] = [
  () => five(1, 3), () => rn(11, 19), () => five(4, 6), () => rn(21, 29), () => five(7, 9), () => rn(31, 39), () => rn(41, 49),
  () => rn(51, 59), () => rn(61, 69), () => rn(71, 79), () => rn(81, 89), () => rn(91, 99), () => rn(101, 109), () => five(11, 14),
  () => rn(111, 119), () => five(15, 19), () => rn(121, 139), () => rn(141, 169), () => five(20, 29), () => rn(171, 299)
];
/* Percents: [percent, n]. n is always a multiple that makes the answer whole. */
const PCT: (() => Pair)[] = [
  () => [pick([10, 50]), ri(2, 10) * 10], () => [pick([25, 50]), ri(3, 25) * 4], () => [20, ri(5, 40) * 5],
  () => [pick([10, 20, 30]), ri(10, 50) * 10], () => [5, ri(3, 25) * 20], () => [pick([40, 60, 70, 80]), ri(5, 30) * 10],
  () => [15, ri(5, 30) * 20], () => [75, ri(10, 60) * 4], () => [pick([12, 15]), ri(4, 30) * 100], () => [pick([35, 45]), ri(10, 50) * 20],
  () => [pick([2, 3]), ri(20, 90) * 100], () => [12.5, ri(20, 100) * 8], () => [pick([16, 24]), ri(10, 60) * 25], () => [pick([37.5, 62.5]), ri(20, 120) * 8],
  () => [pick([18, 22]), ri(10, 50) * 50], () => [pick([7, 9, 11]), ri(10, 60) * 100], () => [pick([2.5, 7.5]), ri(50, 250) * 40],
  () => [pick([17.5, 22.5]), ri(10, 50) * 40], () => [pick([13, 17, 19]), ri(20, 90) * 100], () => [pick([17.5, 27.5, 32.5, 37.5]), ri(15, 60) * 40]
];
/* Near-base products: [a, b], both close to 100 or 1000 but never the base itself */
const nb = (base: number, lo: number, hi: number): number => { let v: number; do v = base + ri(lo, hi); while (v === base); return v; };
const NEAR: (() => Pair)[] = [
  () => [nb(100, -4, -1), nb(100, -4, -1)], () => [nb(100, -9, -1), nb(100, -9, -1)], () => [nb(100, 1, 5), nb(100, 1, 5)],
  () => [nb(100, 1, 9), nb(100, 1, 9)], () => [nb(100, -12, -1), nb(100, -12, -1)], () => [nb(100, -9, -1), nb(100, 1, 9)],
  () => [nb(100, -15, -1), nb(100, -15, -1)], () => [nb(100, 10, 15), nb(100, 1, 9)], () => [nb(100, 11, 20), nb(100, 11, 20)],
  () => [nb(100, -15, -1), nb(100, 5, 20)], () => [nb(1000, -9, -1), nb(1000, -9, -1)], () => [nb(1000, 1, 9), nb(1000, 1, 9)],
  () => [nb(1000, -30, -1), nb(1000, -9, -1)], () => [nb(1000, -9, -1), nb(1000, 1, 9)], () => [nb(1000, 10, 30), nb(1000, 1, 9)],
  () => [nb(1000, -50, -1), nb(1000, -30, -1)], () => [nb(1000, -20, 20), nb(1000, -20, 20)], () => [nb(1000, 20, 60), nb(1000, 1, 40)],
  () => [nb(1000, -60, -10), nb(1000, 10, 60)], () => [nb(1000, -99, -1), nb(1000, 1, 99)]
];
/* Exact division: [divisor, quotient]; the question shows divisor x quotient divided by the divisor */
const DIV: (() => Pair)[] = [
  () => [ri(2, 5), ri(11, 25)], () => [ri(2, 5), ri(12, 49)], () => [ri(6, 9), ri(11, 29)], () => [ri(6, 9), ri(21, 99)],
  () => [11, ri(12, 49)], () => [ri(12, 15), ri(11, 30)], () => [ri(16, 25), ri(11, 40)], () => [ri(2, 9), ri(101, 199)],
  () => [ri(11, 19), ri(31, 99)], () => [25, ri(41, 199)], () => [ri(21, 39), ri(21, 60)], () => [ri(21, 49), ri(41, 99)],
  () => [ri(2, 9), ri(200, 999)], () => [ri(51, 99), ri(21, 99)], () => [ri(12, 19), ri(101, 299)], () => [ri(2, 9), ri(1001, 2999)],
  () => [ri(21, 39), ri(101, 299)], () => [ri(41, 99), ri(101, 199)], () => [ri(21, 49), ri(201, 499)], () => [ri(12, 49), ri(201, 999)]
];

const step = <T>(ladder: readonly (() => T)[], d: number): T => (ladder[Math.max(DMIN, Math.min(DMAX, Math.round(d))) - 1] as () => T)();
/* The Sutra card that answers a question in a line, from its own numbers (openspec change sutras-first, design "The
   Sutra map"), or null when none does: Antyayordaśake'pi (u8) for the same tens with units adding to 10, Ekādhikena
   Pūrveṇa (s1) for a square ending in 5, Yāvadūnam (s10) for a square within 20 of 100, Nikhilaṃ (s2) for products near
   a base, else Ūrdhva-Tiryagbhyām (s3) for products and squares. Percents and divisions name none. No Math.random here,
   so a seeded daily set is the same with or without it. */
export function sutraOfProduct(a: number, b: number): string {
  if (Math.floor(a / 10) === Math.floor(b / 10) && (a % 10) + (b % 10) === 10) return 'u8';
  return 's3';
}
export function sutraOfSquare(n: number): string {
  if (n % 10 === 5) return 's1';
  if (Math.abs(n - 100) <= 20) return 's10';
  return 's3';
}
type Made = { q: string; answer: number; sutra: string | null };
const MAKERS: Record<Family, (d: number) => Made> = {
  mul2x2: d => { const [a, b] = step(MUL, d); return { q: `${a} &times; ${b} = ?`, answer: a * b, sutra: sutraOfProduct(a, b) }; },
  square: d => { const n = step(SQ, d); return { q: `${n}<sup>2</sup> = ?`, answer: n * n, sutra: sutraOfSquare(n) }; },
  percent: d => { const [p, n] = step(PCT, d); return { q: `What is ${p}% of ${n}?`, answer: Math.round((p * 10 * n) / 1000), sutra: null }; },
  nearBase: d => { const [a, b] = step(NEAR, d); return { q: `${a} &times; ${b} = ?`, answer: a * b, sutra: 's2' }; },
  divide: d => { const [k, n] = step(DIV, d); return { q: `${k * n} &divide; ${k} = ?`, answer: n, sutra: null }; }
};

/* One question: { q (HTML), answer (whole number), sutra (a Sutra card id or null), family, d } */
export interface MentalQuestion { q: string; answer: number; sutra: string | null; family: Family; d: number }
export function mentalQ(family: string, d: number): MentalQuestion {
  const make = (MAKERS as Partial<Record<string, (d: number) => Made>>)[family]; if (!make) throw new Error('unknown family ' + family);
  const lv = Math.max(DMIN, Math.min(DMAX, Math.round(d)));
  return { ...make(lv), family: family as Family, d: lv };
}
