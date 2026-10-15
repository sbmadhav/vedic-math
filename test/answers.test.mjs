/* Revealed answers (answers.js) and a sweep over every skill generator: each arithmetic problem's own
   shown answer must pass the plain-number rule, fraction skills reveal fractions, and algebra keys
   are written with real signs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { answerText, exprText } from '../js/answers.js';
import { SKILLS, byId, withPlain, isArithmetic } from '../js/skills/index.js';
import { kata, KATAS_PER_TRICK, seeded } from '../js/levels.js';
import { TRICKS } from '../js/vedic.js';
import { checkOne } from '../js/check.js';

const text = html => String(html).replace(/<[^>]+>/g, '').replace(/&minus;/g, '-').replace(/&radic;/g, 'sqrt').replace(/&[a-z]+;/g, ' ');
const frac = byId['4-fracadd'];

test('fraction answers are shown as fractions, with the mixed number above 1', () => {
  assert.equal(text(answerText({ kind: 'num', answer: 5 / 3 }, frac)), '5/3 = 1 2/3');
  assert.equal(text(answerText({ kind: 'num', answer: 3 / 8 }, byId['3-frac'])), '3/8');
  assert.equal(text(answerText({ kind: 'num', answer: -7 / 2, simplest: true }, null)), '-7/2 = -3 1/2');
  assert.equal(text(answerText({ kind: 'num', answer: 2 }, frac)), '2');
  assert.equal(text(answerText({ kind: 'num', answer: 0.7, asDecimal: true }, byId['4-decimals'])), '0.7');
  // a percent answer of 12.5 is a decimal, not 25/2
  assert.equal(text(answerText({ kind: 'num', answer: 12.5 }, byId['6-percent'])), '12.5');
  assert.equal(text(answerText({ kind: 'num', answer: 5 }, byId['6-percent'])), '5');
});

test('algebra keys use real signs', () => {
  assert.equal(text(exprText('(x - 1)(x - 2)')), '(x - 1)(x - 2)');
  assert.equal(text(exprText('(x+-1)(x+-2)')), '(x - 1)(x - 2)');
  assert.equal(text(exprText('1x^2 - 1x + 3')), 'x^2 - x + 3');
  assert.equal(text(exprText('11x - 3')), '11x - 3');
  assert.match(exprText('(2x - 3)(x + 4)'), /^\(2x &minus; 3\)\(x \+ 4\)$/);
  assert.equal(text(exprText('4sqrt(3)')), '4sqrt3');
});

/* Every generator at levels 1 to 3, seeded, many draws each */
const DRAWS = 40;
const all = seeded('answers-sweep', () => SKILLS.flatMap(s => [1, 2, 3].flatMap(lv => Array.from({ length: DRAWS }, () => {
  try { return [{ s, p: s.gen(lv) }]; } catch (e) { return []; }
}).flat())));

test('every arithmetic problem accepts its own shown answer under the plain rule', () => {
  let n = 0;
  const check = (p, s, shown, where) => {
    const r = checkOne(p, shown);
    assert.ok(r.ok, `${where}: shown answer "${shown}" refused (${r.msg || 'wrong'}) for ${JSON.stringify({ answer: p.answer, simplest: p.simplest })}`);
  };
  for (const { s, p: raw } of all) {
    const p = withPlain(s, raw);
    if (!p.plain) continue;
    n++;
    const shown = text(answerText(p, s)).split(' = ');
    shown.forEach(v => check(p, s, v.trim(), s.id));
  }
  TRICKS.forEach(t => [1, 10, 25, 50].forEach(k => kata(t.id, k).problems.filter(p => p.plain).forEach(p => { n++; check(p, byId['v-' + t.id], text(answerText(p, byId['v-' + t.id])).split(' = ')[0], `kata ${t.id} ${k}`); })));
  assert.ok(n > 2000, `only ${n} plain problems swept`);
});

test('plain applies to grades K to 8 and the speed tricks only', () => {
  assert.ok(isArithmetic(byId['3-mult'])); assert.ok(isArithmetic(byId['k-count'])); assert.ok(isArithmetic(byId['v-sq5'])); assert.ok(isArithmetic(byId['8-roots']));
  assert.ok(!isArithmetic(byId['9-factor'])); assert.ok(!isArithmetic(SKILLS.find(s => s.grade === 12)));
  assert.equal(withPlain(byId['9-funceval'], { kind: 'num', answer: 3 }).plain, undefined);
  assert.equal(withPlain(byId['3-mult'], { kind: 'choice', answer: '3' }).plain, undefined);
  assert.ok(KATAS_PER_TRICK > 0 && kata('sq5', 1).problems.every(p => p.kind !== 'num' || p.plain));
});

test('fraction skills never reveal a decimal unless the problem asks for one', () => {
  for (const { s, p } of all) {
    if (s.strand !== 'frac' || p.kind !== 'num' || p.asDecimal) continue;
    assert.ok(!/\d\.\d/.test(text(answerText(p, s))), `${s.id}: ${text(answerText(p, s))}`);
  }
});

test('algebra answer keys have one sign per gap and no 1 before a letter', () => {
  for (const { s, p } of all) {
    if (p.kind !== 'expr') continue;
    for (const k of [p.answer, text(answerText(p, s))]) {
      assert.ok(!/\+\s*-|-\s*-|\+\s*0(?![.\d])|(^|[^\d.])1x/.test(k), `${s.id}: ${k}`);
    }
  }
});

test('factoring keys are right for every draw', () => {
  const fct = byId['9-factor'];
  const ps = seeded('factor-sweep', () => Array.from({ length: 300 }, (_, i) => fct.gen(1 + (i % 3))));
  assert.ok(ps.some(p => /-/.test(p.answer)), 'some draws have negative roots');
  ps.forEach(p => {
    assert.ok(checkOne(p, p.answer).ok, p.answer);
    assert.ok(!/\+\s*-|-\s*-|\+\s*0(?![.\d])|(^|[^\d.])1x/.test(p.answer), p.answer);
  });
  const inv = byId['11-inverse'];
  if (inv) seeded('inverse-sweep', () => Array.from({ length: 100 }, () => inv.gen(1))).filter(p => p.kind === 'expr').forEach(p => {
    assert.ok(checkOne(p, p.answer).ok, p.answer);
    assert.ok(!/\+\s*-|-\s*-|-\s*\(/.test(p.answer), p.answer);
  });
});
