/* The Watch shelf's rules (openspec watch-shelf) over a small fixture list, plus scans of the real data and app. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { visibleTo, order, picksFor, pickForTrick, videoForTrick, filterShelf, lengthOf, embedSrc, linksOut, loadVideos, MODE_SEES } from '../js/watch.js';
import { VIDEOS } from '../js/videos.js';
import { DETAILS } from '../js/sutra-details.js';
import { byId } from '../js/skills/index.js';

const V = (id, o) => ({ id, title: id, channel: 'c', yt: id.padEnd(11, 'x').slice(0, 11), duration: 100, kind: 'video', modes: ['challenger'], skills: [], tricks: [], madeForKids: false, captions: true, checked: '2026-10-15', why: '', ...o });
const LIST = [
  V('exp', { modes: ['explorer'], skills: ['k-count'], why: 'counting song' }),
  V('chal', { modes: ['challenger'], tricks: ['sq5'], duration: 200 }),
  V('chalkid', { modes: ['challenger'], tricks: ['sq5'], madeForKids: true, duration: 300 }),
  V('chalshort', { modes: ['challenger'], tricks: ['sq5'], kind: 'short', duration: 50 }),
  V('pro', { modes: ['pro'], skills: ['9-expand'], duration: 90, why: 'expand algebra brackets' }),
  V('crit', { modes: ['pro'], critique: true }),
  V('both', { modes: ['explorer', 'challenger'], duration: 60 }),
  V('kw', { modes: ['challenger'], why: 'multiply in your head', duration: 150 }),
];
const ids = xs => xs.map(v => v.id);
const seen = mode => ids(LIST.filter(v => visibleTo(v, mode)));

test('each Mode sees its own and the Mode below; Explorer only its own', () => {
  assert.deepEqual(MODE_SEES, { explorer: ['explorer'], challenger: ['challenger', 'explorer'], pro: ['pro', 'challenger'] });
  assert.deepEqual(seen('explorer'), ['exp', 'both']);
  assert.deepEqual(seen('challenger'), ['exp', 'chal', 'chalkid', 'chalshort', 'both', 'kw']);
  assert.deepEqual(seen('pro'), ['chal', 'chalkid', 'chalshort', 'pro', 'crit', 'both', 'kw']);
});

test('critiques only for Pro', () => {
  const crit = LIST.find(v => v.id === 'crit');
  assert.equal(visibleTo(crit, 'pro'), true);
  assert.equal(visibleTo({ ...crit, modes: ['challenger'] }, 'challenger'), false);
});

test('made for kids first for Explorer and Challenger, then shortest; Pro only by length', () => {
  const tr = LIST.filter(v => v.tricks.includes('sq5'));
  assert.deepEqual(ids(order(tr, 'challenger')), ['chalkid', 'chalshort', 'chal']);
  assert.deepEqual(ids(order(tr, 'pro')), ['chalshort', 'chal', 'chalkid']);
});

test('picks: hand-matched first, made for kids only when any exist (Challenger), keywords only when no hand match', () => {
  assert.deepEqual(picksFor(LIST, { trick: 'sq5', mode: 'challenger', words: 'square multiply' }), { how: 'hand', picks: [LIST[2]] });
  assert.deepEqual(ids(picksFor(LIST, { trick: 'sq5', mode: 'pro', words: 'square multiply' }).picks), ['chalshort', 'chal', 'chalkid']);
  // no hand match: keyword fallback over title and why, visible ones only
  const kw = picksFor(LIST, { skill: '4-mult2', mode: 'challenger', words: 'Multi-digit multiplication' });
  assert.equal(kw.how, 'keyword'); assert.deepEqual(ids(kw.picks), ['kw']);
  assert.deepEqual(picksFor(LIST, { skill: '4-mult2', mode: 'explorer', words: 'multiplication' }), { how: 'none', picks: [] });
  // a hand match hides keyword matches even when the words would match others
  assert.deepEqual(ids(picksFor(LIST, { skill: '9-expand', mode: 'pro', words: 'multiply algebra' }).picks), ['pro']);
  assert.ok(picksFor(LIST, { trick: 'sq5', mode: 'pro' }, 2).picks.length === 2);
});

test('the Star video is hand-matched to the Trick only, made for kids first, shortest', async () => {
  assert.equal(pickForTrick(LIST, 'sq5', 'challenger').id, 'chalkid');
  assert.equal(pickForTrick(LIST, 'sq5', 'pro').id, 'chalshort');
  assert.equal(pickForTrick(LIST, 'sq5', 'explorer'), null);
  assert.equal(pickForTrick(LIST, 'crosswise', 'challenger'), null, 'a keyword match is never offered');
  assert.equal((await videoForTrick('sq5', 'pro', { list: LIST })).id, 'chalshort');
  // with the real list (loaded on demand)
  const v = await videoForTrick('sq5', 'challenger');
  assert.ok(v && v.tricks.includes('sq5') && v.modes.some(m => MODE_SEES.challenger.includes(m)));
});

test('length buckets at 119, 120, 300 and 479 seconds', () => {
  assert.deepEqual([119, 120, 299, 300, 479].map(d => lengthOf({ duration: d })), ['short', 'mid', 'mid', 'long', 'long']);
});

test('shelf filters: Mode chip, Skill area, Tricks, length, kind', () => {
  assert.deepEqual(ids(filterShelf(LIST, { mode: 'challenger' }, byId)), ['chalkid', 'chalshort', 'both', 'kw', 'chal']);
  assert.deepEqual(ids(filterShelf(LIST, { mode: 'challenger', level: 'explorer' }, byId)), ['both', 'exp']);
  assert.deepEqual(ids(filterShelf(LIST, { mode: 'challenger', level: 'all', kind: 'short', tricks: true }, byId)), ['chalshort']);
  assert.deepEqual(ids(filterShelf(LIST, { mode: 'challenger', level: 'all', strand: 'number' }, byId)), ['exp']);
  assert.deepEqual(ids(filterShelf(LIST, { mode: 'challenger', level: 'all', strand: 'tricks' }, byId)), ['chalkid', 'chalshort', 'chal']);
  assert.deepEqual(ids(filterShelf(LIST, { mode: 'pro', level: 'all', length: 'mid' }, byId)), ['kw', 'chal']);
  assert.deepEqual(ids(filterShelf(LIST, { mode: 'explorer', level: 'pro' }, byId)), []);
});

test('the embed is privacy-enhanced and links out only for Pro', () => {
  assert.match(embedSrc({ yt: 'oV7Kxm3Zr_c' }), /^https:\/\/www\.youtube-nocookie\.com\/embed\/oV7Kxm3Zr_c\?autoplay=1&rel=0/);
  assert.doesNotMatch(embedSrc({ yt: 'oV7Kxm3Zr_c' }, { autoplay: false }), /autoplay/);
  assert.deepEqual(['explorer', 'challenger', 'pro'].map(linksOut), [false, false, true]);
});

test('the list loads once, on demand', async () => {
  const a = loadVideos(), b = loadVideos();
  assert.equal(a, b);
  assert.equal((await a).VIDEOS, VIDEOS);
});

test('every video in a Sutra deep dive is a VIDEOS entry', () => {
  const yts = new Set(VIDEOS.map(v => v.yt));
  const reads = Object.values(DETAILS).flatMap(d => d.read);
  const vids = reads.filter(([, to]) => typeof to === 'object');
  assert.ok(vids.length >= 3);
  for (const [label, to] of vids) assert.ok(yts.has(to.yt), `${label}: ${to.yt} is not in js/videos.js`);
  for (const [label, to] of reads) if (typeof to === 'string') assert.doesNotMatch(to, /youtu/, `${label}: a YouTube page link`);
});

test('every link that opens a new tab in js/app.js sits behind linksOut()', () => {
  const lines = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8').split('\n');
  // the parent note's LinkedIn contact link is for grown-ups and allowed
  const bad = lines.map((l, i) => [i + 1, l]).filter(([, l]) => /_blank/.test(l) && !/linksOut\(\)|linkedin\.com/.test(l));
  assert.deepEqual(bad.map(([n, l]) => `js/app.js:${n}: ${l.trim().slice(0, 120)}`), []);
  assert.doesNotMatch(lines.join('\n'), /from '\.\/videos\.js'/, 'js/videos.js is never imported statically');
});
