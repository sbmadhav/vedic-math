/* Discovery Locks: pure logic (no DOM). Each chapter is a lock: a machine with a hidden shortcut. Players feed
   it numbers, predict its answers, then build its rule from tiles. The rule checker runs the player's rule on
   many inputs, so any rule that truly matches the machine opens the lock. Sutras come from Bharati Krishna
   Tirtha's 1965 book "Vedic Mathematics". */
import { int } from '../kit.js';

const TIMES = '×', MINUS = '−';
const digits = n => String(n).split('').map(Number);
const dsum = n => digits(n).reduce((s, d) => s + d, 0);
const rank = lv => ({ explorer: 0, challenger: 1, pro: 2 }[lv] ?? 1);

/* ---------- Levels: the same five beats in every chapter ---------- */
/* calm: the app's Calm preference (vm.calm), which means no clocks, so "Beat the lock" is untimed (secs 0) */
export function levelsFor(lv, calm = false) {
  const e = lv === 'explorer';
  return [
    { kind: 'feed', name: 'Feed the lock', feeds: 3, need: e ? 1 : 2 },
    { kind: 'predict', name: 'Predict', need: e ? 2 : 3 },
    { kind: 'quick', name: 'Beat the lock', need: e ? 2 : 3, secs: calm ? 0 : [25, 14, 9][rank(lv)] },
    { kind: 'rule', name: 'Name the rule' },
    { kind: 'stretch', name: 'Stretch it', need: e ? 2 : 3 }
  ];
}

/* What a level asks, said when the level before it is cleared. Level 1 already ends with two guesses, so a
   bare "Predict is next" read as the stage just done (Muse review, item 2): name the new task instead. */
export function levelGoal(lvl) {
  const n = lvl.need, row = n > 1 ? `${n} in a row` : 'one';
  return {
    feed: 'Pick numbers and watch what the lock does.',
    predict: `Guess ${row} before the lock shows its answer.`,
    quick: lvl.secs ? `Get ${row}, each within ${lvl.secs} seconds.` : `Get ${row} with the shortcut, no clock.`,
    rule: 'Build the lock’s rule from tiles.',
    stretch: `Get ${row} on new, bigger numbers.`
  }[lvl.kind] || '';
}

/* Does an answer count toward the level? A right answer counts unless the level has a clock (secs > 0) and it came too late */
export const counts = (lvl, ok, secs) => !!ok && !(lvl.secs > 0 && secs > lvl.secs);

/* ---------- Chapters ----------
   gen(r, stage, lv) -> input x (stage 'main' or 'stretch'); out(x) -> the machine's answer; ask(x) -> what the
   machine shows; rule(lv) -> { parts: [text | slotId], slots: { id: [{ label, f(x) }] }, combine(vals, x), answer } */
const pairShow = x => `${x.a} ${TIMES} ${x.b}`;

const eleven = {
  id: 'eleven', title: 'The Twin Wall', sutra: 'Ūrdhva-Tiryagbhyām', meaning: 'Vertically and crosswise', color: 'teal',
  blurb: 'A lock that multiplies by 11. It answers before you can blink. How?',
  label: `${TIMES} 11`,
  gen(r, stage, lv) {
    if (stage === 'stretch') { let a, b; do { a = int(r, 2, 9); b = int(r, 1, 9); } while (a + b < 10); return 10 * a + b; }
    const a = int(r, 1, 8), b = int(r, 0, 9 - a); return 10 * a + b;
  },
  out: x => x * 11, ask: x => `${x} ${TIMES} 11`,
  rule: () => ({
    parts: ['Write', 'A', 'on the left,', 'B', 'in the middle and', 'C', 'on the right (a middle of 10 or more carries its 1 to the left).'],
    slots: {
      A: [{ label: 'the first digit', f: x => Math.floor(x / 10) }, { label: 'the last digit', f: x => x % 10 }, { label: 'the two digits added', f: dsum }],
      B: [{ label: 'the two digits added', f: dsum }, { label: 'the first digit', f: x => Math.floor(x / 10) }, { label: 'the two digits multiplied', f: x => Math.floor(x / 10) * (x % 10) }],
      C: [{ label: 'the last digit', f: x => x % 10 }, { label: 'the first digit', f: x => Math.floor(x / 10) }, { label: 'a 1', f: () => 1 }]
    },
    combine: v => v.A * 100 + v.B * 10 + v.C,
    answer: { A: 0, B: 0, C: 0 }
  }),
  hints: [
    'Look at the first and last digits of each answer. Have you seen them before?',
    'Cover the middle digit of an answer. What is left is very familiar. Now, where could the middle come from?',
    'Try 23: the answer is 253. The 2 and the 3 stayed put. What do 2 and 3 make together?'
  ],
  reveal: {
    picture: 'columns',
    lines: x => [`${x} ${TIMES} 11 = ${x} ${TIMES} 10 + ${x}`, `= ${x * 10} + ${x}`, 'Each digit lands next to its own neighbor, so the middle is the two digits added.', `= ${x * 11}`]
  }
};

const fives = {
  id: 'fives', title: 'The Fives Vault', sutra: 'Ekādhikena Pūrveṇa', meaning: 'By one more than the one before', color: 'coral',
  blurb: 'This lock squares numbers that end in 5. It never even breaks a sweat.',
  label: 'squared',
  gen(r, stage, lv) {
    const e = lv === 'explorer';
    const a = stage === 'stretch' ? (e ? int(r, 5, 9) : int(r, 10, 19)) : (e ? int(r, 1, 4) : int(r, 1, 9));
    return 10 * a + 5;
  },
  out: x => x * x, ask: x => `${x}²`,
  rule: () => ({
    parts: ['Multiply', 'A', 'by', 'B', ', then write', 'C', 'after it.'],
    slots: {
      A: [{ label: 'the digits before the 5', f: x => Math.floor(x / 10) }, { label: 'the whole number', f: x => x }, { label: '5', f: () => 5 }],
      B: [{ label: 'one more than them', f: x => Math.floor(x / 10) + 1 }, { label: 'the same again', f: x => Math.floor(x / 10) }, { label: 'one less than them', f: x => Math.floor(x / 10) - 1 }, { label: '10', f: () => 10 }],
      C: [{ label: '25', f: () => 25 }, { label: '5', f: () => 5 }, { label: '50', f: () => 50 }]
    },
    combine: v => v.A * v.B * 100 + v.C,
    answer: { A: 0, B: 0, C: 0 }
  }),
  hints: [
    'Look at how every answer ends. Every single one.',
    'Now cover the 25 at the end. Compare what is left with the first digit of the number.',
    `For 65 the answer is 4225. What times 6 makes 42?`
  ],
  reveal: { picture: 'area', lines: x => { const a = Math.floor(x / 10); return [`${x}² = (${a * 10} + 5) ${TIMES} (${a * 10} + 5)`, `The two ${a * 10} ${TIMES} 5 strips make one more row of ${a * 10}:`, `${a * 10} ${TIMES} ${(a + 1) * 10} + 5 ${TIMES} 5`, `= ${a * (a + 1) * 100} + 25 = ${x * x}`]; } }
};

const nines = {
  id: 'nines', title: 'The Nines Gate', sutra: 'Ekanyūnena Pūrveṇa', meaning: 'By one less than the one before', color: 'sun',
  blurb: 'A gate that multiplies by nines. Its answers look like mirror twins.',
  Z: lv => (lv === 'explorer' ? 9 : 99),
  label: '',
  gen(r, stage, lv) {
    const e = lv === 'explorer';
    if (stage === 'stretch') return e ? { n: int(r, 11, 98), z: 99 } : { n: int(r, 101, 998), z: 999 };
    return e ? { n: int(r, 2, 9), z: 9 } : { n: int(r, 11, 98), z: 99 };
  },
  out: x => x.n * x.z, ask: x => `${x.n} ${TIMES} ${x.z}`,
  rule: lv => {
    /* main inputs are times Z, stretch inputs times the next row of nines: the labels name both round numbers */
    const Z = lv === 'explorer' ? 9 : 99, Z2 = Z * 10 + 9;
    return {
      parts: ['Write', 'A', ', then', 'B', 'right after it, with as many digits as there are nines (a 0 in front if it is short).'],
      slots: {
        A: [{ label: 'one less than the number', f: x => x.n - 1 }, { label: 'the number', f: x => x.n }, { label: 'one more than the number', f: x => x.n + 1 }],
        B: [{ label: `the rest of the way to ${Z + 1} (${Z2 + 1} for ${Z2})`, f: x => x.z + 1 - x.n }, { label: `the rest of the way to ${Z} (${Z2} for ${Z2})`, f: x => x.z - x.n }, { label: 'the number again', f: x => x.n }]
      },
      combine: (v, x) => v.A * (x.z + 1) + v.B,
      answer: { A: 0, B: 0 }
    };
  },
  hints: [
    'Add the left part and the right part of an answer together. Try it on a few.',
    'Compare the left part of each answer with the number you fed in. They are very close.',
    'For 47 the answer is 4653. 46 is just under 47, and 53 is what 47 needs to reach 100.'
  ],
  reveal: { picture: null, lines: x => [`${x.n} ${TIMES} ${x.z} = ${x.n} ${TIMES} ${x.z + 1} ${MINUS} ${x.n}`, `= (${x.n} ${MINUS} 1) ${TIMES} ${x.z + 1} + (${x.z + 1} ${MINUS} ${x.n})`, `One less on the left, and the rest of the way to ${x.z + 1} on the right.`, `= ${x.n * x.z}`] }
};

const gapOf = (n, B) => B - n;
const nearbase = {
  id: 'nearbase', title: 'The Base Camp Lock', sutra: 'Nikhilaṃ Navataścaramaṃ Daśataḥ', meaning: 'All from 9 and the last from 10', color: 'teal',
  blurb: 'Two numbers just under a round base go in. Their product pops out instantly.',
  label: '',
  gen(r, stage, lv) {
    const e = lv === 'explorer';
    let B = e ? 10 : 100, lo = e ? 6 : 90;
    if (stage === 'stretch') { if (e) { B = 100; lo = 94; } else lo = 80; }
    let a, b; do { a = int(r, lo, B - 1); b = int(r, lo, B - 1); } while (a === b);
    return { a, b, B };
  },
  out: x => x.a * x.b, ask: pairShow,
  rule: lv => ({
    parts: ['Gap means how far a number is below the base. Write', 'L', ', then', 'R', 'as the last digits: R fills as many digits as the base has zeros (a 0 in front if it is short), and if R has too many digits, carry the extra to the left part.'],
    slots: {
      L: [{ label: 'the first number minus the other gap', f: x => x.a - gapOf(x.b, x.B) }, { label: 'the two numbers added', f: x => x.a + x.b }, { label: 'the first number minus its own gap', f: x => x.a - gapOf(x.a, x.B) }],
      R: [{ label: 'gap times gap', f: x => gapOf(x.a, x.B) * gapOf(x.b, x.B) }, { label: 'gap plus gap', f: x => gapOf(x.a, x.B) + gapOf(x.b, x.B) }, { label: 'the last digits multiplied', f: x => (x.a % 10) * (x.b % 10) }]
    },
    combine: (v, x) => v.L * x.B + v.R,
    answer: { L: 0, R: 0 }
  }),
  hints: [
    'How far is each number from the round base? Write those gaps next to the tape.',
    'Multiply the two gaps. Look for that number in the answer.',
    'For 97 and 94 the gaps are 3 and 6. The answer is 9118. Where are 3 times 6 and 97 minus 6?'
  ],
  reveal: { picture: null, lines: x => { const ga = x.B - x.a, gb = x.B - x.b; return [`${x.a} = ${x.B} ${MINUS} ${ga} and ${x.b} = ${x.B} ${MINUS} ${gb}`, `(${x.B} ${MINUS} ${ga})(${x.B} ${MINUS} ${gb}) = ${x.B} ${TIMES} (${x.B} ${MINUS} ${ga} ${MINUS} ${gb}) + ${ga} ${TIMES} ${gb}`, `= ${x.B} ${TIMES} ${x.a - gb} + ${ga * gb}`, `= ${x.a * x.b}`]; } }
};

const buddies = {
  id: 'buddies', title: 'The Ten Buddies', sutra: "Antyayordaśake'pi", meaning: 'When the last digits add to ten', color: 'coral',
  blurb: 'Pairs with the same tens and last digits that make ten. The lock loves them.',
  label: '',
  gen(r, stage, lv) {
    const e = lv === 'explorer';
    const t = stage === 'stretch' ? (e ? int(r, 5, 9) : int(r, 10, 19)) : (e ? int(r, 1, 4) : int(r, 1, 9));
    const u = int(r, 1, 9);
    return { a: 10 * t + u, b: 10 * t + 10 - u };
  },
  out: x => x.a * x.b, ask: pairShow,
  rule: () => ({
    parts: ['Multiply', 'A', 'by', 'B', ', then write', 'C', 'as the last two digits.'],
    slots: {
      A: [{ label: 'the tens', f: x => Math.floor(x.a / 10) }, { label: 'the first number', f: x => x.a }, { label: 'the last digit', f: x => x.a % 10 }],
      B: [{ label: 'one more than the tens', f: x => Math.floor(x.a / 10) + 1 }, { label: 'the tens again', f: x => Math.floor(x.a / 10) }, { label: '10', f: () => 10 }],
      C: [{ label: 'last digit times last digit', f: x => (x.a % 10) * (x.b % 10) }, { label: 'last digit plus last digit', f: x => (x.a % 10) + (x.b % 10) }, { label: '25', f: () => 25 }]
    },
    combine: v => v.A * v.B * 100 + v.C,
    answer: { A: 0, B: 0, C: 0 }
  }),
  hints: [
    'The last two digits of each answer: compare them with the last digits of the two numbers.',
    'Now cover those two digits. What is left? Compare it with the tens digit.',
    'For 43 and 47: 3 times 7 is 21, and 4 times 5 is 20. The answer is 2021.'
  ],
  reveal: { picture: 'area', lines: x => { const t = Math.floor(x.a / 10); return [`${x.a} ${TIMES} ${x.b}: the units ${x.a % 10} and ${x.b % 10} make 10`, `So the two side strips together make one more row of ${t * 10}:`, `${t * 10} ${TIMES} ${(t + 1) * 10} + ${x.a % 10} ${TIMES} ${x.b % 10}`, `= ${t * (t + 1) * 100} + ${(x.a % 10) * (x.b % 10)} = ${x.a * x.b}`]; } }
};

const lamp = {
  id: 'lamp', title: 'The Nine Lamp', sutra: 'Guṇitasamuccayaḥ', meaning: 'The product of the sums is the sum of the product', color: 'sun',
  /* The lamp teaches casting out nines (digit sums). The book's Guṇitasamuccayaḥ is a check of a product by the
     sums of its parts, and digit sums are how that check is usually done: related, not the same thing. */
  found: 'casting out nines',
  credit: 'Casting out nines is an old check, older than the 1965 book. Bharati Krishna Tirtha checks answers with digit sums like this under Guṇitasamuccayaḥ.',
  blurb: 'A lamp that lights up for some numbers and stays dark for others. Which ones?',
  label: '', lamp: true,
  gen(r, stage, lv) {
    const e = lv === 'explorer';
    const [lo, hi] = stage === 'stretch' ? (e ? [100, 999] : [1000, 99999]) : (e ? [10, 99] : [100, 999]);
    const roll = r();
    if (roll < 0.45) { const k = int(r, Math.ceil(lo / 9), Math.floor(hi / 9)); return 9 * k; }
    if (roll < 0.7) { let k; do { k = int(r, Math.ceil(lo / 3), Math.floor(hi / 3)); } while ((3 * k) % 9 === 0); return 3 * k; }
    let n; do { n = int(r, lo, hi); } while (n % 3 === 0); return n;
  },
  out: x => (x % 9 === 0 ? 1 : 0), ask: x => String(x),
  rule: () => ({
    parts: ['The lamp lights when', 'X', '', 'Y', '.'],
    slots: {
      X: [{ label: 'the sum of its digits', f: dsum }, { label: 'its last digit', f: x => x % 10 }, { label: 'its first digit', f: x => digits(x)[0] }],
      Y: [{ label: 'is a multiple of 9', f: v => v % 9 === 0 }, { label: 'is a multiple of 3', f: v => v % 3 === 0 }, { label: 'is even', f: v => v % 2 === 0 }, { label: 'is bigger than 9', f: v => v > 9 }]
    },
    /* Y tiles test the value X produced, so they are applied in combine */
    combine: (v, x, pick, slots) => (slots.Y[pick.Y].f(v.X) ? 1 : 0),
    answer: { X: 0, Y: 0 }
  }),
  hints: [
    'Add up the digits of the numbers that lit up. Do the sums have something in common?',
    'Some numbers in the 3 times table stay dark. So it is pickier than 3.',
    '81: 8 + 1 = 9, lit. 75: 7 + 5 = 12, dark. 288: 2 + 8 + 8 = 18, lit.'
  ],
  reveal: { picture: null, lines: x => { const d = digits(x), k = d.length; const parts = d.map((v, i) => `${v} ${TIMES} ${'9'.repeat(k - 1 - i) || '0'}`).slice(0, -1); return [`10 = 9 + 1, 100 = 99 + 1, 1000 = 999 + 1`, `${x} = (${parts.join(' + ')}) + (${d.join(' + ')})`, 'The first group is always a multiple of 9, so only the digit sum decides.', `${d.join(' + ')} = ${dsum(x)}: ${x % 9 === 0 ? 'a multiple of 9, the lamp lights' : 'not a multiple of 9, the lamp stays dark'}.`]; } }
};

export const CHAPTERS = [eleven, fives, nines, nearbase, buddies, lamp];
export const chapterById = id => CHAPTERS.find(c => c.id === id);

/* ---------- Rules ---------- */
/* Value of a rule for input x, with pick = { slotId: optionIndex } */
export function runRule(ch, lv, pick, x) {
  const R = ch.rule(lv);
  const vals = {};
  for (const id of Object.keys(R.slots)) vals[id] = R.slots[id][pick[id] ?? 0].f(x);
  return R.combine(vals, x, pick, R.slots);
}
/* Check a rule against the machine on a list of inputs: rows for display and ok when every row matches */
export function checkRule(ch, lv, pick, inputs) {
  const rows = inputs.map(x => { const got = runRule(ch, lv, pick, x), want = ch.out(x); return { x, got, want, ok: got === want }; });
  return { rows, ok: rows.every(r => r.ok) };
}
/* A wide test set: main and stretch inputs from a fixed seed, so a rule that only fits the tape fails */
export function testInputs(ch, lv, r, n = 60, stretch = true) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(ch.gen(r, stretch && i % 3 === 2 ? 'stretch' : 'main', lv));
  return out;
}
export const allPicks = (ch, lv) => {
  const slots = ch.rule(lv).slots, ids = Object.keys(slots);
  return ids.reduce((acc, id) => acc.flatMap(p => slots[id].map((_, i) => ({ ...p, [id]: i }))), [{}]);
};

/* ---------- Predictions ---------- */
const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];
/* Compare a guess with the machine's answer: which places match, and a friendly note */
export function compare(guess, actual) {
  const g = String(guess), a = String(actual);
  const len = Math.max(g.length, a.length);
  const gp = g.padStart(len, ' '), ap = a.padStart(len, ' ');
  const marks = [...ap].map((c, i) => c === gp[i]);
  const wrong = marks.map((m, i) => (m ? -1 : len - 1 - i)).filter(i => i >= 0);
  let note;
  if (guess === actual) note = 'Exactly right.';
  else if (g.length !== a.length) note = `Yours has ${g.length} digit${g.length > 1 ? 's' : ''}, the lock's has ${a.length}.`;
  else if (wrong.length === 1) note = `Only your ${PLACES[wrong[0]]} digit is different.`;
  else if (a.endsWith(g.slice(-2)) && g.length > 2) note = `The last two digits match. Look again at the front.`;
  else if (g.slice(0, 1) === a.slice(0, 1)) note = `The front matches. The rest is off by ${Math.abs(guess - actual)}.`;
  else note = `Off by ${Math.abs(guess - actual)}.`;
  return { marks, note, diff: guess - actual };
}

/* ---------- Progress ---------- */
/* Saved progress: { [chapterId]: { done: number of levels finished, stars } } */
export const nextLevel = (prog, ch) => Math.min(levelsFor('challenger').length, prog?.[ch.id]?.done || 0);
export const chapterDone = (prog, ch) => (prog?.[ch.id]?.done || 0) >= levelsFor('challenger').length;
/* Clearing level li of a chapter (c = that chapter's saved record): only the first clear moves progress on
   and counts (Sparks); replaying a level returns false */
export function clearLevel(c, li) { const first = li >= (c.done || 0); if (first) c.done = li + 1; return first; }
/* Discovering a chapter's sutra (solving its rule level, at index ruleAt) counts once per Player. Progress saved
   before discoveries were recorded counts as found when the rule level was already cleared. */
export function discover(c, ruleAt) { const first = !c.found && (c.done || 0) <= ruleAt; c.found = true; return first; }
