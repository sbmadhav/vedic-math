/* The Respelling and Devanagari of every Sutra name (openspec sutra-pronunciation): js/sutras.js stores what
   tools/sutra-voice/sanskrit.mjs makes from the IAST in tools/sutra-voice/names.mjs, so a change to one is a change
   to both. Spot checks pin the rules the research doc describes (docs/sutra-pronunciation.md). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SUTRAS, SUBSUTRAS } from '../js/sutras.js';
import { NAMES, appId } from '../tools/sutra-voice/names.mjs';
import { toDeva, toIPA, respell, syllables, beat } from '../tools/sutra-voice/sanskrit.mjs';

const ALL = [...SUTRAS.map(c => ['s' + c.n, c]), ...SUBSUTRAS.map(c => ['u' + c.n, c])];
const byId = Object.fromEntries(ALL);

test('every one of the 29 names has a say and deva that equal the generator', () => {
  assert.equal(ALL.length, 29);
  assert.equal(NAMES.length, 29);
  for (const n of NAMES) {
    const c = byId[appId(n.id)];
    assert.ok(c, n.id);
    assert.equal(c.name, n.app, `${n.id}: names.mjs follows js/sutras.js`);
    assert.equal(c.say, respell(n.say), `${n.id} say`);
    assert.equal(c.deva, toDeva(n.say), `${n.id} deva`);
    assert.equal(c.meaning, n.meaning, `${n.id} meaning`);
  }
});

test('spot checks: Sutra 1, Sutra 2, sub-sutra 8, the visarga echo', () => {
  assert.equal(byId.s1.say, 'ay-kah-dhi-KAY-nuh poor-VAY-nuh');
  assert.equal(byId.s1.deva, 'एकाधिकेन पूर्वेण');
  assert.equal(byId.s2.deva, 'निखिलं नवतश्चरमं दशतः');
  assert.ok(byId.u8.deva.includes('ऽ'));
  assert.equal(toIPA('Daśataḥ'), 'dˈəʃətəhə'); // the beat mark sits before the vowel, as in Kokoro's own phonemes
});

test('the beat rule: Yāvadūnam beats on DOO, Vilokanam on LOH', () => {
  assert.equal(respell('Yāvadūnam'), 'yah-vuh-DOO-nuhm');
  assert.equal(respell('Vilokanam'), 'vi-LOH-kuh-nuhm');
  assert.equal(beat(syllables('vilokanam')), 1);
});

test('the three corrected meanings (owner, 2026-10-17)', () => {
  assert.equal(byId.u10.meaning, 'The product of the sums');
  assert.equal(byId.s9.meaning, 'By motion and reckoning (calculus)');
  assert.equal(byId.u4.meaning, 'For 7, multiply by 143');
});

test('no Respelling or Devanagari has an em dash', () => {
  for (const [, c] of ALL) { assert.doesNotMatch(c.say, /—/); assert.doesNotMatch(c.deva, /—/); }
});
