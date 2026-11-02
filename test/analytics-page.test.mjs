/* js/analytics.js: the path GoatCounter's page view is given (openspec change indexable-routes, design D11, task 2.5).
   The script runs in a vm with a fake page on the live host; nothing loads and nothing is sent. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../js/analytics.js', import.meta.url), 'utf8');

/* Runs analytics.js on a page at `href` with an optional canonical link, then its load step; gives window.goatcounter
   (and window.siteTrack in `out`) */
function pageView(href, canonical, out = {}) {
  const location = new URL(href);
  const loaded = [];
  const document = {
    readyState: 'complete', documentElement: { dataset: {} },
    querySelector: sel => (sel.startsWith('link[rel="canonical"]') && canonical ? { href: canonical } : null),
    createElement: () => ({ dataset: {} }),
    head: { appendChild: s => loaded.push(s) },
    addEventListener() {},
  };
  const window = {};
  const ctx = { window, document, location, navigator: {}, URL, setTimeout, requestIdleCallback: fn => fn(), addEventListener() {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  assert.ok(loaded.length > 0, 'count.js is loaded on the live host');
  out.siteTrack = ctx.siteTrack;
  return ctx.goatcounter;
}

test('the page view names the path, never the query', () => {
  for (const [href, canonical, want] of [
    ['https://learnvedicmath.com/learn/arena?mode=pro', 'https://learnvedicmath.com/learn/arena', '/learn/arena'],
    ['https://learnvedicmath.com/learn/skill/v-sq5?problem=1-42', 'https://learnvedicmath.com/learn/skill/v-sq5', '/learn/skill/v-sq5'],
    ['https://learnvedicmath.com/learn/?source=pwa', 'https://learnvedicmath.com/learn/', '/learn/'],
    ['https://learnvedicmath.com/learn/arnea?x=1', null, '/learn/arnea'], // the 404 shell has no canonical
    ['https://learnvedicmath.com/?home', 'https://learnvedicmath.com/', '/'],
  ]) {
    const gc = pageView(href, canonical);
    assert.equal(typeof gc.path, 'function', 'count.js calls it for the page view');
    assert.equal(gc.path('/ignored?q=1'), want, href);
  }
});

test('a share or challenge link is counted as the page that answers it, so its codes never reach GoatCounter', () => {
  const gc = pageView('https://learnvedicmath.com/learn/arena/day/2026-10-30/challenger/240', 'https://learnvedicmath.com/learn/arena');
  assert.equal(gc.path(), '/learn/arena');
  assert.equal(pageView('https://learnvedicmath.com/learn/arena/ghosts/r/abc', 'https://learnvedicmath.com/learn/arena/ghosts').path(), '/learn/arena/ghosts');
});

test('an event keeps its own path: the page-view path is only the default', () => {
  const ctx = {};
  const gc = pageView('https://learnvedicmath.com/learn/arena?mode=pro', 'https://learnvedicmath.com/learn/arena', ctx);
  const sent = [];
  gc.count = e => sent.push(e);
  ctx.siteTrack('math/view/arena', 'Vedic Math: page view');
  /* count.js takes vars.path over goatcounter.path, so an event is counted under its own fixed name */
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [{ path: 'math/view/arena', title: 'Vedic Math: page view', event: true }]);
});
