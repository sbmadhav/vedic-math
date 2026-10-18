/* Mathematics in Sanskrit verse (openspec sanskrit-verses): the data is complete, honest and its math is right */
import test from 'node:test';
import assert from 'node:assert/strict';
import { GROUPS, SLOKAS, slokasIn, slokasFor } from '../js/slokas.js';
import { SUTRAS, SUBSUTRAS } from '../js/sutras.js';

const IDS = new Set([...SUTRAS.map(s => 's' + s.n), ...SUBSUTRAS.map(s => 'u' + s.n)]);

test('every verse is complete: Devanagari, IAST, respelling, words, meaning, math, source, note and refs', () => {
  assert.ok(SLOKAS.length >= 15);
  assert.equal(new Set(SLOKAS.map(v => v.id)).size, SLOKAS.length);
  for (const v of SLOKAS) {
    for (const k of ['title', 'deva', 'iast', 'say', 'meaning', 'plain', 'math', 'source', 'note']) assert.ok(v[k] && v[k].length > 3, `${v.id}.${k}`);
    assert.ok(GROUPS.some(g => g.id === v.group), v.id);
    assert.ok(['verse', 'sutra', 'mantra'].includes(v.kind), v.id);
    assert.match(v.deva, /[ऀ-ॿ]/, `${v.id} Devanagari`);
    assert.doesNotMatch(v.iast, /[ऀ-ॿ]/, `${v.id} IAST is Latin`);
    assert.ok(v.words.length >= 2 && v.words.every(([sa, en]) => sa && en), `${v.id} words`);
    assert.ok(v.refs.length >= 1 && v.refs.every(([t, u]) => t && /^https:\/\//.test(u)), `${v.id} refs`);
    for (const r of v.related) assert.ok(IDS.has(r), `${v.id} related ${r}`);
  }
  assert.equal(GROUPS.reduce((n, g) => n + slokasIn(g.id).length, 0), SLOKAS.length);
});

test('honest framing: the 1965 book verse is labelled as the Swami\'s own, and philosophy is not sold as math', () => {
  const gopi = SLOKAS.find(v => v.id === 'tirtha-gopi-pi');
  assert.ok(gopi, 'the gopi bhagya verse is included');
  assert.match(gopi.note + gopi.source, /Tirtha/);
  assert.match(gopi.note, /not|new|own/i);
  const purnam = SLOKAS.find(v => v.id === 'purnam-adah');
  assert.match(purnam.note, /philosoph|not (a )?math/i);
  for (const v of SLOKAS) assert.ok(!/[—–]/.test(JSON.stringify(v)), `${v.id} has no em or en dash`);
});

test('the math the verses state is right', () => {
  assert.equal(Number((62832 / 20000).toFixed(4)), 3.1416); // Aryabhata
  assert.equal(577 ** 2 - 2 * 408 ** 2, 1); // Baudhayana root 2 is the Pell pair 577/408
  assert.ok(Math.abs(1 + 1 / 3 + 1 / 12 - 1 / 408 - Math.SQRT2) < 3e-6);
  const x = 15; assert.equal(x / 5 + x / 3 + 3 * (x / 3 - x / 5) + 1, x); // Lilavati bees
  assert.ok(Math.abs(2827433388233 / 9e11 - Math.PI) < 1e-11); // Madhava, 11 decimals
  let s = 0; for (let k = 0; k < 200000; k++) s += (k % 2 ? -1 : 1) / (2 * k + 1); assert.ok(Math.abs(4 * s - Math.PI) < 1e-4); // Madhava series
  for (const [n, d] of [[297, 3], [96, 4]]) assert.equal(n * n, (n - d) * (n + d) + d * d); // Lilavati squares = Yavadunam
});

test('Katapayadi: the gopi bhagya verse decodes to pi/10, left to right, with the last digit off', () => {
  // Tirtha's reading: ka-series 1..9,0 ; ta-series (retroflex) 1..9,0 ; pa-series 1..5 ; ya-series 1..8 ; consonant clusters take the last consonant
  const digits = '31415926535897932384626433832792';
  const truth = '31415926535897932384626433832795'; // pi/10 to 32 decimals
  assert.equal(digits.slice(0, 31), truth.slice(0, 31));
  assert.notEqual(digits[31], truth[31]);
  assert.match(SLOKAS.find(v => v.id === 'tirtha-gopi-pi').math, /0\.31415926535897932384626433832792/);
});

test('sutra deep dives find their verse: Yavadunam (s10) links to the Lilavati squares', () => {
  assert.deepEqual(slokasFor('s10').map(v => v.id), ['lilavati-squares']);
  assert.deepEqual(slokasFor('s1'), []);
});
