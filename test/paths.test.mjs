/* The route table (openspec change indexable-routes, task 1.1): every pattern in js/app.js `routes` has a row, every
   enumerated key round-trips through its path, the page and indexed counts, the aliases of design D2, every path
   lowercase with no trailing slash, and the kinds agree with js/metrics.js. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROWS, ALIASES, BASE, toPath, toKey, kindOf, rowFor, allPaths } from '../js/paths.js';
import { routePath } from '../js/metrics.js';

const ALL = allPaths();

/* The router's regexes, read from the routes list in js/app.js (the #/duel row's handler takes no arguments) */
function appRoutes() {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const start = app.indexOf('const routes = [');
  return [...app.slice(start, app.indexOf('];', start)).matchAll(/^\s*\[\/(.+?)\/, \(/gm)].map(m => m[1]);
}

test('every pattern in js/app.js routes has a row, in the same order, and no row is extra', () => {
  const app = appRoutes();
  assert.equal(app.length, 32, 'the router has 32 patterns');
  assert.deepEqual(ROWS.map(r => r.pattern.source), app);
});

/* Design.md's inventory counted 15 games and 6 Guide pages; the catalogs hold 14 games (js/games.js GAMES) and
   #/guide/<s> takes a section id, of which js/guide.js has 25, so the real totals are 3,470 pages and 239 indexed */
test('allPaths() has 3,470 entries, 239 of them indexed, all with distinct keys and paths', () => {
  assert.equal(ALL.length, 3470);
  assert.equal(ALL.filter(e => e.indexed).length, 239);
  assert.equal(new Set(ALL.map(e => e.key)).size, ALL.length);
  assert.equal(new Set(ALL.map(e => e.path)).size, ALL.length);
  const by = word => ALL.filter(e => e.key.split('/')[1] === word).length;
  assert.deepEqual({ grade: by('grade'), skill: by('skill'), katas: by('katas'), kata: by('kata'), star: by('star'), tower: by('tower'), challenge: by('challenge'), sutras: by('sutras'), game: by('game'), guide: by('guide') },
    { grade: 14, skill: 136, katas: 21, kata: 1050, star: 63, tower: 41, challenge: 1000, sutras: 1 + 29 + 1, game: 14 + 14 * 72, guide: 26 });
  assert.equal(ALL.filter(e => e.lock === 'mode').length, 12, 'the play experiences');
});

test('toKey(toPath(k)) === k for every enumerated key, and allPaths() agrees with both', () => {
  for (const e of ALL) {
    assert.equal(toPath(e.key), e.path, e.key);
    assert.equal(toKey(e.path), e.key, e.path);
  }
});

test('every path is under /learn, lowercase, with no trailing slash; Home is /learn/', () => {
  for (const e of ALL) {
    if (e.key === '#/') { assert.equal(e.path, BASE + '/'); continue; }
    assert.match(e.path, /^\/learn(\/[a-z0-9-]+)+$/, e.path);
  }
  assert.equal(toPath('#/grade/K'), '/learn/grade/k');
  assert.equal(toKey('/learn/grade/k'), '#/grade/K');
  assert.equal(toKey('/learn/grade/v'), '#/grade/V');
  assert.equal(toPath('#/learn'), '/learn/skills', 'the Skill map (design D2)');
});

test('aliases map as design D2 says, in both directions', () => {
  assert.deepEqual([...ALIASES].sort(), [['/learn/duel', '/learn/arena/party'], ['/learn/learn', '/learn/skills'], ['/learn/progress', '/learn/me'], ['/learn/tricks', '/learn/dojo']]);
  for (const [from, to] of ALIASES) assert.equal(toKey(from), toKey(to), from);
  assert.equal(toPath('#/tricks'), '/learn/dojo');
  assert.equal(toPath('#/progress'), '/learn/me');
  assert.equal(toPath('#/duel'), '/learn/arena/party');
  assert.equal(toKey('/learn/learn'), '#/learn');
  assert.equal(toKey('/learn/duel'), '#/arena/party');
  assert.ok(!ALL.some(e => ALIASES.some(([from]) => from === e.path)), 'no alias is a page');
  assert.ok(!ALL.some(e => ['#/tricks', '#/progress', '#/duel'].includes(e.key)), 'a second name is never an enumerated key');
});

test('toKey: trailing slashes, Home, parameters that keep their case, numbers past the end, and paths that name no screen', () => {
  assert.equal(toKey('/learn'), '#/');
  assert.equal(toKey('/learn/'), '#/');
  assert.equal(toKey('/learn/arena/'), '#/arena');
  assert.equal(toKey('/learn/arena/ghosts/r/AbC9'), '#/arena/ghosts/r/AbC9');
  assert.equal(toPath('#/arena/ghosts/r/AbC9'), '/learn/arena/ghosts/r/AbC9');
  assert.equal(toKey('/learn/kata/sq5/99'), '#/kata/sq5/99', 'the view decides what an unknown number shows');
  for (const p of ['/play/', '/', '/learning', '/learn/arnea', '/learn/Arena', '/learn/skill/', '', null]) assert.equal(toKey(p), null, String(p));
  assert.equal(toPath('#/nowhere'), null);
  assert.equal(rowFor('#/nowhere'), null);
});

test('public and indexed follow the inventory: every indexed page is public, Find is public but not indexed, Player pages are neither', () => {
  for (const e of ALL) if (e.indexed) assert.ok(e.public, e.key);
  const find = ALL.find(e => e.key === '#/find');
  assert.ok(find.public && !find.indexed);
  for (const k of ['#/me', '#/places', '#/tiles', '#/try', '#/tower', '#/tower/1', '#/challenge/30', '#/kata/sq5/12', '#/star/sq5/2', '#/katas/sq5', '#/mix/3', '#/mix/3/words', '#/run/3', '#/game/times-sprint/12']) {
    const e = ALL.find(x => x.key === k);
    assert.ok(e && !e.public && !e.indexed, k);
  }
  for (const k of ['#/', '#/learn', '#/grade/5', '#/skill/v-sq5', '#/arcade', '#/dojo', '#/sutras', '#/sutras/s1', '#/arena', '#/games', '#/game/times-sprint', '#/watch', '#/guide', '#/guide/around', '#/dojo/spells', '#/games/tala']) {
    const e = ALL.find(x => x.key === k);
    assert.ok(e && e.public && e.indexed, k);
  }
  const lock = k => ALL.find(x => x.key === k).lock;
  assert.deepEqual([lock('#/kata/sq5/12'), lock('#/challenge/30'), lock('#/game/times-sprint/12'), lock('#/dojo/spells'), lock('#/star/sq5/2'), lock('#/game/times-sprint')], ['kata', 'challenge', 'level', 'mode', null, null]);
});

test('kinds agree with metrics.routePath for every enumerated key', () => {
  for (const e of ALL) assert.equal(e.kind, routePath(e.key, () => true), e.key);
  assert.equal(kindOf('#/arena/ghosts/r/abc'), 'play/ghosts');
  assert.equal(kindOf('#/guide'), 'guide');
  assert.equal(kindOf('#/guide/around'), 'guide/section');
  assert.equal(kindOf('#/nowhere'), null);
});
