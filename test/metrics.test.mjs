/* js/metrics.js: anonymous usage events (openspec analytics spec). A fake window.siteTrack records what
   would be sent; a fake localStorage holds the device flags. The scan at the end checks every analytics
   call site in js/ for values that could identify a Player. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const mem = {};
globalThis.localStorage = {
  getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; },
  key: i => Object.keys(mem)[i] ?? null, get length() { return Object.keys(mem).length; },
};
const sent = [];
globalThis.window = { siteTrack: (path, title) => sent.push([path, title]) };
const M = await import('../js/metrics.js');
const clear = () => { for (const k of Object.keys(mem)) delete mem[k]; sent.length = 0; M._resetVisit(); };
const paths = () => sent.map(([p]) => p);
const PATH = /^math\/[a-z0-9_/:-]+$/;

/* ---------- Route views ---------- */
const SAMPLES = {
  '': 'home', '#/': 'home', '#/learn': 'learn', '#/grade/5': 'grade/5', '#/grade/K': 'grade/k',
  '#/skill/v-sq5': 'skill/v-sq5', '#/mix/3': 'mix/3', '#/run/3': 'run/3', '#/dojo': 'dojo', '#/tricks': 'tricks',
  '#/katas/sq5': 'katas/sq5', '#/kata/sq5/4': 'kata/sq5/kata', '#/star/sq5/2': 'star/sq5/star', '#/try': 'try', '#/tower': 'tower', '#/tower/7': 'tower/chapter',
  '#/challenge/123': 'challenge/challenge', '#/sutras': 'sutras', '#/sutras/s1': 'sutras/s1', '#/arena': 'arena',
  '#/duel': 'duel', '#/games': 'games', '#/game/times-sprint': 'game/times-sprint', '#/game/times-sprint/12': 'game/times-sprint/level',
  '#/watch': 'watch', '#/me': 'me', '#/progress': 'progress', '#/places': 'places', '#/tiles': 'tiles',
  '#/guide': 'guide', '#/guide/arena': 'guide/section', '#/find': 'find',
  '#/arena/ghosts/r/abc': 'play/ghosts', '#/dojo/spells': 'play/spells', '#/sutras/lost-scroll': 'play/lost-scroll',
};
const known = (kind, id) => ({ grade: ['5', 'K', '3'], skill: ['v-sq5'], trick: ['sq5'], sutra: ['s1'], game: ['times-sprint'], play: ['ghosts', 'spells', 'lost-scroll'] }[kind] || []).includes(id);

test('route views: every route collapses to its template, numbers become fixed words', () => {
  for (const [h, want] of Object.entries(SAMPLES)) assert.equal(M.routePath(h, known), want, h);
});

test('every route in the app router has a sample above', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const block = app.slice(app.indexOf('const routes = ['), app.indexOf('];', app.indexOf('const routes = [')));
  const res = [...block.matchAll(/\[\/(.+?)\/, \(m, ctx\)/g)].map(m => new RegExp(m[1]));
  assert.ok(res.length >= 20, 'found the route table');
  for (const re of res) assert.ok(Object.keys(SAMPLES).some(h => re.test(h || '#/')), `no sample for route ${re}`);
});

test('ids not in the catalog (typed or stale links) are sent as unknown, other hashes as other', () => {
  assert.equal(M.routePath('#/skill/swift-tiger-42', known), 'skill/unknown');
  assert.equal(M.routePath('#/game/My Name', known), 'other');
  assert.equal(M.routePath('#/whatever/123', known), 'other');
  assert.equal(M.routePath('#/arena?x=1', known), 'other');
});

test('view() sends one math/view/<route> event; the Mode picker is pick-mode', () => {
  clear();
  M.view('#/arena', known); M.view('#/game/times-sprint/12', known); M.view('#/arena', known, true);
  assert.deepEqual(paths(), ['math/view/arena', 'math/view/game/times-sprint/level', 'math/view/pick-mode']);
});

test('view() names home with the Sky on sky, never home; other routes keep their name', () => {
  clear();
  M.view('#/', known, false, true); M.view('', known, false, true); M.view('#/', known); M.view('#/places', known, false, true); M.view('#/arena', known, false, true);
  assert.deepEqual(paths(), ['math/view/sky', 'math/view/sky', 'math/view/home', 'math/view/places', 'math/view/arena']);
  clear(); M.view('#/', known, true, true);
  assert.deepEqual(paths(), ['math/view/pick-mode']);
});

/* ---------- The guide and the tour (in-app-guide) ---------- */
test('tourEvent: start, finish and skip send math/tour/<kind>; anything else sends nothing', () => {
  clear();
  for (const k of M.TOUR_EVENTS) M.tourEvent(k);
  M.tourEvent('done'); M.tourEvent('tour/skip'); M.tourEvent(undefined); M.tourEvent('Swift Tiger 42');
  assert.deepEqual(paths(), ['math/tour/start', 'math/tour/finish', 'math/tour/skip']);
  assert.ok(sent.every(([, t]) => t === 'Vedic Math: tour'));
});

test('the guide at a section is counted without the section name', () => {
  clear(); M.view('#/guide/katas', known); M.view('#/guide', known);
  assert.deepEqual(paths(), ['math/view/guide/section', 'math/view/guide']);
});

test('app.js sends the tour events with fixed words only', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const kinds = callSites(app).filter(c => c.fn === 'metrics.tourEvent').map(c => c.args).sort();
  assert.deepEqual(kinds, ["'finish'", "'skip'", "'start'"]);
});

/* ---------- Try a trick and Find (first-visit, find, try-trick-in-modes) ---------- */
test('tryStart sends math/try/start and the Mode as a fixed word, findGo one fixed event, with no text in path or title', () => {
  clear(); M.tryStart('pro'); M.findGo(); M.findGo();
  assert.deepEqual(paths(), ['math/try/start', 'math/try/mode/pro', 'math/find/go', 'math/find/go']);
  assert.ok(sent.every(([p, t]) => PATH.test(p) && /^Vedic Math: /.test(t)));
  clear(); M.tryStart('explorer'); M.tryStart('challenger'); M.tryStart('wizard'); M.tryStart('Swift Tiger 42'); M.tryStart();
  assert.deepEqual(paths(), ['math/try/start', 'math/try/mode/explorer', 'math/try/start', 'math/try/mode/challenger', 'math/try/start', 'math/try/start', 'math/try/start']);
});
test('answers in a Try a trick are counted under the try area, and #/try has its own route view', () => {
  clear(); M.answered('try', true); M.answered('try', false);
  assert.deepEqual(paths().filter(p => p.startsWith('math/q_answered/')), ['math/q_answered/try/right', 'math/q_answered/try/miss']);
  assert.equal(M.routePath('#/try'), 'try');
});
/* ---------- Family helpers (openspec family-helpers, analytics delta) ---------- */
test('Family helper events are fixed words only: the Visit level, cheer, ask, show_me, not_now', () => {
  clear(); M.familyVisit(1); M.familyVisit(3); M.familyVisit(2, true); M.familyVisit(4); M.family('ask'); M.family('show_me'); M.family('not_now'); M.family('v-sq5'); M.family('Swift Tiger 42');
  assert.deepEqual(paths(), ['math/family/visit/1', 'math/family/visit/3', 'math/family/cheer', 'math/family/ask', 'math/family/show_me', 'math/family/not_now']);
  assert.ok(sent.every(([p, t]) => PATH.test(p) && t === 'Vedic Math: Family helpers'));
});
test('modeLink sends math/landing/mode/<Mode> for a Mode only, with a fixed title', () => {
  clear(); M.modeLink('pro'); M.modeLink('explorer'); M.modeLink('wizard'); M.modeLink('Swift Tiger 42'); M.modeLink(undefined);
  assert.deepEqual(paths(), ['math/landing/mode/pro', 'math/landing/mode/explorer']);
  assert.ok(sent.every(([p, t]) => PATH.test(p) && t === 'Vedic Math: landing mode card'));
});
test('app.js calls tryStart with only the Mode and findGo with no arguments', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.deepEqual(callSites(app).filter(c => c.fn === 'metrics.tryStart').map(c => c.args.trim()), ['mode', 'm', 'm']); // the picker, the tile Home, the Sky Home
  assert.deepEqual(callSites(app).filter(c => c.fn === 'metrics.findGo').map(c => c.args.trim()), ['']);
});

/* ---------- Installing the app (install-app) ---------- */
test('install: each kind sends math/install/<kind>; wizard_open names a known entry point; anything else sends nothing', () => {
  clear();
  for (const k of M.INSTALL_EVENTS) if (k !== 'wizard_open') M.install(k);
  for (const f of M.INSTALL_FROM) M.install('wizard_open', f);
  M.install('wizard_open'); M.install('wizard_open', 'ios-safari'); M.install('nudge'); M.install('Swift Tiger 42'); M.install(undefined);
  assert.deepEqual(paths(), ['math/install/nudge_shown', 'math/install/nudge_later', 'math/install/prompt_accepted', 'math/install/prompt_dismissed',
    'math/install/installed', 'math/install/opened', 'math/install/wizard_open/home', 'math/install/wizard_open/me', 'math/install/wizard_open/footer', 'math/install/wizard_open/guide']);
  assert.ok(sent.every(([p, t]) => PATH.test(p) && t === 'Vedic Math: install'));
});
test('js/install.js sends install events with fixed words or its entry point only', () => {
  const src = readFileSync(new URL('../js/install.js', import.meta.url), 'utf8');
  const calls = callSites(src).filter(c => c.fn === 'metrics.install');
  assert.ok(calls.length >= 6, `found the call sites (${calls.length})`);
  for (const c of calls) assert.match(c.args.trim(), /^'(nudge_shown|nudge_later|prompt_accepted|prompt_dismissed|installed|opened)'$|^'wizard_open', from$/, c.args);
});

/* ---------- Star Quest counts (sky-home) ---------- */
test('starEvent: each kind with a known Trick sends math/star/<kind>/<trick>', () => {
  clear();
  for (const k of M.STAR_EVENTS) M.starEvent(k, 'sq5');
  M.starEvent('lit', 'zero-sum');
  assert.deepEqual(paths(), ['math/star/lit/sq5', 'math/star/skipped/sq5', 'math/star/comeback/sq5', 'math/star/dare_taken/sq5', 'math/star/dare_won/sq5', 'math/star/lit/zero-sum']);
  assert.ok(sent.every(([, t]) => t === 'Vedic Math: star quest'));
});
test('starEvent: an unknown Trick or kind sends nothing', () => {
  clear();
  M.starEvent('lit', 'v-sq5'); M.starEvent('lit', 'Swift Tiger 42'); M.starEvent('lit', undefined); M.starEvent('dare-won', 'sq5'); M.starEvent('won', 'sq5'); M.starEvent('lit/sq5', 'sq5');
  assert.deepEqual(paths(), []);
});
test('the Star round calls starEvent on lit, skipped, comeback, dare taken and dare won, and the Sky view sends no event of its own', () => {
  const star = readFileSync(new URL('../js/star.js', import.meta.url), 'utf8');
  const kinds = callSites(star).filter(c => c.fn === 'metrics.starEvent').map(c => c.args.match(/^'([a-z_]+)'/)[1]).sort();
  assert.deepEqual(kinds, [...M.STAR_EVENTS].sort());
  const sky = readFileSync(new URL('../js/sky-view.js', import.meta.url), 'utf8');
  assert.deepEqual(callSites(sky).filter(c => c.fn !== 'track' || !/^name, title$/.test(c.args.trim())), []);
  for (const f of ['../js/sky.js', '../js/gamify.js']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /starEvent|siteTrack/, f);
});

/* ---------- Answers and rounds ---------- */
test('answers: one q_answered per answer in untimed areas only', () => {
  clear(); mem['vm.metrics'] = JSON.stringify({ firstWin: true });
  M.answered('practice', true); M.answered('run', false); M.answered('kata', true); M.answered('arena', true); M.answered('star', false); M.answered('star', true);
  assert.deepEqual(paths(), ['math/q_answered/practice/right', 'math/q_answered/run/miss', 'math/q_answered/kata/right', 'math/q_answered/star/miss', 'math/q_answered/star/right']);
});

test('rounds: round2_start only when the second round of an area starts; r1, r2, r3plus', () => {
  clear();
  M.roundStart('arena'); M.roundEnd('arena', 'challenger');
  M.roundStart('game'); // another area's first round
  M.roundStart('arena'); M.roundEnd('arena', 'challenger');
  M.roundStart('arena'); M.roundEnd('arena', 'pro');
  assert.deepEqual(paths(), ['math/round_end/arena/challenger/r1', 'math/round2_start/arena', 'math/round_end/arena/challenger/r2', 'math/round_end/arena/pro/r3plus']);
});

test('a second start after an abandoned second round does not send round2_start again', () => {
  clear();
  M.roundStart('duel'); M.roundEnd('duel', 'explorer');
  M.roundStart('duel'); /* abandoned: no roundEnd */ M.roundStart('duel');
  assert.deepEqual(paths().filter(p => p.includes('round2_start')), ['math/round2_start/duel']);
});

test('unknown areas and Leagues send nothing', () => {
  clear();
  M.roundEnd('arena', 'Swift Tiger 42'); M.roundEnd('practice', 'pro'); M.roundStart('x'); M.answered('arena', true); M.shareClick('anything');
  assert.deepEqual(sent, []);
});

/* ---------- Once per device ---------- */
test('first_win: the five buckets', () => {
  assert.deepEqual([0, 29_999, 30_000, 45_000, 60_000, 89_999, 90_000, 179_999, 180_000, 3_600_000].map(M.winBucket),
    ['under-30', 'under-30', '30-60', '30-60', '60-90', '60-90', '90-180', '90-180', 'over-180', 'over-180']);
  assert.deepEqual([...new Set([0, 30e3, 60e3, 90e3, 180e3].map(M.winBucket))], M.WIN_BUCKETS);
});

test('first_win once per device, 45 seconds after the first visit is 30-60', () => {
  clear();
  const t0 = Date.UTC(2026, 9, 14, 12);
  M.returnCheck(t0);
  M.firstWinCheck(t0 + 45_000); M.firstWinCheck(t0 + 90_000);
  assert.deepEqual(paths(), ['math/first_win/30-60']);
  assert.equal(JSON.parse(mem['vm.metrics']).firstWin, true);
});

test('return_d1 and return_d7 fire once each, on the right days', () => {
  clear();
  const day = n => new Date(2026, 9, 1 + n, 10).getTime();
  M.returnCheck(day(0)); M.returnCheck(day(0) + 3600e3);
  assert.deepEqual(sent, [], 'the first day sends nothing');
  M.returnCheck(day(1)); M.returnCheck(day(1) + 3600e3);
  assert.deepEqual(paths(), ['math/return_d1']);
  M.returnCheck(day(6)); assert.equal(sent.length, 1, 'day 6 is neither');
  M.returnCheck(day(8)); M.returnCheck(day(9));
  assert.deepEqual(paths(), ['math/return_d1', 'math/return_d7']);
});

test('a device that played before these flags existed is not counted as new', () => {
  clear();
  mem['mathquest.v1.p1'] = JSON.stringify({ xp: 120, counts: { answers: 9 } });
  const t0 = Date.now();
  M.returnCheck(t0); M.firstWinCheck(t0 + 5000); M.returnCheck(t0 + 864e5); M.returnCheck(t0 + 8 * 864e5);
  assert.deepEqual(sent, []);
  /* a record saved after Sparks replaced XP (v3) counts the same way */
  clear();
  mem['mathquest.v1.p1'] = JSON.stringify({ v: 3, sparks: 40, counts: {} });
  M.returnCheck(t0); M.firstWinCheck(t0 + 5000); M.returnCheck(t0 + 864e5); M.returnCheck(t0 + 8 * 864e5);
  assert.deepEqual(sent, []);
});

test('share_click: fixed surfaces only', () => {
  clear(); M.shareClick('result'); M.shareClick('challenge-link');
  assert.deepEqual(paths(), ['math/share_click/result', 'math/share_click/challenge-link']);
});

test('no event or title carries anything but fixed words, route names, catalog ids, Leagues and buckets', () => {
  clear(); mem['vm.firstSeen'] = String(Date.now() - 50_000);
  for (const h of Object.keys(SAMPLES)) M.view(h, known);
  for (const a of M.ANSWER_AREAS) { M.answered(a, true); M.answered(a, false); }
  for (const a of M.ROUND_AREAS) for (const l of M.LEAGUES) { M.roundStart(a); M.roundEnd(a, l); }
  for (const s of M.SHARE_SURFACES) M.shareClick(s);
  for (const k of M.STAR_EVENTS) M.starEvent(k, 'sq5');
  for (const k of M.TOUR_EVENTS) M.tourEvent(k);
  for (const k of M.INSTALL_EVENTS) M.install(k, 'home');
  M.view('#/', known, false, true);
  for (const [p, t] of sent) {
    assert.match(p, PATH, p);
    assert.match(t, /^Vedic Math: [a-z ]+$/, t);
    assert.ok(!/swift|tiger|\buid\b|age|score|\d{3,}/i.test(p), p); /* \buid\b: guide holds the letters uid */
  }
});

/* ---------- Identifier scan of every analytics call site ---------- */
/* Each value an analytics call may build its path or title from, and why it is safe. */
const ALLOWED = new Set([
  'name', 'title',             // track()'s own wrapper in app.js passes its arguments on
  's.id', 's.title',           // skill id and title (catalog)
  'trickId', 't.id', 't.title', 'n', // trick ids and titles, Kata number (catalog)
  'trick',                     // a Star round's Trick id (catalog; metrics.starEvent checks it against TRICKS)
  'ch.format', 'id',           // challenge format, challenge number, sutra id, music track id (catalog)
  'c.name',                    // sutra name (catalog)
  'league', 'lg', 'type', 'mode', 'm', // Leagues, round type, game mode, play Mode (fixed sets)
  'g.id', 'g.title',           // game id and title (catalog)
  'v.kind', 'v.title',          // Watch: a video's kind (video or short) and title (catalog, js/videos.js)
  'h', 'knownId', 'picker',    // route views: the hash goes through metrics.routePath and the catalog check
  'asSky',                     // route views: true when home showed the Sky (a fixed word, sky)
  'from',                      // the Install guide's entry point (metrics.install checks it against INSTALL_FROM)
  'ok', "lives ? '' : ''", 'fx.MODES[fx.mode()].league', // right or miss; 'run' or 'practice'; the League
  'surface',                   // a followed Sutra tag's surface: one of the fixed words in js/sutra-tag.js SURFACES
  'v.level', 'cheer',          // a Family helper Visit's level (1 to 3) and whether it is a cheer; metrics.family checks FAMILY_EVENTS
  'result', 'TITLES[result]', // the import page's hand-off result and its title (js/handoff.js count: one of RESULTS, a fixed set the analytics spec lists; test/handoff.test.mjs pins it)
]);
/* Every call of track(, siteTrack( and metrics.<fn>( with its argument text */
export function callSites(src) {
  const out = [], re = /\b(track|siteTrack|metrics\.\w+)\(/g; let m;
  while ((m = re.exec(src))) {
    let i = re.lastIndex, depth = 1, q = null;
    for (; i < src.length && depth; i++) {
      const c = src[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === '`') q = c; else if (c === '(' || c === '[') depth++; else if (c === ')' || c === ']') depth--;
    }
    out.push({ fn: m[1], args: src.slice(re.lastIndex, i - 1) });
  }
  return out;
}
/* The non-literal values in an argument list: ${...} in templates, and the operands of + and , once
   string literals are blanked to '' (so a conditional of two literals reads "x ? '' : ''"). */
export function dynamicValues(args) {
  const vals = [...args.matchAll(/\$\{([^}]*)\}/g)].map(x => x[1].trim());
  const bare = args.replace(/`[^`]*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"/g, "''");
  const parts = []; let depth = 0, cur = '';
  for (const c of bare) {
    if ('([{'.includes(c)) depth++; if (')]}'.includes(c)) depth--;
    if (!depth && (c === ',' || c === '+')) { parts.push(cur); cur = ''; } else cur += c;
  }
  parts.push(cur);
  return vals.concat(parts.map(x => x.trim()).filter(x => x && x !== "''"));
}
/* metrics.js: its own send() checks every path against the allowed shape. analytics.js: the helper itself (siteTrack),
   whose only own event counts a followed link by its public host and path. */
const SKIP = new Set(['metrics.js', 'analytics.js']);

test('every analytics call site in js/ builds paths only from allowed values', () => {
  const dir = new URL('../js/', import.meta.url), bad = [];
  let n = 0;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.js') && !SKIP.has(f))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const c of callSites(src)) {
      if (c.fn === 'track' && /^name, title$/.test(c.args.trim())) continue;
      n++;
      for (const v of dynamicValues(c.args)) if (!ALLOWED.has(v)) bad.push(`${f}: ${c.fn}(${c.args}) uses ${v}`);
    }
  }
  assert.ok(n >= 20, `found the call sites (${n})`);
  assert.deepEqual(bad, []);
});

test('the scan catches a Nickname or Player id in an event', () => {
  for (const src of ["track('x/' + player.name, 'X')", 'track(`x/${p.id}`, "X")', "metrics.answered(store.player().name, ok)", "window.siteTrack('math/s/' + score, 't')"]) {
    const vals = callSites(src).flatMap(c => dynamicValues(c.args));
    assert.ok(vals.some(v => !ALLOWED.has(v)), src);
  }
});

/* ---------- Say it (openspec sutra-pronunciation) ---------- */
test('say() sends math/say/sutra titled "Say a Sutra name", with no Sutra in it', () => {
  clear();
  M.say(); M.say();
  assert.deepEqual(sent, [['math/say/sutra', 'Say a Sutra name'], ['math/say/sutra', 'Say a Sutra name']]);
});
test('js/say.js counts through metrics.say() only, and turning the ambience off is not counted', () => {
  const say = readFileSync(new URL('../js/say.js', import.meta.url), 'utf8'), amb = readFileSync(new URL('../js/sutra-ambience.js', import.meta.url), 'utf8');
  assert.deepEqual(callSites(say).map(c => `${c.fn}(${c.args})`), ['metrics.say()']);
  assert.deepEqual(callSites(amb), [], 'the ambience sends nothing (owner decision 5)');
});
