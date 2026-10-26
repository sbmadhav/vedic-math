/* Sutra progress (openspec change sutras-first, spec sutra-progress): counted from what the device keeps, over the
   Tricks a card lists, with nothing written; the line in each Mode's words. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { SUTRAS, SUBSUTRAS } from '../js/sutras.js';
import { progressOf, progressLine, trickLine, STARS_PER_TRICK } from '../js/sutra-progress.js';

const card = n => SUTRAS.find(c => c.n === n);
/* A record as readers: lit Stars by key, mastered and started Skill ids, Katas done per Trick */
function reader({ lit = [], mastered = [], started = [], katas = {}, collected = false } = {}) {
  const calls = [];
  const r = {
    starState: (t, n) => (calls.push('star'), lit.includes(`${t}:${n}`) ? 'lit' : 'open'),
    mastered: id => mastered.includes(id), started: id => started.includes(id) || mastered.includes(id),
    katasDone: t => katas[t] || 0, collected: () => collected
  };
  return { r, calls };
}

test('Ekādhikena Pūrveṇa with two of nine Stars lit and Square numbers ending in 5 mastered', () => {
  const rec = { lit: ['sq5:1', 'recip:2'], mastered: ['v-sq5'], katas: { sq5: 4 } };
  const frozen = JSON.stringify(rec);
  const p = progressOf(card(1), reader(rec).r, { katasPer: 50 });
  assert.equal(p.tricks, 3); assert.equal(p.stars, 9); assert.equal(p.lit, 2); assert.equal(p.mastered, 1);
  assert.equal(p.katas, 4); assert.equal(p.katasTotal, 150); assert.equal(p.begun, true);
  assert.equal(progressLine(p, 'challenger'), '2 of 9 Stars lit');
  assert.equal(progressLine(p, 'pro'), '2 of 9 Stars lit · 1 of 3 Tricks mastered');
  assert.equal(progressLine(p, 'explorer'), '1 of 3 tricks practiced');
  assert.equal(p.share('challenger'), 2 / 9); assert.equal(p.share('explorer'), 1 / 3);
  assert.equal(JSON.stringify(rec), frozen, 'the record is unchanged');
});

test('a new Player: nothing begun, and a card with no Trick says so', () => {
  const p = progressOf(card(2), reader().r);
  assert.equal(p.begun, false); assert.equal(progressLine(p, 'challenger'), '0 of 9 Stars lit');
  const none = progressOf(card(8), reader().r);
  assert.equal(none.tricks, 0); assert.equal(none.share('pro'), 0);
  assert.match(progressLine(none, 'challenger'), /^No trick for this one yet/);
  assert.match(progressLine(none, 'explorer'), /^No trick for this one yet/);
});

test('every card counts only the Tricks it lists, three Stars each', () => {
  for (const c of [...SUTRAS, ...SUBSUTRAS]) {
    const p = progressOf(c, reader().r);
    assert.equal(p.tricks, c.tricks.length, c.name); assert.equal(p.stars, c.tricks.length * STARS_PER_TRICK, c.name);
  }
});

test('one line per Trick in the Deep dive', () => {
  assert.equal(trickLine({ lit: 1, mastered: false, started: true }, 'challenger'), '1 of 3 Stars lit');
  assert.equal(trickLine({ lit: 3, mastered: true, started: true }, 'pro'), '3 of 3 Stars lit · mastered');
  assert.equal(trickLine({ lit: 0, mastered: false, started: true }, 'explorer'), 'Practiced');
  assert.equal(trickLine({ lit: 0, mastered: false, started: false }, 'explorer'), 'New');
});
