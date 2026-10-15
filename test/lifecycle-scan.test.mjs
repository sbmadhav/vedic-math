/* Lifecycle scan (view-lifecycle spec): views and rounds tie every listener, timer and frame loop to an
   AbortSignal through js/life.js. A bare addEventListener, setTimeout, setInterval or requestAnimationFrame
   in view or round code is a cleanup someone forgot, so it fails here. The page-lifetime listeners and
   timers that are added once (proposal "Out of scope") are allow-listed by what they attach to. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8').split('\n');
const hits = (file, re, allowed = []) => src(file).flatMap((line, i) => (re.test(line) && !allowed.some(a => a.test(line)) ? [`js/${file}:${i + 1}: ${line.trim().slice(0, 140)}`] : []));

/* Added once for the whole page, never per view */
const PAGE_LISTENERS = [
  /window\.addEventListener\('hashchange', render\)/, // the router
  /document\.addEventListener\('click', e => \{$/, // the Watch link handler (opens the video player)
  /sutraDlg\.addEventListener\(/, /playerDlg\.addEventListener\(/, /ageDlg\.addEventListener\(/, // dialogs created once
  /addEventListener\('load', registerSW, \{ once: true \}\)/ // service worker registration
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

test('no bare timers or frame loops in js/games.js, js/arena.js and js/scenes.js', () => {
  for (const f of ['games.js', 'arena.js', 'scenes.js']) assert.deepEqual(hits(f, TIMERS), [], f);
});

test('view timers in js/app.js go through js/life.js', () => {
  assert.deepEqual(hits('app.js', TIMERS, PAGE_TIMERS), []);
});

test('the router owns one AbortController per render and there is no cleanup variable', () => {
  const app = src('app.js').join('\n');
  assert.doesNotMatch(app, /\bcleanup\s*=/);
  assert.match(app, /new AbortController\(\)/);
});
