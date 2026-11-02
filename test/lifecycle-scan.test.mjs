/* Lifecycle scan (view-lifecycle spec): views and rounds tie every listener, timer and frame loop to an
   AbortSignal through js/life.js. A bare addEventListener, setTimeout, setInterval or requestAnimationFrame
   in view or round code is a cleanup someone forgot, so it fails here. The page-lifetime listeners and
   timers that are added once (proposal "Out of scope") are allow-listed by what they attach to. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8').split('\n');
const hits = (file, re, allowed = []) => src(file).flatMap((line, i) => (re.test(line) && !allowed.some(a => a.test(line)) ? [`js/${file}:${i + 1}: ${line.trim().slice(0, 140)}`] : []));

/* Added once for the whole page, never per view */
const PAGE_LISTENERS = [
  /document\.addEventListener\('click', e => \{$/, // the Watch link handler (opens the video player)
  /sutraDlg\.addEventListener\(/, /playerDlg\.addEventListener\(/, /ageDlg\.addEventListener\(/, // dialogs created once
  /addEventListener\('load', registerSW, \{ once: true \}\)/, // service worker registration
  /document\.addEventListener\('vmplay', onPlay\)/, // play rewards (Sparks and badge counts), added once
  /document\.addEventListener\('keydown', e => \{$/ // the / key that opens Find from any page (openspec find), added once
];
const PAGE_TIMERS = [
  /sparksTimer = setTimeout\(/, /clearTimeout\(sparksTimer\)/, // weekly Sparks post, at most once a minute
  /playerDlg\._minute = setTimeout\(/, /clearTimeout\(playerDlg\._minute\)/ // the video player's one-minute badge
];
const TIMERS = /\b(setTimeout|setInterval|requestAnimationFrame|cancelAnimationFrame|clearTimeout|clearInterval)\(/;

test('no bare addEventListener on a view or round root in js/app.js and js/arena.js', () => {
  assert.deepEqual(hits('app.js', /\.?addEventListener\(/, PAGE_LISTENERS), []);
  assert.deepEqual(hits('arena.js', /\.?addEventListener\(/), []);
});

test('no bare timers or frame loops in js/games.js, js/arena.js, js/scenes.js and js/star.js', () => {
  for (const f of ['games.js', 'arena.js', 'scenes.js', 'star.js']) assert.deepEqual(hits(f, TIMERS), [], f);
});

test('no bare addEventListener in the Star round (js/star.js)', () => {
  assert.deepEqual(hits('star.js', /\.?addEventListener\(/), []);
});

test('the Sky (js/sky-view.js): no bare listeners, timers or frame loops; its listeners go through life.on', () => {
  assert.deepEqual(hits('sky-view.js', /\.?addEventListener\(/), []);
  assert.deepEqual(hits('sky-view.js', TIMERS), []);
  const src = readFileSync(new URL('../js/sky-view.js', import.meta.url), 'utf8');
  assert.match(src, /import \{[^}]*\bon\b[^}]*\} from '\.\/life\.js'/);
  assert.ok((src.match(/\bon\([^;]*\bsignal\b/g) || []).length >= 4, 'pointer, scroll and motion listeners on the view signal');
});

test('the Family helpers (js/family-view.js, js/family-hook.js, js/family-helpers.js): no bare listeners, timers or frame loops', () => {
  for (const f of ['family-view.js', 'family-hook.js', 'family-helpers.js']) {
    assert.deepEqual(hits(f, /\.?addEventListener\(/), [], f);
    assert.deepEqual(hits(f, TIMERS), [], f);
  }
  const src = readFileSync(new URL('../js/family-view.js', import.meta.url), 'utf8');
  assert.match(src, /import \{[^}]*\bon\b[^}]*\blater\b[^}]*\bchild\b[^}]*\} from '\.\/life\.js'/);
});

test('Try a trick (js/try.js): no bare listeners or timers; its listeners go through life.on on a child signal', () => {
  assert.deepEqual(hits('try.js', /\.?addEventListener\(/), []);
  assert.deepEqual(hits('try.js', TIMERS), []);
  const src = readFileSync(new URL('../js/try.js', import.meta.url), 'utf8');
  assert.match(src, /import \{[^}]*\bon\b[^}]*\bchild\b[^}]*\} from '\.\/life\.js'/);
  assert.match(src, /round = child\(signal\)/);
  assert.doesNotMatch(src, /\.on(click|submit|keydown)\s*=/);
});

test('no bare listeners or timers in the play shell (js/shell.js)', () => {
  assert.deepEqual(hits('shell.js', /\.?addEventListener\(/), []);
  assert.deepEqual(hits('shell.js', TIMERS), []);
});

test('view timers in js/app.js go through js/life.js', () => {
  assert.deepEqual(hits('app.js', TIMERS, PAGE_TIMERS), []);
});

test('the first-visit tour (js/tour.js): no bare listeners or timers; its listeners go through life.on on a child signal', () => {
  assert.deepEqual(hits('tour.js', /\.?addEventListener\(/), []);
  assert.deepEqual(hits('tour.js', TIMERS), []);
  const src = readFileSync(new URL('../js/tour.js', import.meta.url), 'utf8');
  assert.match(src, /import \{[^}]*\bon\b[^}]*\bchild\b[^}]*\} from '\.\/life\.js'/);
  assert.ok(src.split('\n').filter(l => /^\s*on\(/.test(l) && /\bls\b/.test(l)).length >= 4, 'dialog, resize, scroll and motion listeners on the tour signal');
});

test('the router owns one AbortController per render and there is no cleanup variable', () => {
  const app = src('app.js').join('\n');
  assert.doesNotMatch(app, /\bcleanup\s*=/);
  assert.match(app, /new AbortController\(\)/);
});

test('Say it (js/say.js) and the Sutra ambience (js/sutra-ambience.js): no bare listeners or timers; they go through life.js', () => {
  for (const f of ['say.js', 'sutra-ambience.js']) {
    assert.deepEqual(hits(f, /\.?addEventListener\(/), [], f);
    assert.deepEqual(hits(f, TIMERS), [], f);
    assert.match(readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8'), /import \{[^}]*\bon\b[^}]*\} from '\.\/life\.js'/, f);
  }
});

test('the Mode picker and the Home More toggle bind through life.on on the view signal, not onclick or ontoggle properties', () => {
  const app = src('app.js').join('\n');
  const picker = app.slice(app.indexOf('function modePicker('), app.indexOf('\n}\n', app.indexOf('function modePicker(')));
  assert.doesNotMatch(picker, /\.on(click|toggle)\s*=/);
  assert.ok((picker.match(/\bon\(/g) || []).length >= 1 && (picker.match(/\}, signal\)/g) || []).length >= 1, 'Mode cards on the view signal'); /* the cards are the picker's only buttons (openspec change play-nav-by-mode) */
  assert.match(app, /if \(ctx\.signal\) on\(hm, 'toggle', keepMore, ctx\.signal\); else hm\.ontoggle = keepMore;/, 'More ways to play: the property only without a view signal');
});

test('the background sky (js/sky-bg.js): no bare listeners, timers or frame loops; they go through life.js on the scene signal', () => {
  assert.deepEqual(hits('sky-bg.js', /\.?addEventListener\(/), []);
  assert.deepEqual(hits('sky-bg.js', TIMERS), []);
  const src = readFileSync(new URL('../js/sky-bg.js', import.meta.url), 'utf8');
  assert.match(src, /import \{[^}]*\bon\b[^}]*\bloop\b[^}]*\} from '\.\/life\.js'/);
  assert.match(src, /loop\(frame, loopCtl\.signal\)/, 'the frame loop runs on a child signal, aborted when the tab hides or motion stops');
  assert.match(src, /on\(document, 'visibilitychange', sync, signal\)/);
});

test('installing the app (js/install.js, js/prompt-slot.js): no bare listeners or timers; the install prompt and appinstalled go through life.on', () => {
  for (const f of ['install.js', 'install-rules.js', 'prompt-slot.js']) {
    assert.deepEqual(hits(f, /\.?addEventListener\(/), [], f);
    assert.deepEqual(hits(f, TIMERS), [], f);
  }
  const src = readFileSync(new URL('../js/install.js', import.meta.url), 'utf8');
  assert.match(src, /on\(window, 'beforeinstallprompt', [^\n]*, ps\);/, 'the install prompt on the page signal');
  assert.match(src, /on\(window, 'appinstalled', [^\n]*, ps\);/, 'appinstalled on the page signal');
  assert.match(src, /on\(slot, 'click', [\s\S]*?\}, ctl\.signal\);/, 'the nudge on a child of the view signal');
  assert.match(src, /every\([^\n]*, 2000, poll\.signal\)/, 'the nudge looks again on a child signal that stops after a minute');
});
