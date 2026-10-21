/* What the read-aloud voice says (openspec voice-wording): js/voice.js normalize() turns question HTML into words.
   The table covers every class of fix and the lines that were already right, so neither regresses. The sweep runs
   every generator (seeded) through normalize() and fails on anything a voice would read badly. */
import { test } from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { normalize, sentences, ordinalWord, denomWord } from '../js/voice.js';
import { SKILLS } from '../js/skills/index.js';
import { TRICKS } from '../js/vedic.js';
import { KATAS_PER_TRICK, kata, CHALLENGE_COUNT, challenge, challengeSet, seeded } from '../js/levels.js';
import { makeSet } from '../js/arena.js';
import { mentalQ, FAMILIES } from '../js/mental.js';

const fr = (n, d) => `<span class="fr"><span>${n}</span><span>${d}</span></span>`;
const CASES = [
  // Already right before this change: plain arithmetic, fixed lines, words, money, percent, degrees, blanks
  ['k sums', '3 + 4 = ?', '3 plus 4 equals what?'],
  ['subtraction', '7 &minus; 2 = ?', '7 minus 2 equals what?'],
  ['times and divide', '56 &divide; 8 = ?', '56 divided by 8 equals what?'],
  ['times', '7 &times; 8 = 56', '7 times 8 equals 56'],
  ['Me sample', 'Hi there! 7 &times; 8 = 56. Great job!', 'Hi there! 7 times 8 equals 56. Great job!'],
  ['fixed line', 'Not quite. Try again!', 'Not quite. Try again!'],
  ['balloon', 'Pop 3 more than 5 balloons', 'Pop 3 more than 5 balloons'],
  ['blank box', '6 + &#9633; = 10', '6 plus blank equals 10'],
  ['placeholder after a colon', 'Double 8 is 16. Double again: ?', 'Double 8 is 16. Double again: what?'],
  ['percent', 'What is 75% of 70?', 'What is 75 percent of 70?'],
  ['degrees', 'An angle is 5°. What is its complement?', 'An angle is 5 degrees. What is its complement?'],
  ['whole dollars', '$54 with a 30% discount.', '54 dollars with a 30 percent discount.'],
  ['big number', 'Round 10,000 to the nearest ten.', 'Round 10000 to the nearest ten.'],
  ['small fraction', `${fr(2, 3)} + ${fr(1, 3)} = ?`, 'two thirds plus one third equals what?'],
  ['mixed number', `What is 2 ${fr(3, 4)} as a fraction?`, 'What is 2 and three fourths as a fraction?'],
  ['missing numerator', `${fr(5, 6)} = ${fr('?', 18)}`, 'five sixths equals what over 18'],
  ['squared and cubed', '<i>x</i><sup>2</sup> + <i>x</i><sup>3</sup>', 'x squared plus x cubed'],
  ['power placeholder', 'Simplify: <i>x</i><sup>2</sup> &middot; <i>x</i><sup>3</sup> = <i>x</i><sup>?</sup>', 'Simplify: x squared times x cubed equals x to the power of what?'],
  ['cube root', '<sup>3</sup>&radic;27 = ?', 'the cube root of 27 equals what?'],
  ['square root', '&radic;9 = ?', 'the square root of 9 equals what?'],
  ['inequality', 'Solve: &minus;5<i>x</i> &minus; 11 &lt; 14', 'Solve: negative 5 x minus 11 is less than 14'],
  ['ratio', '4 : 6 = ? : 18', '4 to 6 equals what to 18'],
  ['log base', 'log<sub>2</sub>(8) = ?', 'log base 2 of 8 equals what?'],
  ['derivative', '<i>f</i>(<i>x</i>) = 3<i>x</i><sup>2</sup>. Find <i>f</i>&prime;(2).', 'f of x equals 3 x squared. Find f prime of 2.'],
  ['hyphenated words stay', 'You roll a fair six-sided die. Reflect over the x-axis.', 'You roll a fair six-sided die. Reflect over the x-axis.'],
  // A "?" after a number ends the question; it is not a blank
  ['question mark after a bold number', 'What number comes right after <b>18</b>?', 'What number comes right after 18?'],
  ['number bond', '3 and how many more make <b>10</b>?', '3 and how many more make 10?'],
  ['two blanks', '124 &divide; 5 = ? remainder ?', '124 divided by 5 equals what, remainder what?'],
  // Ordinals
  ['ordinal digits', 'What is the 6th multiple of 3? (The 1st is 3.)', 'What is the sixth multiple of 3? The first is 3.'],
  ['ordinal plural', 'Keep the 12ths. 6 + 3 = 9.', 'Keep the twelfths. 6 plus 3 equals 9.'],
  ['ordinal range', 'In how many ways can 6 runners finish 1st through 3rd?', 'In how many ways can 6 runners finish first through third?'],
  // Fractions named, not "over"
  ['fraction names', `${fr(6, 4)} &divide; ${fr(1, 7)} = ?`, 'six fourths divided by one seventh equals what?'],
  ['hundredths', `Write ${fr(40, 100)} as a decimal.`, 'Write 40 hundredths as a decimal.'],
  ['one hundredth', `log<sub>10</sub>(${fr(1, 100)}) = ?`, 'log base 10 of one hundredth equals what?'],
  ['thirteenths', `${fr(3, 13)} + ${fr(1, 13)}`, 'three thirteenths plus one thirteenth'],
  ['big denominator', `${fr(3, 101)} + ${fr(0, 5)}`, '3 over 101 plus 0 over 5'],
  ['negative fraction', `1 + &minus;${fr(1, 3)} + ${fr(1, 9)} + ...`, '1 plus negative one third plus one ninth, and so on'],
  ['letter over number', `${fr(2, 3)} = ${fr(10, '<i>x</i>')}`, 'two thirds equals 10 over x'],
  ['algebra fraction keeps its pauses', `lim<sub><i>x</i>&rarr;&minus;4</sub> ${fr('<i>x</i><sup>2</sup> + <i>x</i> &minus; 12', '<i>x</i> + 4')}`,
    'the limit as x approaches negative 4 of x squared plus x minus 12, all over x plus 4'],
  // Brackets: function arguments
  ['composition', 'Find <i>f</i>(<i>g</i>(1)).', 'Find f of g of 1.'],
  ['capital and other letters', 'F(<i>x</i>) = <i>x</i><sup>3</sup>. Evaluate p(0).', 'F of x equals x cubed. Evaluate p of 0.'],
  ['inverse', 'Find <i>f</i><sup>&minus;1</sup>(<i>x</i>).', 'Find f inverse of x.'],
  ['trig', 'Find the exact value of cos(225°).', 'Find the exact value of cosine of 225 degrees.'],
  ['trig word', 'sin = opposite &divide; hypotenuse', 'sine equals opposite divided by hypotenuse'],
  // Brackets: quantities keep their grouping
  ['number times a sum (owner example)', '2(<i>x</i> + 3)', '2 times, x plus 3'],
  ['fourths', `${fr(1, 4)} and ${fr(3, 4)} + ${fr(2, 4)} and ¾ and ¼`, 'one fourth and three fourths plus two fourths and three fourths and one fourth'],
  ['product of brackets', 'Expand: (<i>x</i> &minus; 7)(<i>x</i> &minus; 8)', 'Expand: x minus 7, times x minus 8'],
  ['number times bracket', 'Simplify: 6(&minus;<i>x</i> &minus; 6) + 6<i>x</i>', 'Simplify: 6 times, negative x minus 6, plus 6 x'],
  ['power of a bracket', '<i>f</i>(<i>x</i>) = (4<i>x</i> + 3)<sup>4</sup>. Find <i>f</i>&prime;(2).', 'f of x equals 4 x plus 3, all to the power of 4. Find f prime of 2.'],
  ['chain rule hint', '<i>f</i>&prime;(<i>x</i>) = 4(4<i>x</i> + 3)<sup>3</sup> &middot; 4', 'f prime of x equals 4 times, 4 x plus 3, all cubed, times 4'],
  ['power of a power', 'Simplify: (<i>x</i><sup>5</sup>)<sup>3</sup> = <i>x</i><sup>?</sup>', 'Simplify: x to the power of 5, all cubed, equals x to the power of what?'],
  ['bracketed negative squared', '&minus;1&middot;(&minus;4)<sup>2</sup> + (&minus;5)', 'negative 1 times, negative 4, all squared, plus negative 5'],
  ['bracket then a letter', 'Transpose: (2 &minus; -4)x = 26 &minus; 8.', 'Transpose: 2 minus negative 4, times x equals 26 minus 8.'],
  ['integrand', 'Evaluate &int;<sub>1</sub><sup>3</sup> (2<i>x</i> + 2) d<i>x</i>', 'Evaluate the integral from 1 to 3 of 2 x plus 2, d x'],
  ['absolute value', 'Solve: |<i>x</i> &minus; 3| = 8', 'Solve: the absolute value of x minus 3, equals 8'],
  ['divide by a bracket', 'Use a(r<sup>n</sup> &minus; 1) &divide; (r &minus; 1).', 'Use a times, r to the power of n, minus 1, divided by, r minus 1.'],
  ['opposite of a negative', '<i>x</i> = &minus;(&minus;4) &divide; (2&middot;&minus;2)', 'x equals the opposite of negative 4 divided by, 2 times negative 2'],
  ['complex product', '(&minus;4 + 4<i>i</i>) &middot; (&minus;3 + 2<i>i</i>) = ?', 'negative 4 plus 4 i, times negative 3 plus 2 i, equals what?'],
  // Brackets: asides read as a pause, units moved into the question
  ['aside', 'Column 1 (straight down): 0×0 = 0. Write 0.', 'Column 1, straight down: 0 times 0 equals 0. Write 0.'],
  ['list aside', 'Last digit 7 → root ends in 3 (2 and 8 swap, 3 and 7 swap, the rest stay).', 'Last digit 7, so root ends in 3. 2 and 8 swap, 3 and 7 swap, the rest stay.'],
  ['power of a sum', 'Solve: 3<sup><i>x</i> + 1</sup> = 1', 'Solve: 3 to the power of x plus 1, equals 1'],
  ['number times a bracketed negative power', '4(&minus;<i>x</i>)<sup>3</sup>', '4 times, negative x, all cubed'],
  ['root of a sum', '&radic;(<i>x</i><sup>2</sup> + <i>y</i><sup>2</sup>)', 'the square root of x squared plus y squared'],
  ['letters after pi', 'Cylinder: 2&pi;rh', 'Cylinder: 2 pi r h'],
  ['two functions', '<i>f</i>(<i>x</i>) = 3<i>x</i> &minus; 3 and <i>g</i>(<i>x</i>) = 2<i>x</i>.', 'f of x equals 3 x minus 3, and g of x equals 2 x.'],
  ['aside at the end', 'Right part: 99 − 55 = 44 (all from 9).', 'Right part: 99 minus 55 equals 44, all from 9.'],
  ['aside sentence', 'What is the percent change? (Use a negative number for a decrease.)', 'What is the percent change? Use a negative number for a decrease.'],
  ['units label', 'What is the area of the rectangle? (square units)', 'What is the area of the rectangle in square units?'],
  ['letter aside', 'Across first (x), then up or down (y).', 'Across first, x, then up or down, y.'],
  // Points, vectors, matrices
  ['two points', 'Find the midpoint of (&minus;5, &minus;5) and (&minus;11, 3).', 'Find the midpoint of the points negative 5, negative 5, and negative 11, 3.'],
  ['point named', 'Point (5, &minus;4). Where does it go?', 'Point 5, negative 4. Where does it go?'],
  ['dot product', 'Find the dot product &lang;&minus;5, &minus;6&rang; &middot; &lang;3, 6&rang;.', 'Find the dot product of the vector negative 5, negative 6, and the vector 3, 6.'],
  ['vector named', 'Find the magnitude of the vector &lang;7, 24&rang;.', 'Find the magnitude of the vector 7, 24.'],
  ['matrix', 'Find the determinant of <span class="mx"><span>&minus;8</span><span>9</span><span>&minus;7</span><span>7</span></span>',
    'Find the determinant of the matrix with top row negative 8, 9, and bottom row negative 7, 7'],
  // Negative numbers
  ['negative after a line break', 'Solve:<br>&minus;4<i>x</i> &minus; 2<i>y</i> = &minus;28<br>&minus;<i>x</i> + <i>y</i> = 2', 'Solve: negative 4 x minus 2 y equals negative 28. negative x plus y equals 2'],
  ['negative after a word', 'Each term adds &minus;2. Add -1 to x.', 'Each term adds negative 2. Add negative 1 to x.'],
  ['minus a negative', '2 &minus; -4 and 2 &minus; &minus;4', '2 minus negative 4 and 2 minus negative 4'],
  ['negative i squared', 'you get &minus;16<i>i</i><sup>2</sup>', 'you get negative 16 i squared'],
  ['subtracting after squared', '<i>x</i><sup>2</sup> &minus; 9', 'x squared minus 9'],
  // Unicode powers, the four thirds formula, ellipses, special triangles
  ['unicode powers', 'Left: 1² = 1. Right: 9³ = 729.', 'Left: 1 squared equals 1. Right: 9 cubed equals 729.'],
  ['repeating decimal', '1/19 = 0.&hellip; What is digit number 5?', '1 over 19 equals 0 point, and so on. What is digit number 5?'],
  ['series with a last term', 'Find the sum: 1 + 2 + 3 + ... + 6', 'Find the sum: 1 plus 2 plus 3, and so on, up to 6'],
  ['endless series', `Find the sum: 11 + ${fr(11, 3)} + ${fr(11, 9)} + ...`, 'Find the sum: 11 plus 11 thirds plus 11 ninths, and so on'],
  ['sequence then a question', '5, 15, 45, 135, ... What is term number 6?', '5, 15, 45, 135, and so on. What is term number 6?'],
  ['type the right side', 'Type the right side of <i>y</i> = ...', 'Type the right side of y equals'],
  ['and so on', 'List factor pairs: 1 and 45, then 2 and ...', 'List factor pairs: 1 and 45, then 2 and what, and so on'],
  ['special triangle', 'A 45-45-90 triangle has legs of 5.', 'A 45 45 90 triangle has legs of 5.'],
  ['arrow in a hint', 'Last digit 0 → root ends in 0.', 'Last digit 0, so root ends in 0.'],
  // Time, money, typing
  ['clock time', 'What time is it? Type it like 3:25.', 'What time is it? Type it like 3 25.'],
  ['on the hour', 'It is 7:00 or 7:05.', "It is 7 o'clock or 7 oh 5."],
  ['dollars and cents', '$4.50 and $0.25 and $1', '4 dollars and 50 cents and 25 cents and 1 dollar'],
  ['what to type', 'What fraction is shaded? Type it like 3/4.', 'What fraction is shaded? Type it like 3 slash 4.'],
  ['slash otherwise', 'What is the first decimal digit of 1/19 that is not 0?', 'What is the first decimal digit of 1 over 19 that is not 0?']
];

test('normalize() says each kind of math the way a teacher reads it aloud', () => {
  const wrong = CASES.filter(([, html, want]) => normalize(html) !== want).map(([name, html, want]) => `${name}\n    got:  ${normalize(html)}\n    want: ${want}`);
  assert.deepEqual(wrong, []);
});

test('ordinal and denominator words', () => {
  assert.deepEqual([1, 2, 3, 12, 21, 40, 100, 1000].map(ordinalWord), ['first', 'second', 'third', 'twelfth', 'twenty first', 'fortieth', 'hundredth', 'thousandth']);
  assert.deepEqual([2, 3, 4, 12].map(d => denomWord(d, true)), ['halves', 'thirds', 'fourths', 'twelfths']);
  assert.equal(denomWord(4, false), 'fourth');
  assert.equal(denomWord(2, false), 'half');
});

/* ---------- The sweep: every spoken line from every source ---------- */
const spoken = p => p.say || p.q;
function everyLine() {
  const out = [];
  const add = (src, t) => { if (t) out.push([src, t]); };
  seeded('voice-wording', () => {
    for (const s of SKILLS) for (const lv of [1, 2, 3]) for (let i = 0; i < 60; i++) {
      const p = s.gen(lv);
      add(`${s.id} level ${lv}`, spoken(p));
      (p.hints || []).forEach(h => add(`${s.id} level ${lv} hint`, h));
    }
    for (const f of FAMILIES) for (let d = 1; d <= 20; d++) add(`mental ${f} ${d}`, spoken(mentalQ(f, d)));
  });
  for (const t of TRICKS) for (let n = 1; n <= KATAS_PER_TRICK; n++) for (const p of kata(t.id, n).problems) add(`kata ${t.id} ${n}`, spoken(p));
  for (const league of ['explorer', 'challenger', 'pro']) for (let d = 0; d < 5; d++) for (const p of makeSet(league, `voice-${d}`)) add(`arena ${league}`, spoken(p));
  for (let id = 1; id <= CHALLENGE_COUNT; id += 9) for (const p of challengeSet(challenge(id), 20)) add(`tower ${id}`, spoken(p));
  for (const t of ['Which has more?', 'Yay! You got it!', 'Super star!', 'Woohoo! Correct!', 'You are so smart!', 'You got it!', 'Not quite. Try again!',
    'Hi! I will read the questions to you.', 'Read aloud is on.', 'Hi! This is how I sound.', 'Hi! I am your new reading voice.']) add('fixed', t);
  for (let n = 1; n <= 20; n++) add('balloon', `Pop ${n} balloon${n > 1 ? 's' : ''}`);
  return out;
}
/* Words a voice reads badly. Digits followed by letters are allowed only for units a voice says well (none today). */
const ALLOWED_UNITS = /^$/;
function problems(words) {
  const bad = [];
  if (/[<>&#_^{}\\|⟨⟩□√′∫·×÷−±≤≥≠≈→←²³…\u0001-\u0003]/.test(words)) bad.push('symbol left');
  for (const m of words.matchAll(/\d+([A-Za-z]+)/g)) if (!ALLOWED_UNITS.test(m[1])) bad.push(`digits then letters: ${m[0]}`);
  if (/\bwhat what\b/i.test(words)) bad.push('what what');
  if (/\d what\b/.test(words)) bad.push('a question mark read as what after a number');
  const dbl = words.match(/\b([A-Za-z]+) \1\b/i); if (dbl) bad.push(`doubled word: ${dbl[0]}`);
  for (const part of sentences(words)) if (part.length > 160 && !part.includes(',')) bad.push('a long sentence with no pause');
  if (/,\s*[,.?!:]|\s[,.?!]/.test(words)) bad.push('stray punctuation');
  return bad;
}

test('every generated line reads cleanly: no symbols, no 12ths, no "10 what", no doubled words, no long run-ons', () => {
  const lines = everyLine(), seen = new Set(), fails = [];
  for (const [src, html] of lines) {
    const words = normalize(html); if (seen.has(words)) continue; seen.add(words);
    const bad = problems(words); if (bad.length) fails.push(`${src}: ${bad.join('; ')}\n    ${words}`);
  }
  assert.ok(lines.length > 50000, `sampled ${lines.length} lines`);
  assert.deepEqual(fails.slice(0, 20), [], `${fails.length} lines read badly`);
});

test('a question with a say is heard in its say words, and its screen text is unchanged', () => {
  const said = SKILLS.filter(s => ['1-compare', '3-fraccmp', '4-angles', '3-area', '5-volume', '8-pyth', '10-triangle'].includes(s.id));
  assert.equal(said.length, 7);
  for (const s of said) seeded(`say-${s.id}`, () => {
    for (let i = 0; i < 30; i++) {
      const p = s.gen(1 + (i % 3));
      assert.ok(p.say && p.q, s.id);
      const words = normalize(p.say);
      assert.ok(!/\bblank\b/.test(words) && words !== normalize(p.q), `${s.id}: ${words}`); // says what the picture shows
    }
  });
});
