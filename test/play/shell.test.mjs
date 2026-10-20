/* Play experiences (openspec play-experiences): every experience in the catalog has a module and a stylesheet,
   lives inside a section, has no em dashes, uses tokens (no raw hex), and ties listeners, timers and frame loops
   to the view's AbortSignal through js/life.js. */
import test from '../support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { PLAY, SECTIONS, playFor, playIn, playOpen } from '../../js/play/catalog.js';
import { routePath } from '../../js/metrics.js';

const here = p => new URL(`../../${p}`, import.meta.url);
const read = p => readFileSync(here(p), 'utf8');
const walk = dir => readdirSync(here(dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]));

test('twelve experiences, each with a module that exports mount and a stylesheet', () => {
  assert.equal(PLAY.length, 12);
  assert.equal(new Set(PLAY.map(e => e.id)).size, 12);
  for (const e of PLAY) {
    assert.ok(existsSync(here(`js/play/exp/${e.id}.js`)), e.id);
    assert.ok(existsSync(here(`css/play/${e.id}.css`)), e.id);
    assert.match(read(`js/play/exp/${e.id}.js`), /export (async )?function mount\(/, `${e.id} exports mount`);
  }
  assert.ok(existsSync(here('css/play/base.css')));
});

test('every experience is a page inside an existing section, not a new top-level route', () => {
  for (const e of PLAY) {
    assert.ok(SECTIONS[e.section], e.id);
    assert.ok(e.route.startsWith(SECTIONS[e.section].href + '/'), `${e.id}: ${e.route}`);
    assert.match(e.route, /^#\/(dojo|arena|games|sutras)\/[a-z-]+$/);
  }
  assert.equal(new Set(PLAY.map(e => e.route)).size, 12);
});

test('routes resolve to their experience with params, and sutra deep dives are untouched', () => {
  assert.equal(playFor('#/arena/ghosts/r/abc')[0].id, 'ghosts');
  assert.deepEqual(playFor('#/arena/ghosts/r/abc')[1], ['r', 'abc']);
  assert.equal(playFor('#/sutras/lost-scroll')[0].id, 'scroll');
  assert.equal(playFor('#/sutras/s1'), null);
  assert.equal(playFor('#/games'), null);
  assert.equal(playFor('#/arena/partyx'), null);
  assert.deepEqual(playFor('#/arena/ghosts/r/%E0%A4')[1], ['r', '%E0%A4'], 'a malformed escape does not throw');
});

test('Explorer sees no experiences from the sections hidden in Explorer (Dojo, Sutras)', () => {
  assert.deepEqual(playIn('dojo', 'explorer'), []);
  assert.deepEqual(playIn('sutras', 'explorer'), []);
  /* Pattern Wall, Teach the Apprentice and Estimation Bets are Challenger and Pro only for now (owner, 2026-10-17) */
  assert.deepEqual(playIn('games', 'explorer').map(e => e.id), ['tala', 'art', 'lens']);
  for (const id of ['wall', 'apprentice', 'bets', 'spells', 'locks', 'scroll']) assert.equal(playOpen(PLAY.find(e => e.id === id), 'explorer'), false, id);
  assert.equal(playOpen(PLAY.find(e => e.id === 'wall'), 'challenger'), true);
  for (const m of ['challenger', 'pro']) assert.equal(['dojo', 'arena', 'games', 'sutras'].flatMap(s => playIn(s, m)).length, 12);
});

test('route views are counted by page name only, never by params', () => {
  const known = (kind, id) => kind === 'play' && PLAY.some(e => e.route.endsWith('/' + id));
  assert.equal(routePath('#/arena/ghosts/r/SECRETSEED', known), 'play/ghosts');
  assert.equal(routePath('#/games/tala/compose/abc', known), 'play/tala');
  assert.equal(routePath('#/sutras/lost-scroll', known), 'play/lost-scroll');
  assert.equal(routePath('#/games/nope', known), 'play/unknown');
});

test('no em dashes in play scripts or styles', () => {
  for (const f of [...walk('js/play'), ...walk('css/play')]) assert.ok(!read(f).includes('—'), `${f} has an em dash`);
});

test('play styles use design tokens, never raw hex colors', () => {
  for (const f of walk('css/play')) assert.deepEqual(read(f).split('\n').filter(l => /#[0-9a-fA-F]{3,8}\b/.test(l) && !/url\(/.test(l)), [], f);
});

test('experience code has no bare listeners, timers or frame loops (js/life.js with the view signal)', () => {
  const RE = /\.addEventListener\(|\b(setTimeout|setInterval|requestAnimationFrame)\(/;
  for (const f of walk('js/play/exp')) {
    const bad = read(f).split('\n').map((l, i) => [l, i + 1]).filter(([l]) => RE.test(l) && !/life-ok/.test(l)).map(([l, n]) => `${f}:${n}: ${l.trim().slice(0, 120)}`);
    assert.deepEqual(bad, []);
  }
});

test('analytics from play experiences are fixed words: track() ignores titles and rejects anything else', () => {
  const kit = read('js/play/kit.js');
  assert.match(kit, /export function track\(action\)/);
  assert.match(kit, /'math\/play\/' \+ action/);
});
