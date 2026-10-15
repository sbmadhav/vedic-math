/* How a right answer is written when it is revealed: Practice, Endless runs, Katas,
   "Watch me do one" and the challenge tower all use answerText(p, skill). */

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const minus = s => String(s).replace(/-/g, '&minus;');

/* The fraction n/d for a, by the smallest denominator that fits, or null */
function toFraction(a) {
  for (let d = 2; d < 5000; d++) { const n = Math.round(a * d); if (Math.abs(n / d - a) < 1e-9) return [n, d]; }
  return null;
}
/* 5/3 = 1 2/3; 3/8; -7/2 = -3 1/2 */
function fractionText(n, d) {
  const f = `${n}/${d}`;
  if (Math.abs(n) <= d) return minus(f);
  const w = Math.trunc(n / d), r = Math.abs(n % d);
  return minus(`${f} = ${w} ${r}/${d}`);
}
/* Should a non-whole answer be shown as a fraction? */
export const wantsFraction = (p, skill) => !p.asDecimal && !!(p.simplest || p.asFraction || (skill && skill.strand === 'frac'));

/* Algebra keys with real signs: one sign per gap, no 1 before a letter, spaced binary signs */
export function exprText(src) {
  let s = String(src)
    .replace(/\+\s*-/g, '-').replace(/-\s*-/g, '+').replace(/-\s*\+/g, '-').replace(/\+\s*\+/g, '+')
    .replace(/(^|[^\d.])1(?=[a-z])/g, '$1')
    .replace(/([\w)])\s*([+-])\s*/g, '$1 $2 ');
  s = esc(s).replace(/sqrt\(([^)]+)\)/g, '&radic;$1').replace(/\*/g, '');
  return minus(s);
}

export function answerText(p, skill) {
  if (p.kind === 'fields') return p.fields.map(f => `${f.label} = ${f.answer}`).join(', ');
  if (p.kind === 'set') return [...new Set(p.answer)].join(', ');
  if (p.kind === 'ineq') return `x ${{ '<': '&lt;', '>': '&gt;', '<=': '&le;', '>=': '&ge;' }[p.answer.op]} ${p.answer.val}`;
  if (p.kind === 'complex') return `${p.answer[0]} ${p.answer[1] < 0 ? '&minus;' : '+'} ${Math.abs(p.answer[1])}i`;
  if (p.kind === 'num') {
    const a = p.answer;
    if (!Number.isInteger(a) && wantsFraction(p, skill)) { const f = toFraction(a); if (f) return fractionText(f[0], f[1]); }
    return minus(String(Math.round(a * 1e6) / 1e6));
  }
  if (p.kind === 'expr') return exprText(p.answer);
  return esc(p.answer);
}
