/* The Lost Śulba Scroll: pure logic (no DOM). Katapayadi and bhūta-saṅkhyā number words, Śulba rope
   geometry, Meru-prastāra and Piṅgala's syllable lists, the weekly unlock schedule, and every chapter's
   puzzles for each level with answers computed by the functions here (tests recompute them). */

/* ---------- Katapayadi ----------
   Consonants map to digits in four runs: ka to ña (1 to 9, 0), ṭa to na (1 to 9, 0), pa to ma (1 to 5),
   ya to ha (1 to 8). A vowel on its own is 0. In a cluster only the last consonant counts. A number is
   written units first, so the digits read right to left. */
export const KP = {
  k: 1, kh: 2, g: 3, gh: 4, 'ṅ': 5, c: 6, ch: 7, j: 8, jh: 9, 'ñ': 0,
  'ṭ': 1, 'ṭh': 2, 'ḍ': 3, 'ḍh': 4, 'ṇ': 5, t: 6, th: 7, d: 8, dh: 9, n: 0,
  p: 1, ph: 2, b: 3, bh: 4, m: 5,
  y: 1, r: 2, l: 3, v: 4, 'ś': 5, 'ṣ': 6, s: 7, h: 8
};
/* The key as rows of syllables per digit, for display */
export const KP_ROWS = [
  ['ka', 'kha', 'ga', 'gha', 'ṅa', 'ca', 'cha', 'ja', 'jha', 'ña'],
  ['ṭa', 'ṭha', 'ḍa', 'ḍha', 'ṇa', 'ta', 'tha', 'da', 'dha', 'na'],
  ['pa', 'pha', 'ba', 'bha', 'ma'],
  ['ya', 'ra', 'la', 'va', 'śa', 'ṣa', 'sa', 'ha']
];
/* A friendlier key for explorers: one or two easy syllables per digit */
export const KP_EASY = { 1: ['ka', 'pa', 'ya'], 2: ['ra'], 3: ['ga', 'la'], 4: ['va'], 5: ['ma'], 6: ['ca', 'ta'], 7: ['sa'], 8: ['ja', 'ha'], 9: ['dha'], 0: ['na'] };
const VOWELS = ['ai', 'au', 'a', 'ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'ṝ', 'e', 'o'];
const ASP = ['kh', 'gh', 'ch', 'jh', 'ṭh', 'ḍh', 'th', 'dh', 'ph', 'bh'];
const norm = s => String(s).normalize('NFC').toLowerCase();

/* Split romanized text into syllables: consonants then a vowel; trailing consonants, ṃ and ḥ stay with
   the syllable before them (they carry no digit) */
export function syllables(word) {
  const s = norm(word).replace(/[^a-zāīūṛṝṅñṭḍṇśṣṃḥ]/g, '');
  const out = []; let i = 0, cur = '';
  while (i < s.length) {
    const v = VOWELS.find(x => s.startsWith(x, i));
    if (v) { cur += v; i += v.length; while (i < s.length && /[ṃḥ]/.test(s[i])) cur += s[i++]; out.push(cur); cur = ''; continue; }
    cur += s[i++];
  }
  if (cur) { if (out.length) out[out.length - 1] += cur; else out.push(cur); }
  return out;
}
/* The consonants at the start of a syllable (aspirates as one) */
export function consonants(syl) {
  const s = norm(syl); const out = []; let i = 0;
  while (i < s.length) {
    if (VOWELS.some(v => s.startsWith(v, i))) break;
    const a = ASP.find(x => s.startsWith(x, i));
    if (a) { out.push(a); i += a.length; continue; }
    out.push(s[i]); i++;
  }
  return out;
}
/* Digit of one syllable: its last onset consonant, or 0 for a bare vowel */
export function kpDigit(syl) {
  const c = consonants(syl);
  if (!c.length) return 0;
  const d = KP[c[c.length - 1]];
  if (d === undefined) throw new Error('not a Katapayadi consonant: ' + syl);
  return d;
}
/* Digits in reading order (units first) and the number they make */
export const kpDigits = sylls => sylls.map(kpDigit);
export const kpDecode = sylls => Number(kpDigits(sylls).reverse().join(''));
export const kpDecodeWord = w => kpDecode(syllables(w));
/* Encode n as syllables, choosing for each digit from `pool` (default: the first syllable for that digit) */
export function kpEncode(n, pool = null) {
  return String(n).split('').reverse().map(ch => {
    const d = +ch;
    const opts = (pool || Object.values(KP_EASY).flat()).filter(s => kpDigit(s) === d);
    if (!opts.length) throw new Error('no syllable for ' + d);
    return opts[0];
  });
}
/* Melakarta ragas: the first two syllables give the number */
export const melakarta = name => kpDecode(syllables(name).slice(0, 2));

/* ---------- Bhūta-saṅkhyā: object words for digits (each also has many synonyms) ---------- */
export const BHUTA = [
  { w: 'śūnya', en: 'emptiness', d: 0 }, { w: 'kha', en: 'sky', d: 0 },
  { w: 'candra', en: 'moon', d: 1 }, { w: 'bhū', en: 'earth', d: 1 },
  { w: 'netra', en: 'eyes', d: 2 }, { w: 'bāhu', en: 'arms', d: 2 }, { w: 'pakṣa', en: 'wings', d: 2 }, { w: 'aśvin', en: 'the twin Aśvins', d: 2 },
  { w: 'agni', en: 'sacred fires', d: 3 }, { w: 'guṇa', en: 'qualities', d: 3 }, { w: 'rāma', en: 'the three Rāmas', d: 3 },
  { w: 'veda', en: 'Vedas', d: 4 }, { w: 'yuga', en: 'ages', d: 4 },
  { w: 'bāṇa', en: 'arrows (of Kāma)', d: 5 }, { w: 'bhūta', en: 'elements', d: 5 },
  { w: 'ṛtu', en: 'seasons', d: 6 }, { w: 'rasa', en: 'tastes', d: 6 },
  { w: 'ṛṣi', en: 'sages', d: 7 }, { w: 'svara', en: 'musical notes', d: 7 },
  { w: 'vasu', en: 'Vasus', d: 8 }, { w: 'gaja', en: 'elephants (of the directions)', d: 8 },
  { w: 'graha', en: 'planets', d: 9 }, { w: 'aṅka', en: 'digits', d: 9 }
];
export const bhutaDigit = w => { const e = BHUTA.find(x => x.w === norm(w)); if (!e) throw new Error('unknown word ' + w); return e.d; };
export const bhutaDecode = words => Number(words.map(bhutaDigit).reverse().join(''));
export const bhutaEncode = n => String(n).split('').reverse().map(ch => BHUTA.find(e => e.d === +ch).w);
export const bhutaEn = w => BHUTA.find(x => x.w === norm(w))?.en || w;

/* ---------- Śulba rope geometry ---------- */
/* A 12-knot rope loop with pegs at knot 0, i and j: sides i, j - i, 12 - j */
export const ropeSides = (i, j, knots = 12) => [i, j - i, knots - j];
export const isTriangle = ([a, b, c]) => a > 0 && b > 0 && c > 0 && a + b > c && b + c > a && a + c > b;
/* Angles (degrees) opposite each side */
export function angles([a, b, c]) {
  const A = Math.acos((b * b + c * c - a * a) / (2 * b * c)), B = Math.acos((a * a + c * c - b * b) / (2 * a * c));
  return [A, B, Math.PI - A - B].map(x => (x * 180) / Math.PI);
}
export const isRight = s => { const [a, b, c] = s.slice().sort((x, y) => x - y); return isTriangle(s) && a * a + b * b === c * c; };
/* Every peg setting on a 12-knot rope that makes a right angle */
export const rightSettings = (knots = 12) => { const out = []; for (let i = 1; i < knots; i++) for (let j = i + 1; j < knots; j++) if (isRight(ropeSides(i, j, knots))) out.push([i, j]); return out; };
export const diagonal = (w, h) => Math.hypot(w, h);
/* The Śulba recipe for the diagonal of a unit square: 1 + 1/3 + 1/(3*4) - 1/(3*4*34) */
export const sulbaRoot2 = () => ({ num: 408 + 136 + 34 - 1, den: 408 });
/* Doubling a square: the square on peg vector (x, y) has area x^2 + y^2 */
export const squareArea = (x, y) => x * x + y * y;

/* ---------- Meru-prastāra and Piṅgala ---------- */
export function meru(rows) { const T = [[1]]; for (let r = 1; r < rows; r++) { const p = T[r - 1]; T.push(Array.from({ length: r + 1 }, (_, k) => (k === 0 || k === r ? 1 : p[k - 1] + p[k]))); } return T; }
export const choose = (n, k) => meru(n + 1)[n][k];
/* Piṅgala's prastāra: row 1 is all guru (G); the first syllable changes fastest. With laghu (L) as 1 and
   guru as 0, the first syllable is the ones place: row = 1 + sum of 2^i for each L at position i. */
export const rowOf = pat => 1 + [...pat].reduce((s, ch, i) => s + (ch === 'L' ? 2 ** i : 0), 0);
/* Piṅgala's naṣṭa rule: even row, write L and halve; odd row, write G, add one and halve */
export function patternOf(row, n) { let r = row, out = ''; for (let i = 0; i < n; i++) { if (r % 2 === 0) { out += 'L'; r /= 2; } else { out += 'G'; r = (r + 1) / 2; } } return out; }
export const prastara = n => Array.from({ length: 2 ** n }, (_, i) => patternOf(i + 1, n));
/* Lines lasting `beats` beats with L = 1 beat and G = 2 (the mātrā count Virahāṅka, Gopāla and Hemacandra described) */
export function beatPatterns(beats) { if (beats === 0) return ['']; if (beats < 0) return []; return [...beatPatterns(beats - 1).map(p => 'L' + p), ...beatPatterns(beats - 2).map(p => 'G' + p)]; }

/* ---------- Unlock schedule: chapter n opens on day 1 + 7(n - 1) ---------- */
export const openDay = n => 1 + 7 * (n - 1);
export const isOpen = (n, day) => day >= openDay(n);
export const openCount = (day, total = 6) => Math.max(0, Math.min(total, Math.floor((day - 1) / 7) + 1));
/* Local date key (YYYY-MM-DD) on which chapter n opens */
export function openKey(n, launch) { const d = new Date(launch + 'T12:00:00'); d.setDate(d.getDate() + 7 * (n - 1)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
/* Milliseconds from `now` until local midnight starting that day */
export const msUntil = (key, now = Date.now()) => new Date(key + 'T00:00:00').getTime() - now;
export function countdown(ms) { const m = Math.max(0, Math.ceil(ms / 60000)); const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60; return d ? `${d} day${d === 1 ? '' : 's'}, ${h} h` : h ? `${h} h ${mm} min` : `${mm} min`; }

/* ---------- Puzzles ---------- */
const L3 = (explorer, challenger, pro) => ({ explorer, challenger, pro });
const sel = (o, lv) => o[lv] ?? o.challenger;
const KP_POOL = KP_ROWS.flat();
const easyPool = () => Object.values(KP_EASY).flat();

/* Answers to compare for each kind */
export function check(p, v) {
  switch (p.kind) {
    case 'number': return Number(String(v).replace(/[\s,]/g, '')) === p.answer && String(v).trim() !== '';
    case 'choice': return v === p.answer;
    case 'kp': return Array.isArray(v) && v.length > 0 && kpDecode(v) === p.target && String(p.target).length === v.length;
    case 'bhuta': return Array.isArray(v) && v.length > 0 && bhutaDecode(v) === p.target && String(p.target).length === v.length;
    case 'order': return Array.isArray(v) && v.join() === p.answer.join();
    case 'rope': return Array.isArray(v) && isRight(ropeSides(v[0], v[1], p.knots));
    case 'square': return Array.isArray(v) && squareArea(v[0], v[1]) === p.target;
    case 'meter': return typeof v === 'string' && v.length === p.n && rowOf(v) === p.target;
    default: return false;
  }
}

/* Chapter content. Each puzzle has id, kind, title, prompt, hints, explain, answer (one valid answer),
   and solve() which recomputes the answer from the puzzle's own data. keystone: carried to chapter 6. */
const CH = [];

/* Chapter 1: Katapayadi */
CH.push({
  n: 1, id: 'parrot', title: 'The Parrot Who Spoke in Numbers', place: 'The old library, at dawn', scene: 'library', color: 'sun',
  story: L3(
    ['The old library smells of palm leaves and lamp oil. Ammini, who keeps the library, shows you an empty scroll case.', '"Someone tore the Lost Śulba Scroll into six pieces and hid them," she whispers. "My parrot Kili saw where the first piece went. But Kili only talks in numbers."'],
    ['The old library smells of palm leaves and lamp oil. Ammini, keeper of the library, opens an empty scroll case.', '"The Lost Śulba Scroll was torn into six pieces and hidden, one where only a mathematician would look. Kili, my parrot, watched the first piece go. Unfortunately Kili speaks only in Katapayadi, the old number code where every consonant is a digit."'],
    ['Dawn light slants across the shelves. Ammini, keeper of the library, lifts the lid of an empty scroll case.', '"Six pieces, six hiding places," she says. "Whoever tore the Lost Śulba Scroll wanted a mathematician to find it again. Kili, my parrot, saw the first piece go. Kili answers every question in Katapayadi: consonants become digits, and the number is spoken from its units digit up."']),
  puzzles: lv => {
    const shelf = sel(L3(['ma', 'ka'], ['ga', 'ja', 'ra'], ['bha', 'dra', 'ka', 'ma']), lv);
    const raga = sel(L3(['Kha', 'ra', 'ha', 'ra', 'pri', 'ya'], ['Me', 'ca', 'ka', 'lyā', 'ṇi'], ['Dhī', 'ra', 'śaṅ', 'ka', 'rā', 'bha', 'ra', 'ṇam']), lv);
    const drawer = sel(L3(21, 407, 3102), lv);
    const ps = [
      { id: 'c1p1', kind: 'number', keystone: true, title: 'Which shelf?', fig: { type: 'kp', syll: shelf, easy: lv === 'explorer' },
        prompt: t3(lv, `Kili squawks: "${shelf.join(' · ')}!" Find each sound in the key and write its digit. Kili says the number backwards, so flip it. Which shelf?`, `Kili squawks: "${shelf.join(' · ')}!" Turn each syllable into its digit with the key, then remember Kili starts from the units digit. Which shelf?`, `Kili: "${shelf.join(' · ')}". In a cluster such as dra only the last consonant counts. Which shelf?`),
        hints: [`Write the digit under each syllable: ${shelf[0]} is ${kpDigit(shelf[0])}.`, 'The first sound Kili makes is the ones digit. Write the digits in reverse order.', lv === 'pro' ? 'dra is d then r. Only r counts: 2.' : `The digits in order are ${kpDigits(shelf).join(', ')}. Now read them from the end.`],
        answer: kpDecode(shelf), solve() { return kpDecode(this.fig.syll); },
        explain: 'Katapayadi is a way of writing numbers as words: ka, ṭa, pa and ya each start a run of consonants that count 1, 2, 3 and so on (the name itself is ka-ṭa-pa-ya). Because many words fit the same digits, a number could hide inside a word that was easy to remember. It was used in Kerala astronomy and mathematics from at least the 7th century CE, and numbers were read from the units digit up, so the digits come out in reverse.' },
      { id: 'c1p2', kind: 'number', title: 'The humming book', fig: { type: 'kp', syll: raga.slice(0, 2), word: raga.join(''), easy: lv === 'explorer' },
        prompt: t3(lv, `On the shelf is a music book. Kili hums the name of a raga: "${raga.join('')}". Only the first two sounds, ${raga[0].toLowerCase()} and ${raga[1]}, make its number. What number?`, `A music book! Kili hums a raga: "${raga.join('')}". In Carnatic music the 72 parent ragas are numbered, and the first two syllables of each name give its number in Katapayadi. Which number is this raga?`, `A music book falls open at "${raga.join('')}". Carnatic music numbers its 72 melakarta ragas by Katapayadi on the first two syllables. Which melakarta is it?`),
        hints: ['Only the first two syllables matter.', `${raga[0].toLowerCase()} is ${kpDigit(raga[0])} and ${raga[1]} is ${kpDigit(raga[1])}.`, 'Read them backwards: the second syllable is the tens digit.'],
        answer: melakarta(raga.join('')), solve() { return melakarta(this.fig.word); },
        explain: `The 72 melakarta (parent) ragas of Carnatic music were given names, around the 18th century, whose first two syllables give the raga's number in Katapayadi. So ${raga.join('')} is number ${melakarta(raga.join(''))}, and a musician can find it in the list without a table.` },
      { id: 'c1p3', kind: 'kp', title: 'Tell Kili the drawer', fig: { type: 'kpkey', easy: lv === 'explorer' }, target: drawer,
        pool: lv === 'explorer' ? easyPool() : KP_POOL,
        prompt: t3(lv, `Ammini says the piece is in drawer ${drawer}. Tell Kili in its own language: tap a syllable for each digit, starting with the last digit.`, `The piece is in drawer ${drawer}. Build a word Kili understands: one syllable per digit, units digit first.`, `Drawer ${drawer} (3102 BCE is the traditional start of the Kali era). Encode it for Kili, units digit first. Any syllables with the right digits will do.`),
        hints: ['Start with the last digit of the number.', `The digits in Kili's order are ${String(drawer).split('').reverse().join(', ')}.`, `For example ${kpEncode(drawer, lv === 'explorer' ? easyPool() : null)[0]} gives ${String(drawer).slice(-1)}.`],
        answer: kpEncode(drawer, lv === 'explorer' ? easyPool() : null), solve() { return kpDecode(this.answer); },
        explain: 'There are many right answers: every digit has several syllables. Poets used that freedom to pick a word that also meant something, so a date or a constant could sit inside a verse.' }
    ];
    if (lv !== 'explorer') ps.push({ id: 'c1p4', kind: 'number', title: 'The carving on the drawer', fig: { type: 'kp', syll: ['ā', 'yu', 'rā', 'ro', 'gya', 'sau', 'khyam'] },
      prompt: lv === 'pro' ? 'Inside the drawer, carved in the wood: "āyurārogyasaukhyam". It is a count of days. A bare vowel is 0, in a cluster only the last consonant counts, and the final m is not followed by a vowel so it counts for nothing. How many days?' : 'Inside the drawer, carved in the wood: "ā · yu · rā · ro · gya · sau · khyam". It is a count of days! A lone vowel like ā is 0. In gya and khyam only the y counts. How many days?',
      hints: ['ā is a bare vowel: 0. yu is 1, rā is 2, ro is 2.', 'gya and khyam: only y counts, so 1 each. sau is 7.', 'Digits in order: 0, 1, 2, 2, 1, 7, 1. Now read them backwards.'],
      answer: kpDecodeWord('āyurārogyasaukhyam'), solve() { return kpDecode(this.fig.syll); },
      explain: 'This is real. The Sanskrit poem Nārāyaṇīyam, finished in Kerala in 1586, ends with "āyurārogyasaukhyam" ("long life, health and happiness"). In Katapayadi it is also 1712210: the number of days since the start of the Kali era, which dates the poem to the day.' });
    return ps;
  }
});

/* Chapter 2: Śulba rope geometry */
CH.push({
  n: 2, id: 'river', title: 'Rope by the River', place: 'The riverbank altar ground, morning', scene: 'river', color: 'teal',
  story: L3(
    ['The second piece is buried at the corner of an old altar by the river. But the corner has washed away!', 'Ammini hands you a rope with 12 knots, all the same distance apart. "Long ago, altar builders made perfect square corners with just a rope and some pegs," she says.'],
    ['The second piece lies under the corner of an old fire altar on the riverbank, but floods have smoothed the sand. Ammini hands you a loop of rope with 12 knots spaced evenly.', '"The altar builders who wrote the Śulba Sūtras made true square corners with rope and pegs. Make one, and you will know where to dig."'],
    ['The second piece lies under a corner of an old altar outline on the riverbank. The floods have erased the corner. Ammini hands you a loop of rope with 12 evenly spaced knots.', '"The Śulba Sūtras are rope manuals for building fire altars: right angles, squares of double area, circles of equal area. Make a right angle and you will find the corner."']),
  puzzles: lv => {
    const rect = sel(L3([3, 4], [5, 12], [8, 15]), lv);
    const base = sel(L3(1, 3, 5), lv);
    const ps = [
      { id: 'c2p1', kind: 'rope', title: 'A square corner from a rope', knots: 12,
        prompt: t3(lv, 'One peg is fixed. Slide the other two pegs along the rope until one corner of the triangle is a perfect square corner.', 'Peg A is fixed at knot 0. Slide pegs B and C along the 12-knot loop. Make a triangle with a right angle (a square corner).', 'Peg A is fixed. Place B and C on knots of the 12-knot loop so the triangle has a right angle. Which side lengths work?'),
        hints: ['Try making the sides different lengths.', 'Try sides of 3 and 4 knots.', 'Pegs at knots 3 and 7 make sides 3, 4 and 5.'],
        answer: [3, 7], solve() { return rightSettings(this.knots)[0]; },
        explain: 'Sides of 3, 4 and 5 make a right angle, because 3 × 3 + 4 × 4 = 5 × 5. The Śulba Sūtras (rope rules) of Baudhāyana, Āpastamba and Kātyāyana are appendices to the Kalpa Sūtras, written in the late Vedic period, roughly 800 to 200 BCE. They use triples like 3, 4, 5 and 5, 12, 13 to lay out altar corners with rope.' },
      { id: 'c2p2', kind: 'number', keystone: true, title: 'Along the diagonal', fig: { type: 'rect', w: rect[0], h: rect[1] },
        prompt: t3(lv, `The old altar was a rectangle ${rect[0]} rods by ${rect[1]} rods. The piece is buried at the far end of the rope stretched corner to corner. How long is that rope? (Your triangle can help.)`, `The altar outline is a rectangle ${rect[0]} by ${rect[1]} rods. The piece is at the end of the diagonal rope. How many rods long is the diagonal?`, `The altar is ${rect[0]} by ${rect[1]} rods. How long is the rope along its diagonal?`),
        hints: [lv === 'explorer' ? 'Look at the triangle you just made with the rope.' : 'The diagonal and two sides make a right triangle.', `Square the sides: ${rect[0]} × ${rect[0]} and ${rect[1]} × ${rect[1]}, then add.`, `${rect[0] ** 2} + ${rect[1] ** 2} = ${rect[0] ** 2 + rect[1] ** 2}. Which number times itself makes that?`],
        answer: diagonal(rect[0], rect[1]), solve() { return diagonal(this.fig.w, this.fig.h); },
        explain: 'Baudhāyana states it this way: the rope stretched along the diagonal of a rectangle makes an area as large as the two areas made by its length and its width together. Today we call it the Pythagorean theorem, but this statement is in the Śulba Sūtras, independently of Greece.' },
      { id: 'c2p3', kind: 'square', title: 'Double the square', base, target: 2 * base * base,
        prompt: t3(lv, `The piece is wrapped in a cloth square with sides of ${base}. Ammini needs a square twice as big. Drag the peg to make a new square with double the area.`, `The cloth square has side ${base}, area ${base * base}. Drag the peg to build a square on the rope with exactly double the area, ${2 * base * base}.`, `Build a square with exactly double the area of the ${base} by ${base} square (area ${2 * base * base}). Drag the peg; can you find more than one answer?`),
        hints: ['A tilted square can be bigger than it looks.', 'Try putting the peg on the diagonal of the small square.', `Peg at ${base} across and ${base} up: the new square sits on the diagonal.`],
        answer: [base, base], solve() { return [this.base, this.base]; },
        explain: 'The square on the diagonal of a square has double its area. The Śulba Sūtras give this as the way to double a square altar. The rope along the diagonal of a unit square is √2 long, a number that cannot be written as a fraction exactly.' }
    ];
    if (lv !== 'explorer') ps.push(lv === 'pro'
      ? { id: 'c2p4', kind: 'number', title: 'The recipe in the margin', fig: { type: 'recipe', pro: true },
        prompt: 'In the margin: the diagonal of a square is the side, increased by its third, and this third by its own fourth, less the thirty-fourth part of that fourth. For a side of 1, write it as one fraction over 408. What is the top number?',
        hints: ['1 + 1/3 + 1/(3 × 4) − 1/(3 × 4 × 34).', '408 = 3 × 4 × 34. So 1 = 408/408 and 1/3 = 136/408.', '1/12 = 34/408, and the last part is 1/408.'],
        answer: 577, solve() { return sulbaRoot2().num; },
        explain: 'Baudhāyana\'s recipe gives 577/408 = 1.4142157, while √2 = 1.4142136. They agree to five decimal places, a remarkable value for rope geometry more than two thousand years old.' }
      : { id: 'c2p4', kind: 'number', title: 'The recipe in the margin', fig: { type: 'recipe' },
        prompt: 'In the margin: to get the diagonal of a square with side 1, take 1, add a third, then add a third of a fourth. Write 1 + 1/3 + 1/12 as one fraction over 12. What is the top number?',
        hints: ['1 = 12/12.', '1/3 = 4/12.', '12 + 4 + 1.'],
        answer: 17, solve() { return 12 + 4 + 1; },
        explain: '17/12 = 1.4167, already close to √2 = 1.4142. Baudhāyana\'s full recipe then subtracts a tiny bit more, 1/408, giving 577/408 = 1.4142157, correct to five decimal places.' });
    return ps;
  }
});

/* Chapter 3: Meru-prastāra */
CH.push({
  n: 3, id: 'meru', title: 'The Mountain of Syllables', place: 'The hill shrine steps, afternoon', scene: 'mountain', color: 'coral',
  story: L3(
    ['Kili flies up a hill to a staircase of numbered stones, stacked like a mountain. One stone is missing!', 'Ammini smiles. "Each stone is the two stones above it added together. Put the right number back and the mountain will give up its piece."'],
    ['Kili leads you up the hill to a stone staircase built like a mountain, a triangle of numbered stones. A stone is missing, and the third piece is said to sit behind it.', '"This is the Meru-prastāra," says Ammini, "the staircase of Mount Meru. Every stone is the sum of the two above it."'],
    ['On the hilltop: a triangle of numbered stones, the Meru-prastāra. One stone is missing; the third piece sits behind it.', '"Piṅgala used it to count poetic meters," Ammini says. "Halāyudha described how to build it, stone by stone, in his commentary a thousand years ago."']),
  puzzles: lv => {
    const hide = sel(L3([4, 2], [5, 2], [6, 3]), lv);
    const cnt = sel(L3([3, 1], [4, 2], [6, 2]), lv);
    const row = sel(L3(3, 5, 8), lv);
    const ps = [
      { id: 'c3p1', kind: 'number', keystone: true, title: 'The missing stone', fig: { type: 'meru', rows: hide[0] + 1, hide },
        prompt: t3(lv, 'Each stone is the two stones above it added together. What number goes on the missing stone?', 'Every stone is the sum of the two stones just above it. What is written on the missing stone?', 'Find the missing stone. Bonus thought: could you find it without the rows above?'),
        hints: ['Look at the two stones just above the gap.', 'Add those two numbers.', `${choose(hide[0] - 1, hide[1] - 1)} + ${choose(hide[0] - 1, hide[1])}.`],
        answer: choose(hide[0], hide[1]), solve() { return meru(this.fig.rows)[this.fig.hide[0]][this.fig.hide[1]]; },
        explain: 'Piṅgala\'s Chandaḥśāstra (often dated to the last centuries BCE) gives rules for counting meters, and Halāyudha\'s 10th-century commentary describes building them as this triangle, the Meru-prastāra. Europe later named it after Pascal (1654); it was also known to al-Karajī in Persia and Yang Hui in China.' },
      { id: 'c3p2', kind: 'number', title: 'How many poems?', fig: { type: 'syllables', n: cnt[0], k: cnt[1] },
        prompt: t3(lv, `A poet writes lines of ${cnt[0]} sounds. Exactly ${cnt[1]} must be long (guru), the rest short (laghu). How many different lines can she make?`, `A line of ${cnt[0]} syllables, exactly ${cnt[1]} long (guru) and the rest short (laghu). How many different lines? The mountain knows.`, `How many lines of ${cnt[0]} syllables have exactly ${cnt[1]} guru syllables? Use the Meru.`),
        hints: [lv === 'explorer' ? 'Try writing them: the long one first, then in the middle...' : 'Write a few: where can the long syllables go?', `Look at row ${cnt[0]} of the mountain (the top stone is row 0).`, `Count along that row: stone number ${cnt[1]}, starting from 0.`],
        answer: choose(cnt[0], cnt[1]), solve() { return choose(this.fig.n, this.fig.k); },
        explain: 'Row n of the Meru-prastāra counts the lines of n syllables: the stone k places along tells how many have exactly k guru syllables. Choosing where the long syllables go is what we now call combinations.' },
      { id: 'c3p3', kind: 'number', title: 'All of them', fig: { type: 'meru', rows: Math.min(row, 6) + 1, hide: null, sumRow: row <= 5 ? row : null },
        prompt: t3(lv, `Now count every line with ${row} sounds, any mix of long and short. Add up row ${row}!`, `How many lines of ${row} syllables are there in total, any mix of long and short? (Add the whole row ${row}.)`, `How many lines of ${row} syllables are there in all? Row ${row} is not drawn: find a shortcut from the rows you can see.`),
        hints: ['Add up the first few rows: 1, 2, 4...', 'Each row adds up to double the row above.', `Double ${row} times: 2 × 2 × ... = ${2 ** (row - 1)} × 2.`],
        answer: 2 ** row, solve() { return meru(row + 1)[row].reduce((a, b) => a + b, 0); },
        explain: 'Each syllable is long or short: 2 choices, so n syllables give 2 × 2 × ... × 2 = 2ⁿ lines. Each row of the Meru adds up to a power of 2.' }
    ];
    if (lv !== 'explorer') {
      const stick = lv === 'pro' ? [1, 4, 10, 20, 35] : [1, 3, 6, 10];
      const m = stick.length; const k = lv === 'pro' ? 3 : 2;
      ps.push({ id: 'c3p4', kind: 'number', title: 'The hockey stick', fig: { type: 'meru', rows: (k + m) + 1, hide: [k + m, k + 1], stick: { k, len: m } },
        prompt: `Add the stones running down the slope: ${stick.join(' + ')}. The total is already on the mountain, just below and to the side. What is it?`,
        hints: ['Just add them up.', 'Now look one row below the last stone you added.', 'The total is the stone below and beside the last one.'],
        answer: stick.reduce((a, b) => a + b, 0), solve() { return choose(k + m, k + 1); },
        explain: 'Any run down a diagonal of the Meru adds up to the stone just below the end of the run, turned the other way. It is called the hockey stick pattern, for its shape.' });
    }
    return ps;
  }
});

/* Chapter 4: Piṅgala's prastāra */
CH.push({
  n: 4, id: 'poet', title: 'The Poet\'s Lock', place: 'The poet\'s house, evening lamplight', scene: 'chest', color: 'sun',
  story: L3(
    ['In an old poet\'s house there is a wooden chest with a strange lock: a row of dials, each showing a short mark or a long mark.', 'Ammini reads the label: "Open me at the right row of the poet\'s list." The fourth piece must be inside.'],
    ['In the poet\'s house stands a chest whose lock is a row of syllable dials. Each dial shows laghu (short, a dot) or guru (long, a bar).', '"Piṅgala listed every pattern of short and long syllables in a fixed order, the prastāra," says Ammini. "The lock opens at a row of that list."'],
    ['The poet\'s chest: a lock of syllable dials, each laghu (L, short) or guru (G, long). Engraved inside the lid is the start of Piṅgala\'s prastāra, his ordered list of every pattern.', '"The prastāra counts in base two," Ammini says. "Piṅgala gave rules to go from a pattern to its row and back, more than two thousand years ago."']),
  puzzles: lv => {
    const n = sel(L3(3, 4, 6), lv);
    const pat = sel(L3('LLG', 'GLGL', 'LGGLLG'), lv);
    const tgt = sel(L3(6, 10, 22), lv);
    const tn = sel(L3(3, 4, 5), lv);
    const beats = sel(L3(3, 5, 7), lv);
    return [
      { id: 'c4p1', kind: 'number', keystone: true, title: 'Which row?', fig: { type: 'prastara', n, show: lv === 'explorer' ? 8 : lv === 'challenger' ? 6 : 5, ask: pat },
        prompt: t3(lv, `Here is the poet\'s list of all ${2 ** n} patterns of ${n} sounds. The lock shows ${pat}. Which row is it in?`, `The list starts as shown. The lock shows ${pat}. Find its row number (keep the list going, or find the rule).`, `The lock shows ${pat}. Which row of the ${n}-syllable prastāra is it? Find the rule rather than writing out ${2 ** n} rows.`),
        hints: ['Look at the first syllable as you go down the list: G, L, G, L...', 'Each place is worth double the place before: 1, 2, 4, 8... Add the value of every L.', `L in place 1 is worth 1, place 2 is worth 2, place 3 is worth 4. Add them, then add 1.`],
        answer: rowOf(pat), solve() { return prastara(n).indexOf(this.fig.ask) + 1; },
        explain: 'Piṅgala\'s prastāra lists the patterns so that the first syllable flips every row, the second every two rows, the third every four. Reading L as 1 and G as 0, the row is a binary number plus one. Piṅgala\'s Chandaḥśāstra is one of the oldest known uses of this doubling idea, long before Leibniz wrote about binary in 1703.' },
      { id: 'c4p2', kind: 'meter', title: 'Set the dials', n: tn, target: tgt,
        prompt: t3(lv, `Now set the ${tn} dials to row ${tgt} of the list. Tap a dial to switch it between short (L) and long (G).`, `Set the ${tn} dials to row ${tgt}. Tap a dial to switch between L and G.`, `Set the ${tn} dials to row ${tgt}. Piṅgala\'s rule: if the row is even, write L and halve it; if odd, write G, add one and halve.`),
        hints: ['Row 1 is all G. Row 2 changes only the first dial.', `Piṅgala\'s rule: ${tgt} is ${tgt % 2 ? 'odd, so the first dial is G' : 'even, so the first dial is L'}. Then halve${tgt % 2 ? ' after adding one' : ''}.`, `The answer starts ${patternOf(tgt, tn).slice(0, 2)}.`],
        answer: patternOf(tgt, tn), solve() { return patternOf(this.target, this.n); },
        explain: 'Piṅgala called this naṣṭa, finding a lost pattern from its row number, and its reverse uddiṣṭa. Halving and noting even or odd is exactly how we turn a number into binary today.' },
      { id: 'c4p3', kind: 'number', title: 'The drummer\'s count', fig: { type: 'beats', beats },
        prompt: t3(lv, `A drummer plays short beats (1 count) and long beats (2 counts). How many different ways can she fill ${beats} counts?`, `Short syllables last 1 beat, long ones 2. How many different lines last exactly ${beats} beats?`, `With L = 1 beat and G = 2 beats, how many patterns last exactly ${beats} beats? Look for the pattern from 1, 2, 3 beats upward.`),
        hints: ['1 beat: just L. 2 beats: LL or G. 3 beats: LLL, LG, GL.', 'Each count is the two before added together: 1, 2, 3, 5...', `Keep going until ${beats} beats.`],
        answer: beatPatterns(beats).length, solve() { return beatPatterns(this.fig.beats).length; },
        explain: 'The counts 1, 2, 3, 5, 8, 13, 21... grow by adding the two before. Indian prosodists found this while counting meters by beats (mātrās): Virahāṅka (between the 6th and 8th centuries), then Gopāla and Hemacandra (around 1150), before Fibonacci\'s book of 1202.' }
    ];
  }
});

/* Chapter 5: Bhūta-saṅkhyā */
CH.push({
  n: 5, id: 'stars', title: 'The Star-Counter\'s Words', place: 'The observatory roof, night', scene: 'night', color: 'teal',
  story: L3(
    ['At night Ammini takes you up to a rooftop full of stars. A star-counter once lived here, and wrote her numbers with words: "moon" meant 1, "eyes" meant 2!', 'The fifth piece is locked in a star box.'],
    ['On the observatory roof the stars are out. The star-counter who worked here wrote numbers as words for things: the moon is 1 (there is one), eyes are 2, the Vedas are 4.', 'This is bhūta-saṅkhyā, "object numbers". The fifth piece is in a star box with a word lock.'],
    ['The observatory roof, under the stars. Astronomers here wrote numbers in bhūta-saṅkhyā, object words: one moon, two eyes, four Vedas, five arrows of Kāma, seven sages. Like Katapayadi, the units digit comes first.', 'The fifth piece waits in a star box with a word lock.'])
  ,
  puzzles: lv => {
    const dec = sel(L3(['netra', 'candra'], ['rasa', 'agni', 'veda'], ['bāṇa', 'ṛtu', 'kha', 'vasu']), lv);
    const enc = sel(L3(31, 205, 2026), lv);
    const pool = lv === 'explorer' ? BHUTA.filter(e => ['śūnya', 'candra', 'netra', 'agni', 'veda', 'bāṇa', 'ṛtu', 'ṛṣi', 'vasu', 'graha'].includes(e.w)).map(e => e.w) : BHUTA.map(e => e.w);
    return [
      { id: 'c5p1', kind: 'number', keystone: true, title: 'Words to number', fig: { type: 'bhuta', words: dec, pool },
        prompt: t3(lv, `The box says: ${dec.map(w => `"${w}" (${bhutaEn(w)})`).join(', ')}. Change each word to its number, then read them backwards.`, `The star box reads: "${dec.join(' · ')}". Turn each word into a digit and remember: units first. What is the number?`, `"${dec.join(' · ')}". What number?`),
        hints: [`${dec[0]} means ${bhutaEn(dec[0])}: how many are there?`, `The digits in order: ${dec.map(bhutaDigit).join(', ')}.`, 'The first word is the units digit, so read them from the end.'],
        answer: bhutaDecode(dec), solve() { return bhutaDecode(this.fig.words); },
        explain: 'Bhūta-saṅkhyā wrote each digit as a word for something that comes in that number, with many synonyms so verses could keep their meter. Varāhamihira\'s Pañcasiddhāntikā (6th century CE), for example, gives its starting year as "seven, Aśvins, Vedas": 7, 2, 4, read backwards as Śaka year 427.' },
      { id: 'c5p2', kind: 'bhuta', title: 'Number to words', target: enc, pool,
        prompt: t3(lv, `Lock the box again with the number ${enc}. Tap a word for each digit, starting with the last digit.`, `Write ${enc} in object words, units digit first.`, `Write ${enc} in bhūta-saṅkhyā. Any correct words will do.`),
        hints: ['Start with the last digit.', `In order: ${String(enc).split('').reverse().join(', ')}.`, `For 0 use śūnya (emptiness) or kha (sky).`],
        answer: bhutaEncode(enc), solve() { return bhutaDecode(this.answer); },
        explain: 'Sanskrit has many words for each object (moon: candra, indu, śaśin...), so a poet could fit a number into any meter.' },
      { id: 'c5p3', kind: 'choice', title: 'The star chart', options: ['ṛṣi · netra', 'netra · ṛṣi', 'veda · ṛṣi', 'gaja · netra'],
        prompt: t3(lv, 'The Moon passes through 27 star groups (nakṣatras). Which words on the chart say 27?', 'There are 27 nakṣatras, the star groups along the Moon\'s path. Which phrase means 27?', 'Which phrase on the star chart encodes 27, the number of nakṣatras?'),
        hints: ['27: the units digit is 7.', 'The first word should mean 7.', 'ṛṣi: the seven sages.'],
        answer: 'ṛṣi · netra', solve() { return this.options.find(o => bhutaDecode(o.split(' · ')) === 27); },
        explain: 'ṛṣi (the seven sages) then netra (two eyes): 7 then 2, read backwards as 27. The 27 nakṣatras divide the Moon\'s path around the sky, about one for each day of its circuit.' }
    ];
  }
});

/* Chapter 6: the meta puzzle, built from the keystones of chapters 1 to 5 */
export const keystones = lv => CH.slice(0, 5).map(c => c.puzzles(lv).find(p => p.keystone).answer);
CH.push({
  n: 6, id: 'whole', title: 'The Scroll Made Whole', place: 'The library, the next dawn', scene: 'scroll', color: 'coral',
  story: L3(
    ['Back in the library you lay out the five pieces. Each one has a number written on its back: the answers you found!', 'The last piece is in Ammini\'s own scroll case, with a lock that only opens for someone who remembers the whole journey.'],
    ['Back in the library at dawn, the five pieces lie on the table. On the back of each is a number: the key answer from its chapter.', 'Ammini\'s scroll case holds the sixth piece, and its lock asks about everything you have learned.'],
    ['Dawn again. Five pieces on the table, each marked with its keystone answer. The sixth is in Ammini\'s case, behind a lock that uses all five.', '"Whoever tore the scroll," she says, "wanted the finder to be a mathematician. Show the case you are one."']),
  puzzles: lv => {
    const K = keystones(lv), names = ['Kili\'s shelf', 'the diagonal rope', 'the missing stone', 'the poet\'s row', 'the star box'];
    const seal = K[1] + K[2] + K[3];
    const ps = [
      { id: 'c6p1', kind: 'order', title: 'Lay out the pieces', items: K.map((k, i) => ({ id: `k${i + 1}`, label: `${names[i]}: ${k}` })),
        prompt: t3(lv, 'The case says: "Lay the pieces from the smallest number to the biggest." Tap them in order.', 'The lid reads: "Lay the pieces out from least to greatest." Tap them in order.', '"Least to greatest," says the lid. Tap the pieces in order.'),
        hints: ['Find the smallest number first.', 'Compare the number of digits first.', `The smallest is ${Math.min(...K)}.`],
        answer: K.map((k, i) => ({ k, id: `k${i + 1}` })).sort((a, b) => a.k - b.k).map(x => x.id), solve() { return this.items.map(it => ({ it, k: +it.label.split(': ')[1] })).sort((a, b) => a.k - b.k).map(x => x.it.id); },
        explain: 'Comparing numbers: first by how many digits they have, then digit by digit from the left.' },
      { id: 'c6p2', kind: 'number', keystone: true, title: 'The seal', fig: { type: 'keys', K, names },
        prompt: `The seal says: "Add the diagonal rope (${K[1]}), the missing stone (${K[2]}) and the poet's row (${K[3]})."${lv === 'explorer' ? ' Look: you have seen this number before!' : ''}`,
        hints: ['Add two of them first.', `${K[1]} + ${K[2]} = ${K[1] + K[2]}.`, `Now add ${K[3]}.`],
        answer: seal, solve() { return K[1] + K[2] + K[3]; },
        explain: lv === 'explorer' ? 'It is 15, the same as Kili\'s very first shelf! The scroll\'s maker loved a circle.' : 'Rope geometry, the Meru and Piṅgala\'s list: three traditions, one number.' },
      { id: 'c6p3', kind: 'bhuta', title: 'Speak the star words', target: seal, pool: BHUTA.map(e => e.w),
        prompt: `The case answers only to object words. Write ${seal} in bhūta-saṅkhyā, units digit first.`,
        hints: ['Units digit first.', `The digits in that order: ${String(seal).split('').reverse().join(', ')}.`, `For example: ${bhutaEncode(seal).join(' · ')}.`],
        answer: bhutaEncode(seal), solve() { return bhutaDecode(this.answer); },
        explain: 'Two number codes, one idea: digits as words, units first.' }
    ];
    if (lv !== 'explorer') ps.push({ id: 'c6p4', kind: 'kp', title: 'Kili\'s password', target: seal, pool: KP_POOL, fig: { type: 'kpkey' },
      prompt: `Last of all, Kili must say ${seal} in Katapayadi. Build the word.`,
      hints: ['Units digit first.', `Digits in that order: ${String(seal).split('').reverse().join(', ')}.`, `For example: ${kpEncode(seal).join(' · ')}.`],
      answer: kpEncode(seal), solve() { return kpDecode(this.answer); },
      explain: 'Katapayadi and bhūta-saṅkhyā both let a number live inside words, and both were used across India for astronomy, mathematics and music.' });
    return ps;
  }
});

function t3(lv, e, c, p) { return lv === 'explorer' ? e : lv === 'pro' ? p : c; }
export const CHAPTERS = CH;
export const chapter = n => CH.find(c => c.n === +n);
export const puzzlesFor = (n, lv) => chapter(n).puzzles(lv);
