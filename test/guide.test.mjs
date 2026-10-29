/* The in-app guide and the first-visit tour (openspec in-app-guide): the guide's sections cover every route in
   js/app.js, every Try it link opens a real route with a real catalog id, every section is complete in every Mode,
   the pictures use tokens only, and the tour's steps and state behave. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GROUPS, sections, sectionsFor, tryFor, say, w, TOUR_STEPS, resolveStep, resolveTour, tourDue, tourState, setTourState, TOUR_KEY, MODES } from '../js/guide.js';
import { ART, artFor } from '../js/guide-art.js';
import { byId, gradeOf } from '../js/skills/index.js';
import { TRICKS, BELTS } from '../js/vedic.js';
import { GAMES, LEVELS_PER_GAME } from '../js/games.js';
import { SUTRAS, SUBSUTRAS } from '../js/sutras.js';
import * as LV from '../js/levels.js';

const N = { skills: 115, tricks: TRICKS.length, belts: BELTS.length, katasPer: LV.KATAS_PER_TRICK, kataCount: LV.KATA_COUNT, sutras: SUTRAS.length, subsutras: SUBSUTRAS.length,
  games: GAMES.length, levelsPerGame: LEVELS_PER_GAME, chapters: LV.TOPICS.length, perChapter: LV.PER_CHAPTER, challenges: LV.CHALLENGE_COUNT, badges: 24, videoMinutes: 12, starsPerBelt: 9 };
const ALL = sections(N);
const appSrc = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

/* The router's regexes, read from the routes list in js/app.js */
function appRoutes() {
  const block = appSrc.slice(appSrc.indexOf('const routes = ['), appSrc.indexOf('];', appSrc.indexOf('const routes = [')));
  return [...block.matchAll(/^\s*\[\/(.+?)\/, \(m, ctx\)/gm)].map(m => new RegExp(m[1]));
}
const ROUTES = appRoutes();

/* A hash names something real: the ids in it are in their catalogs */
const ALL_SUTRA_IDS = [...SUTRAS.map(c => 's' + c.n), ...SUBSUTRAS.map(c => 'u' + c.n)];
function real(href) {
  let m;
  if ((m = href.match(/^#\/skill\/([\w-]+)$/))) return !!byId[m[1]];
  if ((m = href.match(/^#\/(?:grade|mix|run)\/(\w+)$/))) return !!gradeOf(m[1]);
  if ((m = href.match(/^#\/katas\/([\w-]+)$/))) return TRICKS.some(t => t.id === m[1]);
  if ((m = href.match(/^#\/kata\/([\w-]+)\/(\d+)$/))) return TRICKS.some(t => t.id === m[1]) && +m[2] >= 1 && +m[2] <= LV.KATAS_PER_TRICK;
  if ((m = href.match(/^#\/star\/([\w-]+)\/(\d+)$/))) return TRICKS.some(t => t.id === m[1]) && +m[2] >= 1 && +m[2] <= 3;
  if ((m = href.match(/^#\/tower\/(\d+)$/))) return +m[1] >= 1 && +m[1] <= LV.TOPICS.length;
  if ((m = href.match(/^#\/challenge\/(\d+)$/))) return +m[1] >= 1 && +m[1] <= LV.CHALLENGE_COUNT;
  if ((m = href.match(/^#\/sutras\/(\w+)$/))) return ALL_SUTRA_IDS.includes(m[1]);
  if ((m = href.match(/^#\/game\/([\w-]+)(?:\/(\d+))?$/))) return GAMES.some(g => g.id === m[1]) && (!m[2] || (+m[2] >= 1 && +m[2] <= LEVELS_PER_GAME));
  if ((m = href.match(/^#\/guide\/([\w-]+)$/))) return ALL.some(s => s.id === m[1]);
  return true;
}
const routed = href => ROUTES.some(re => re.test(href));

test('the routes list was read from js/app.js', () => {
  assert.ok(ROUTES.length >= 25, `${ROUTES.length} routes`);
  assert.ok(routed('#/guide') && routed('#/guide/arena'), 'the guide routes are in the list');
});

test('together the sections cover every route in js/app.js', () => {
  const covers = ALL.flatMap(s => s.covers);
  const missing = ROUTES.filter(re => !covers.some(h => re.test(h))).map(String);
  assert.deepEqual(missing, []);
});

test('every covered sample is a real route with real ids', () => {
  for (const s of ALL) for (const h of s.covers) { assert.ok(routed(h), `${s.id}: ${h} is not a route`); assert.ok(real(h), `${s.id}: ${h} names nothing real`); }
});

test('every Try it link, in every Mode, opens a real route with a real id', () => {
  for (const mode of MODES) for (const s of sectionsFor(mode, N)) {
    const t = tryFor(s, mode); if (!t) continue;
    assert.ok(t.label && typeof t.label === 'string', `${s.id} has a label`);
    if (t.action) { assert.ok(['tour', 'music', 'install'].includes(t.action), `${s.id}: ${t.action}`); continue; }
    for (const h of [t.href, t.more && t.more.href].filter(Boolean)) { assert.ok(routed(h), `${mode} ${s.id}: ${h} is not a route`); assert.ok(real(h), `${mode} ${s.id}: ${h} names nothing real`); }
  }
});

test('sections are complete in every Mode: title, what, at least two steps, tip and a picture', () => {
  const ids = ALL.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const s of ALL) {
    assert.ok(GROUPS.some(g => g.id === s.group), `${s.id}: group ${s.group}`);
    assert.ok(ART[s.art], `${s.id}: art ${s.art} is drawn`);
    assert.ok(s.how.length >= 2, `${s.id}: how`);
    for (const mode of MODES) {
      if (s.modes && !s.modes.includes(mode)) continue;
      for (const v of [s.title, s.what, s.tip, ...s.how]) assert.ok(typeof say(v, mode) === 'string' && say(v, mode).trim().length > 2, `${s.id} in ${mode}`);
    }
  }
  for (const g of GROUPS) assert.ok(ALL.some(s => s.group === g.id), `${g.id} has sections`);
});

test('Explorer gets no Stars or Sky section; Challenger and Pro get both', () => {
  const ids = m => sectionsFor(m, N).map(s => s.id);
  assert.ok(!ids('explorer').includes('stars') && !ids('explorer').includes('sky'));
  for (const m of ['challenger', 'pro']) assert.ok(ids(m).includes('stars') && ids(m).includes('sky'), m);
  assert.deepEqual(ids(null), ids('challenger'), 'no Mode yet reads as Challenger');
});

test('say(): strings for everyone, w() per Mode, Challenger when there is no Mode, Pro falls back to Challenger', () => {
  assert.equal(say('Same', 'explorer'), 'Same');
  const v = w('E', 'C');
  assert.equal(say(v, 'explorer'), 'E'); assert.equal(say(v, 'pro'), 'C'); assert.equal(say(v, null), 'C'); assert.equal(say(v, undefined), 'C');
  assert.equal(say(w('E', 'C', 'P'), 'pro'), 'P');
});

test('counts in the copy come from n', () => {
  const text = mode => JSON.stringify(sectionsFor(mode, N).map(s => [s.what, s.how].map(v => Array.isArray(v) ? v.map(x => say(x, mode)) : say(v, mode))));
  assert.match(text('challenger'), new RegExp(`${LV.KATA_COUNT.toLocaleString('en-US')} in all`));
  assert.match(text('challenger'), new RegExp(`${GAMES.length} games, each with ${LEVELS_PER_GAME} levels`));
  assert.match(text('pro'), /1,000 challenges in 40 chapters of 25/);
  const other = sections({ ...N, games: 99 });
  assert.match(say(other.find(s => s.id === 'games').what, 'challenger'), /^99 games/);
});

test('copy says Sparks, Titles and Medals, never XP, levels of the Player or stars on Katas', () => {
  const all = JSON.stringify(ALL);
  assert.doesNotMatch(all, /\bXP\b|[Ll]evel badge|[Ll]evel up|three stars|\d stars|star goals/); /* lower-case stars were Kata and Level stars; Stars are Star Quest */
  assert.doesNotMatch(all, /\bkids?\b/i, 'Players are never called kids');
  assert.doesNotMatch(all, /\u2014/);
});

test('the pictures use tokens only and are hidden from assistive technology', () => {
  const src = readFileSync(new URL('../js/guide-art.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, 'no raw colors');
  for (const [k, v] of Object.entries(ART)) { assert.match(v, /^<svg class="gd-svg" viewBox="0 0 120 80" aria-hidden="true" focusable="false">/, k); assert.doesNotMatch(v, /NaN|undefined/, k); }
  assert.equal(artFor('nope'), '');
});

/* ---------- The tour ---------- */
test('the tour has at most six steps, and its last step points at Find, the menu\'s help (Explorer: How to play)', () => {
  assert.ok(TOUR_STEPS.length >= 3 && TOUR_STEPS.length <= 6);
  assert.deepEqual(TOUR_STEPS.at(-1).options.map(o => o.sel), ['.mq-nav .nav-find', '.home-places a[href="#/guide"]']); /* openspec change play-nav-by-mode */
  const index = readFileSync(new URL('../play/index.html', import.meta.url), 'utf8');
  assert.match(index, /<a href="#\/find" class="nav-find" data-match="\^#\/\(find\|guide\)\(\/\|\$\)"/, 'the menu bar has the Find trigger, current on the guide too');
  assert.match(index, /<a class="mq-guide" href="#\/guide">How to use this app<\/a>/, 'the footer links the guide');
  for (const s of TOUR_STEPS) for (const o of s.options) for (const m of MODES) { assert.ok(say(o.title, m) && say(o.body, m), `${s.id} in ${m}`); }
});

test('the play step has an option for the tile home, the Sky and the Explorer home', () => {
  const play = TOUR_STEPS.find(s => s.id === 'play');
  assert.equal(resolveStep(play, sel => sel === '.quest-card' || sel === '.play-tile').sel, '.quest-card');
  assert.equal(resolveStep(play, sel => sel === '#skyHome .sky-frame').sel, '#skyHome .sky-frame');
  assert.equal(resolveStep(play, sel => sel === '.play-tile').sel, '.play-tile');
  assert.equal(resolveStep(play, () => false), null);
});

test('resolveTour drops steps with nothing on screen and words them for the Mode', () => {
  const steps = resolveTour(sel => sel !== '#vmMBtn', 'explorer');
  assert.ok(!steps.some(s => s.id === 'music'));
  assert.equal(steps.length, TOUR_STEPS.length - 1);
  assert.equal(steps[0].title, 'This is you!');
  assert.equal(resolveTour(() => true, 'pro')[0].title, 'This is you');
  assert.deepEqual(resolveTour(() => false, 'pro'), []);
});

test('tourDue: only on Home, with a Mode, a fresh Player and a device that has never shown the tour', () => {
  const base = { mode: 'challenger', state: null, hash: '#/', fresh: true };
  assert.equal(tourDue(base), true);
  assert.equal(tourDue({ ...base, hash: '' }), true);
  assert.equal(tourDue({ ...base, mode: null }), false);
  for (const state of ['shown', 'done', 'skipped']) assert.equal(tourDue({ ...base, state }), false, state);
  assert.equal(tourDue({ ...base, fresh: false }), false);
  assert.equal(tourDue({ ...base, hash: '#/learn' }), false);
  assert.equal(tourDue({ ...base, hash: '#/tiles' }), false);
});

test('tour state lives in vm.tour on this device, and survives storage that throws', () => {
  const map = new Map(), ls = { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
  assert.equal(TOUR_KEY, 'vm.tour');
  assert.equal(tourState(ls), null);
  setTourState('shown', ls); assert.equal(tourState(ls), 'shown');
  setTourState('done', ls); assert.equal(map.get('vm.tour'), 'done');
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(tourState(bad), null);
  assert.doesNotThrow(() => setTourState('done', bad));
  assert.equal(tourState(null), null);
});

/* learnvedicmath.com has no Explore menu and no link to sbmadhav.com (openspec change learnvedicmath, task 3.5) */
test('the guide never mentions the Explore menu, the Star map button or sbmadhav.com', async () => {
  const src = readFileSync(new URL('../js/guide.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /sbmadhav\.com/);
  assert.doesNotMatch(src, /\bExplore\b(?! mode)/);
  assert.doesNotMatch(src, /Star map/);
});
