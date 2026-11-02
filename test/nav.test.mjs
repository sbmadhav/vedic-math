/* The menu by Mode (openspec change play-nav-by-mode, js/nav.js): the page's first paint is the Challenger and Pro
   set, every zone is marked current on the routes inside it, and every place the old nine-item menu reached is in a
   zone, on Find's browse list or on a page a zone opens. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABS, tabsFor, currentTab, navHTML, NAV_LINES } from '../js/nav.js';
import { sectionLines } from '../js/find.js';

const page = readFileSync(new URL('../play/index.html', import.meta.url), 'utf8');
const squash = h => h.replace(/>\s+</g, '><').trim();

test('play/index.html holds the Challenger and Pro menu exactly as js/nav.js draws it', () => {
  const m = page.match(/<nav class="md-nav mq-nav" aria-label="Vedic Math">([\s\S]*?)<\/nav>/);
  assert.ok(m, 'the nav slot');
  assert.equal(squash(m[1]), squash(navHTML('big')));
});

test('Challenger and Pro: four zones and Find; Explorer: three picture tabs that say their names', () => {
  assert.deepEqual(tabsFor('challenger').map(t => t.label), ['Home', 'Learn', 'Arcade', 'Watch', 'Find']);
  assert.deepEqual(tabsFor('pro').map(t => t.label), ['Home', 'Learn', 'Arcade', 'Watch', 'Find']);
  assert.deepEqual(tabsFor(null).map(t => t.label), ['Home', 'Learn', 'Arcade', 'Watch', 'Find']);
  assert.deepEqual(tabsFor('explorer').map(t => t.label), ['Play', 'Learn', 'Me']);
  assert.ok(TABS.explorer.every(t => t.icon && t.say));
  assert.deepEqual(NAV_LINES, ['Play', 'Learn', 'Me']);
});

test('each zone is current on the routes it holds', () => {
  const at = (mode, h) => (currentTab(mode, h) || {}).id || null;
  for (const h of ['#/', '', '#/tiles', '#/places', '#/try', '#/placement']) assert.equal(at('challenger', h), 'home', h);
  for (const h of ['#/learn', '#/grade/3', '#/skill/3-mult', '#/mix/3', '#/run/4', '#/sutras', '#/sutras/s1']) assert.equal(at('pro', h), 'learn', h);
  for (const h of ['#/arcade', '#/dojo', '#/tricks', '#/katas/sq5', '#/kata/sq5/2', '#/star/sq5/1', '#/skill/v-sq5', '#/arena', '#/arena/party', '#/duel', '#/tower', '#/tower/2', '#/challenge/12', '#/games', '#/game/make-ten', '#/game/make-ten/3', '#/dojo/spellbook'])
    assert.equal(at('challenger', h), 'arcade', h);
  assert.equal(at('challenger', '#/watch'), 'watch');
  for (const h of ['#/find', '#/guide', '#/guide/arena']) assert.equal(at('challenger', h), 'find', h);
  assert.equal(at('challenger', '#/me'), null, 'Me is the Player chip');
  for (const h of ['#/', '#/arena', '#/games', '#/game/balloons', '#/watch', '#/try', '#/placement']) assert.equal(at('explorer', h), 'play', h);
  for (const h of ['#/learn', '#/grade/K', '#/skill/k-count', '#/sutras', '#/sutras/s14']) assert.equal(at('explorer', h), 'learn', h);
  for (const h of ['#/me', '#/progress']) assert.equal(at('explorer', h), 'me', h);
});

test('every section is still on Find\'s browse list, with the new Arcade, in zone order', () => {
  assert.deepEqual(sectionLines('challenger').map(l => l.label), ['Home', 'Sutras', 'Learn', 'Arcade', 'Dojo', 'Arena', 'Games', 'Watch', 'Me', 'Guide', 'Find']);
  assert.deepEqual(sectionLines('explorer').map(l => l.label), ['Home', 'Sutras', 'Learn', 'Arena', 'Games', 'Watch', 'Me', 'Guide', 'Find']);
  for (const m of ['explorer', 'challenger', 'pro']) for (const t of tabsFor(m)) assert.ok(sectionLines(m).some(l => l.href === t.href), `${m} ${t.label} has a section line for its tooltip`);
});
