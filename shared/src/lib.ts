/* Shared helpers for problem generators: randomness, number theory and formatting (moved from js/lib.js, openspec
   change react-typescript task 3.1; js/lib.js re-exports this file for the Legacy views). */

export const ri = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));
export const rnz = (a: number, b: number): number => { let v = 0; while (v === 0) v = ri(a, b); return v; };
export const pick = <const T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;
export const shuffle = <T>(arr: readonly T[]): T[] => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j] as T, a[i] as T]; } return a; };
export const gcd = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const lcm = (a: number, b: number): number => Math.abs(a * b) / gcd(a, b);
export const isPrime = (n: number): boolean => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
export const factors = (n: number): number[] => { const f: number[] = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f; };
export const round = (x: number, d = 2): number => Math.round(x * 10 ** d) / 10 ** d;
export const fmtNum = (x: number): string => {
  if (Number.isInteger(x)) return Math.abs(x) >= 10000 ? x.toLocaleString('en-US') : String(x);
  return String(round(x, 6));
};
export const neg = (x: number): string => (x < 0 ? `&minus;${fmtNum(-x)}` : fmtNum(x));
export const paren = (x: number): string => (x < 0 ? `(${neg(x)})` : neg(x));

/* Fractions */
export const simp = (n: number, d: number): [number, number] => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return [n / g, d / g]; };
export const fr = (n: number, d: number): string => {
  [n, d] = simp(n, d);
  if (d === 1) return neg(n);
  const s = n < 0 ? '&minus;' : '';
  return `${s}<span class="fr"><span>${Math.abs(n)}</span><span>${d}</span></span>`;
};
export const frRaw = (n: number | string, d: number | string): string => `<span class="fr"><span>${n}</span><span>${d}</span></span>`;
export const mixed = (n: number, d: number): string => {
  [n, d] = simp(n, d);
  if (d === 1 || Math.abs(n) < d) return fr(n, d);
  const w = Math.trunc(n / d), r = Math.abs(n % d);
  return `${neg(w)}&#8202;${frRaw(r, d)}`;
};
export const fracText = (n: number, d: number): string => { [n, d] = simp(n, d); return d === 1 ? String(n) : `${n}/${d}`; };

/* Algebra formatting: terms like 3x², −x, + 5 */
export const sup = (e: number | string): string => `<sup>${e}</sup>`;
export function term(c: number, v = 'x', p = 1, first = false): string {
  if (c === 0) return '';
  const sign = c < 0 ? (first ? '&minus;' : ' &minus; ') : (first ? '' : ' + ');
  const a = Math.abs(c);
  const vv = p === 0 ? '' : p === 1 ? `<i>${v}</i>` : `<i>${v}</i>${sup(p)}`;
  const cc = (a === 1 && p !== 0) ? '' : fmtNum(a);
  return sign + cc + vv;
}
/* poly([a, b, c]) -> ax² + bx + c (highest power first) */
export function poly(coeffs: readonly number[], v = 'x'): string {
  const n = coeffs.length - 1; let s = '', first = true;
  coeffs.forEach((c, i) => { const t = term(c, v, n - i, first); if (t) { s += t; first = false; } });
  return s || '0';
}
/* Same as poly but as plain text for answers: 3x^2 - 2x + 1 */
export function polyText(coeffs: readonly number[], v = 'x'): string {
  const n = coeffs.length - 1; let s = '';
  coeffs.forEach((c, i) => {
    if (c === 0) return; const p = n - i, a = Math.abs(c);
    const body = (a === 1 && p !== 0 ? '' : String(round(a, 6))) + (p === 0 ? '' : p === 1 ? v : `${v}^${p}`);
    s += s ? (c < 0 ? ' - ' : ' + ') + body : (c < 0 ? '-' : '') + body;
  });
  return s || '0';
}
export const sq = (s: number | string): string => `&radic;<span class="ov">${s}</span>`;
export const times = '&times;', divide = '&divide;', minus = '&minus;';

/* Simplify sqrt(n) = a√b */
export function simpRoot(n: number): [number, number] { let a = 1, b = n; for (let k = Math.floor(Math.sqrt(n)); k > 1; k--) if (b % (k * k) === 0) { a *= k; b /= k * k; break; } return [a, b]; }
export const rootHtml = (a: number, b: number): string => b === 1 ? String(a) : `${a === 1 ? '' : a}${sq(b)}`;
export const rootText = (a: number, b: number): string => b === 1 ? String(a) : `${a === 1 ? '' : a}sqrt(${b})`;

/* 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 101st, 111th */
export const ordinal = (n: number): string => { const a = Math.abs(n) % 100, b = a % 10; return `${n}${a >= 11 && a <= 13 ? 'th' : b === 1 ? 'st' : b === 2 ? 'nd' : b === 3 ? 'rd' : 'th'}`; };
/* A denominator's plural name, as the read-aloud voice says it (js/voice.js denomWord): 3 thirds, 4 fourths, 12 twelfths */
export const denomName = (d: number): string => ['', 'wholes', 'halves', 'thirds', 'fourths', 'fifths', 'sixths', 'sevenths', 'eighths', 'ninths', 'tenths', 'elevenths', 'twelfths'][d] || `${d}ths`;
export const nameNum = (n: number): string => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);
export const PEOPLE = ['Maya', 'Leo', 'Aria', 'Kai', 'Zoe', 'Ravi', 'Nia', 'Sam', 'Ivy', 'Omar', 'Lena', 'Theo'];
export const THINGS = ['apples', 'stickers', 'marbles', 'shells', 'cards', 'stars', 'beads', 'pencils', 'cookies', 'blocks'];
