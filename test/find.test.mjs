/* js/find.js (openspec find): the index holds every named thing the Mode can open with a real route, the section
   lines match the menu, synonyms name real entries, and ranking puts titles over synonyms over descriptions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sectionLines, buildIndex, rank, score, normalize, tokenize, countOf, KINDS, SYNONYMS, kindLabel } from '../js/find.js';
import { SKILLS, GRADES, byId, gradeOf } from '../js/skills/index.js';
import { TRICKS } from '../js/vedic.js';
import { SUTRAS, SUBSUTRAS } from '../js/sutras.js';
import { GAMES } from '../js/games.js';
import { PLAY } from '../js/play/catalog.js';
import { sectionsFor } from '../js/guide.js';

const appSrc = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const block = appSrc.slice(appSrc.indexOf('const routes = ['), appSrc.indexOf('];', appSrc.indexOf('const routes = [')));
const ROUTES = [...block.matchAll(/^\s*\[\/(.+?)\/, \(m, ctx\)/gm)].map(m => new RegExp(m[1]));
const routed = href => ROUTES.some(re => re.test(href));
const ALL_SUTRA_IDS = [...SUTRAS.map(c => 's' + c.n), ...SUBSUTRAS.map(c => 'u' + c.n)];
function real(href) {
  let m;
  if ((m = href.match(/^#\/skill\/([\w-]+)$/))) return !!byId[m[1]];
  if ((m = href.match(/^#\/grade\/(\w+)$/))) return !!gradeOf(m[1]);
  if ((m = href.match(/^#\/sutras\/(\w+)$/))) return ALL_SUTRA_IDS.includes(m[1]);
  if ((m = href.match(/^#\/game\/([\w-]+)$/))) return GAMES.some(g => g.id === m[1]);
  if ((m = href.match(/^#\/guide\/([\w-]+)$/))) return sectionsFor('pro', {}).some(s => s.id === m[1]);
  return true;
}
const VIDEOS = [
  { id: 'v1', title: 'Squaring numbers ending in 5', channel: 'Numberphile', yt: 'abc123', duration: 300, kind: 'video', modes: ['challenger', 'pro'], why: 'Shows the trick.' },
  { id: 'v2', title: 'Count to 20', channel: 'Kids TV', yt: 'def456', duration: 40, kind: 'short', modes: ['explorer'], why: 'A counting song.' }
];
const titles = groups => groups.flatMap(g => g.items.map(e => e.title));
const kind = (groups, k) => (groups.find(g => g.kind === k) || { items: [] }).items.map(e => e.title);

test('sectionLines: the menu for each Mode, in menu order, one plain line each, no digits, every href routed', () => {
  const pro = sectionLines('pro'), ex = sectionLines('explorer');
  assert.deepEqual(pro.map(l => l.label), ['Home', 'Learn', 'Dojo', 'Arena', 'Games', 'Sutras', 'Watch', 'Me', 'Guide', 'Find']);
  assert.deepEqual(ex.map(l => l.label), ['Home', 'Learn', 'Arena', 'Games', 'Watch', 'Me', 'Guide', 'Find']);
  assert.deepEqual(sectionLines('challenger').map(l => l.label), pro.map(l => l.label));
  assert.deepEqual(sectionLines(null).map(l => l.label), pro.map(l => l.label), 'no Mode reads as Challenger');
  for (const l of [...pro, ...ex]) {
    assert.ok(l.plain.length > 20 && l.plain.length < 120, `${l.label}: ${l.plain}`);
    assert.doesNotMatch(l.plain, /\d/, `${l.label} has a typed number`);
    assert.doesNotMatch(l.plain, /\u2014/, 'no em dash');
    assert.ok(routed(l.href), `${l.href} is routed`);
  }
  assert.notEqual(ex.find(l => l.label === 'Home').plain, pro.find(l => l.label === 'Home').plain, 'Explorer reads its own lines');
});

test('buildIndex (Pro): every catalog entry once, with a real routed page', () => {
  const idx = buildIndex({ mode: 'pro', videos: VIDEOS });
  const ids = idx.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
  const n = k => idx.filter(e => e.kind === k).length;
  assert.equal(n('section'), 10);
  assert.equal(n('trick'), TRICKS.length);
  assert.equal(n('skill'), SKILLS.filter(s => !String(s.id).startsWith('v-')).length);
  assert.equal(n('sutra'), SUTRAS.length + SUBSUTRAS.length);
  assert.equal(n('game'), GAMES.filter(g => g.modes.includes('pro')).length);
  assert.equal(n('play'), PLAY.filter(e => e.modes.includes('pro')).length);
  assert.equal(n('guide'), sectionsFor('pro', {}).length);
  assert.equal(n('grade'), GRADES.length);
  assert.equal(n('video'), 1, 'only videos the Mode sees on Watch (its own and the Mode below)');
  for (const e of idx) {
    assert.ok(e.title && e.sub, `${e.id} has a title and a line`);
    assert.ok(KINDS.includes(e.kind));
    if (e.yt) assert.equal(e.href, undefined, 'a video opens in place, by its id');
    else { assert.ok(routed(e.href), `${e.id}: ${e.href} is routed`); assert.ok(real(e.href), `${e.id}: ${e.href} names a real thing`); }
  }
});

test('buildIndex (Explorer): no Dojo or Sutras section, no experience or game outside the Mode, Explorer titles', () => {
  const idx = buildIndex({ mode: 'explorer', videos: VIDEOS });
  assert.ok(!idx.some(e => e.id === 'section-dojo' || e.id === 'section-sutras'));
  assert.ok(!idx.some(e => e.id === 'play-spells'), 'Sutra Spellbook is a Dojo experience');
  assert.ok(!idx.some(e => e.id === 'game-times-sprint'), 'Times sprint is for Challenger and Pro');
  assert.ok(idx.some(e => e.id === 'game-balloons'));
  assert.equal(idx.find(e => e.id === 'trick-sq5').title, 'Fives squared in one breath');
  assert.equal(idx.find(e => e.id === 'skill-k-count').title, 'How many dots?');
  assert.deepEqual(idx.filter(e => e.kind === 'video').map(e => e.id), ['video-v2']);
  assert.ok(!idx.some(e => e.kind === 'guide' && (e.id === 'guide-stars' || e.id === 'guide-sky')), 'guide sections follow sectionsFor');
});

test('every synonym names an entry that exists for some Mode', () => {
  const ids = new Set(['pro', 'explorer'].flatMap(m => buildIndex({ mode: m }).map(e => e.id)));
  for (const k of Object.keys(SYNONYMS)) assert.ok(ids.has(k), `${k} is in the index`);
  for (const list of Object.values(SYNONYMS)) for (const w of list) assert.doesNotMatch(w, /[A-Z\u2014]/, `${w} is plain and lower case`);
});

test('normalize and tokenize: case, diacritics, superscripts and stop words', () => {
  assert.equal(normalize('Ūrdhva-Tiryagbhyām'), 'urdhva tiryagbhyam');
  assert.equal(normalize('85² and x³'), '85 squared and x cubed');
  assert.deepEqual(tokenize('The Arena, and a race'), ['arena', 'race']);
  assert.deepEqual(tokenize('the'), []);
});

test('rank: titles over synonyms over descriptions, every token must match, prefixes count, kinds in order', () => {
  const idx = buildIndex({ mode: 'challenger', videos: VIDEOS });
  assert.deepEqual(kind(rank(idx, 'urdhva'), 'sutra')[0], 'Ūrdhva-Tiryagbhyām');
  assert.ok(kind(rank(idx, 'take away'), 'trick').slice(0, 3).includes('Subtract from 100, 1000, 10000'));
  assert.equal(titles(rank(idx, 'settings'))[0], 'Me');
  assert.equal(titles(rank(idx, 'arena'))[0], 'Arena');
  assert.equal(titles(rank(idx, 'nickname'))[0], 'Me');
  assert.equal(titles(rank(idx, 'videos'))[0], 'Watch');
  assert.equal(titles(rank(idx, 'help'))[0], 'Guide');
  assert.equal(kind(rank(idx, 'squares'), 'trick')[0], 'Square numbers ending in 5');
  assert.ok(kind(rank(idx, 'fractions'), 'skill').length >= 3);
  assert.deepEqual(rank(idx, 'zzzz'), []);
  assert.deepEqual(rank(idx, ''), []);
  assert.deepEqual(rank(idx, 'the and'), []);
  assert.deepEqual(kind(rank(idx, 'Squaring numbers'), 'video'), ['Squaring numbers ending in 5']);
  assert.deepEqual(kind(rank(idx, 'count to'), 'video'), ['Count to 20'], 'a Challenger sees Explorer videos too, as on Watch');
  const groups = rank(idx, 'number');
  assert.deepEqual(groups.map(g => g.kind), KINDS.filter(k => groups.some(g => g.kind === k)), 'groups come in KINDS order');
  for (const g of groups) assert.ok(g.items.length <= 8, `${g.kind} capped at 8`);
  assert.ok(countOf(groups) > 8);
  assert.ok(kind(rank(idx, 'sq'), 'trick').length >= 2, 'a two-letter prefix matches');
  assert.equal(kind(rank(idx, 'q'), 'trick').length, 0, 'one letter is not a prefix');
  assert.ok(kind(rank(idx, 'arena race'), 'section').includes('Arena'), 'two tokens both matching');
  assert.deepEqual(rank(idx, 'arena zzzz'), [], 'a token that matches nothing empties the result');
});

test('score: a title hit is 10, a synonym 8, a description 3, a prefix 70 percent', () => {
  const e = { t: ['square', 'numbers'], s: ['squares'], d: ['any', 'number', 'that', 'ends'] };
  assert.equal(score(e, ['square']), 10);
  assert.equal(score(e, ['squares']), 8);
  assert.equal(score(e, ['ends']), 3);
  assert.equal(score(e, ['squ']), 7);
  assert.equal(score(e, ['square', 'ends']), 13);
  assert.equal(score(e, ['square', 'zzz']), 0);
});

test('Explorer ranking: Dojo experiences and Challenger games are not findable, Explorer titles are', () => {
  const idx = buildIndex({ mode: 'explorer' });
  assert.deepEqual(rank(idx, 'spell'), []);
  assert.deepEqual(rank(idx, 'sprint'), []);
  assert.equal(kind(rank(idx, 'fives'), 'trick')[0], 'Fives squared in one breath');
  assert.equal(kindLabel('section', 'explorer'), 'Places');
  assert.equal(kindLabel('section', 'pro'), 'Sections');
  assert.equal(kindLabel('video', 'explorer'), 'Videos');
});
