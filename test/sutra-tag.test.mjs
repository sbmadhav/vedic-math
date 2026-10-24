/* Sutra tags (openspec change sutras-first, spec sutra-tags): the Sutra map is complete and honest, names and
   meanings come from the Sutra cards, and the tag's link says everything it shows. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { TRICKS } from '../js/vedic.js';
import { SUTRAS, SUBSUTRAS } from '../js/sutras.js';
import { GAMES } from '../js/games.js';
import { CARDS, RELATION, RELATIONS, NOTES, SURFACES, sutraOfTrick, sutraOfItem, sutraOfGame, meaningFor, kindWord, tagHTML, trickTagHTML, trickSutraName, roundSutras } from '../js/sutra-tag.js';

const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const linkName = h => text((h.match(/<a class="sutra-tag-a"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '');

test('every Trick maps to one Sutra card and one of the four relations, and is listed in that card', () => {
  assert.equal(TRICKS.length, 21);
  assert.deepEqual(Object.keys(RELATION).sort(), TRICKS.map(t => t.id).sort());
  for (const t of TRICKS) {
    const s = sutraOfTrick(t.id);
    assert.ok(s && CARDS[s.id], `${t.id} has a card`);
    assert.equal(s.id, t.sutraId, `${t.id} keeps its sutraId`);
    assert.ok(RELATIONS.includes(s.relation), `${t.id}: ${s.relation}`);
    assert.ok(CARDS[s.id].tricks.includes(t.id), `${t.id} is listed in ${s.id}'s Tricks`);
    if (s.relation === 'sub') assert.ok(CARDS[s.id].sub, `${t.id}: a sub-sutra relation names a sub-sutra card`);
    if (s.relation === 'sutra') assert.ok(!CARDS[s.id].sub, `${t.id}: a sutra relation names one of the 16`);
  }
});

test('the honest relations: three special cases, two borrowed ideas, each with its note', () => {
  assert.deepEqual(['by11', 'div9', 'duplex'].map(id => RELATION[id]), ['case', 'case', 'case']);
  assert.deepEqual(['check9', 'times5'].map(id => RELATION[id]), ['idea', 'idea']);
  for (const [id, r] of Object.entries(RELATION)) assert.equal(!!NOTES[id], r === 'case' || r === 'idea', `${id} note`);
  assert.match(NOTES.check9, /casting out nines/); assert.match(NOTES.check9, /much older than the 1965 book/);
});

test('names and meanings come from the cards; Explorer reads the kid line', () => {
  for (const c of [...SUTRAS, ...SUBSUTRAS]) {
    assert.ok(c.kid && c.kid.length <= 60, `${c.name} has a short Explorer meaning`);
    assert.doesNotMatch(c.kid, /—|&mdash;/);
  }
  assert.equal(meaningFor('s1', 'challenger'), 'By one more than the one before');
  assert.equal(meaningFor('s1', 'pro'), 'By one more than the one before');
  assert.equal(meaningFor('s1', 'explorer'), 'One more than the number before');
  assert.equal(meaningFor('s5', 'challenger'), 'When the totals are the same, that total is zero');
  assert.equal(meaningFor('nope', 'pro'), '');
});

test('kind words by Mode', () => {
  assert.equal(kindWord('case', 'challenger'), 'A special case of');
  assert.equal(kindWord('case', 'pro'), 'Special case of');
  assert.equal(kindWord('case', 'explorer'), 'Special case of', 'Explorer is told a special case is one too (design decision 2)');
  assert.equal(kindWord('idea', 'pro'), 'Uses the idea of');
  assert.equal(kindWord('idea', 'explorer'), 'Idea from');
  assert.equal(kindWord('sub', 'challenger'), 'Sub-sutra');
  assert.equal(kindWord('sutra', undefined), 'Sutra');
});

test('a tag is one link to the Deep dive whose name holds every word it shows', () => {
  const h = trickTagHTML('sq5', { mode: 'challenger', surface: 'trick' });
  assert.match(h, /href="#\/sutras\/s1"/);
  assert.match(h, /data-tag="trick"/);
  assert.match(h, /lang="sa-Latn"/);
  assert.equal(linkName(h), 'Sutra Ekādhikena Pūrveṇa By one more than the one before , open its deep dive');
  const by11 = trickTagHTML('by11', { mode: 'challenger' });
  assert.match(linkName(by11), /^A special case of Ūrdhva-Tiryagbhyām Vertically and crosswise/);
  assert.doesNotMatch(by11, /data-tag=/, 'no surface, no event');
});

test('text tags have no link; mini tags show the name and keep the rest for screen readers', () => {
  const t = trickTagHTML('by11', { mode: 'challenger', link: false });
  assert.doesNotMatch(t, /<a /); assert.match(text(t), /A special case of Ūrdhva-Tiryagbhyām/);
  const m = trickTagHTML('sq5', { mode: 'pro', size: 'mini', surface: 'dojo' });
  assert.match(m, /^<span class="sutra-tag sutra-tag--mini"/);
  assert.match(m, /md-sr-only">: By one more than the one before/);
});

test('full tags carry Say it for the card and the note for Pro only', () => {
  const pro = trickTagHTML('check9', { mode: 'pro', size: 'full', surface: 'trick' });
  assert.match(pro, /data-say="s15"/);
  assert.match(pro, /Uses the idea of/);
  assert.match(pro, /sutra-tag-note">The digit sum check, casting out nines/);
  assert.doesNotMatch(trickTagHTML('check9', { mode: 'challenger', size: 'full' }), /sutra-tag-note/);
  assert.equal(tagHTML('zz'), '');
  assert.equal(trickTagHTML('nope'), '');
  assert.equal(trickSutraName('div9'), 'Nikhilaṃ Navataścaramaṃ Daśataḥ');
});

test('surfaces are fixed words', () => {
  assert.deepEqual(SURFACES, ['trick', 'star', 'kata', 'katas', 'dojo', 'arena', 'watch', 'game', 'home']);
  assert.doesNotMatch(tagHTML('s1', { surface: 'javascript:alert(1)' }), /data-tag/);
});

test('Arena questions: a Pro question names its own card, a pool question its Trick, others none', () => {
  assert.deepEqual(sutraOfItem({ sutra: 's2', family: 'nearBase' }), { id: 's2', relation: 'sutra' });
  assert.deepEqual(sutraOfItem({ sutra: 'u8', family: 'mul2x2' }), { id: 'u8', relation: 'sub' });
  assert.deepEqual(sutraOfItem({ skill: 'v-by11' }), { id: 's3', relation: 'case' });
  assert.equal(sutraOfItem({ skill: '3-mult' }), null);
  assert.equal(sutraOfItem({ family: 'percent' }), null);
  assert.equal(sutraOfItem(null), null);
});

test('the round review: one entry per Sutra, first-asked order, right of asked', () => {
  const answered = [
    { item: { sutra: 's2' }, ok: true }, { item: { family: 'percent' }, ok: true }, { item: { sutra: 's3' }, ok: false },
    { item: { sutra: 's2' }, ok: false }, { item: { skill: 'v-sq5' }, ok: true }, { item: { skill: '3-div' }, ok: false }
  ];
  assert.deepEqual(roundSutras(answered), [
    { id: 's2', relation: 'sutra', asked: 2, right: 1 }, { id: 's3', relation: 'sutra', asked: 1, right: 0 }, { id: 's1', relation: 'sutra', asked: 1, right: 1 }
  ]);
  assert.deepEqual(roundSutras([]), []);
  assert.deepEqual(roundSutras(undefined), []);
});

test('games: only the Answer checker names a Sutra, and only its idea', () => {
  const named = GAMES.filter(sutraOfGame);
  assert.deepEqual(named.map(g => [g.id, g.sutra.id, g.sutra.relation]), [['check-it', 's15', 'idea']]);
});

test('no em dashes in tags', () => {
  for (const t of TRICKS) for (const mode of ['explorer', 'challenger', 'pro']) assert.doesNotMatch(trickTagHTML(t.id, { mode, size: 'full' }), /—|&mdash;/);
});
