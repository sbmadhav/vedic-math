/* Copy accuracy: ordinals, the hundredths picture and related videos say what is true. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ordinal } from '../js/lib.js';
import { hundredGrid } from '../js/viz.js';
import { relatedTo } from '../js/related.js';
import { VIDEOS } from '../js/videos.js';
import { byId } from '../js/skills/index.js';
import { seeded } from '../js/levels.js';

test('ordinals', () => {
  const want = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 11: '11th', 12: '12th', 13: '13th', 21: '21st', 22: '22nd', 23: '23rd', 101: '101st', 111: '111th', 112: '112th' };
  for (const [n, s] of Object.entries(want)) assert.equal(ordinal(+n), s);
});

test('the multiples question never says 2th or 3th', () => {
  const qs = seeded('ordinal-sweep', () => Array.from({ length: 200 }, () => byId['4-factors'].gen(1).q));
  const multiples = qs.filter(q => /multiple of/.test(q));
  assert.ok(multiples.length > 20);
  multiples.forEach(q => assert.ok(!/(^|[^1\d])[123]th\b/.test(q), q));
  assert.ok(multiples.some(q => /\b(2nd|3rd)\b/.test(q)), 'some draws ask for the 2nd or 3rd');
});

test('hundredths show a 10 by 10 grid with the right squares shaded', () => {
  const shaded = svg => (svg.match(/class="vz-coral vz-blk"/g) || []).length, all = svg => (svg.match(/<rect /g) || []).length;
  assert.equal(shaded(hundredGrid(25)), 25); assert.equal(all(hundredGrid(25)), 100);
  assert.equal(shaded(hundredGrid(4)), 4);
  assert.match(hundredGrid(4), /aria-label="4 out of 100 equal squares shaded"/);
  // the skill uses it for every hundredths question
  const ps = seeded('hundredths-sweep', () => Array.from({ length: 200 }, () => byId['4-decimals'].gen(1)));
  const hund = ps.filter(p => p.viz && /<span>100<\/span>/.test(p.q));
  assert.ok(hund.length > 10);
  hund.forEach(p => assert.equal(shaded(p.viz), p.answer, p.q));
});

test('related videos match whole words only', () => {
  const words = s => `${s.title} ${s.strand}`;
  const pct = relatedTo(words(byId['7-pctchange']), VIDEOS);
  assert.ok(!pct.some(v => v.skills.includes('k-count')), pct.map(v => v.title).join(', '));
  assert.ok(relatedTo('Count to 10 number', VIDEOS).some(v => v.id === 'count-to-20'));
  assert.ok(relatedTo(words(byId['k-count']), VIDEOS).some(v => v.skills.includes('k-count')));
  assert.deepEqual(relatedTo('discounts', VIDEOS), []);
});
