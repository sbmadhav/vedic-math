/* Installing the app (openspec change install-app): which browser this is, whether the game runs as the Installed
   app, the Install nudge's schedule (js/install-rules.js), and the Prompt slot (js/prompt-slot.js). */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../js/install-rules.js';
import * as slot from '../js/prompt-slot.js';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  ipadSafari: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/141.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/138.0.3351.65 Mobile/15E148 Safari/605.1.15',
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.28.85 (iPhone15,3; iOS 18_5; en_US; en; scale=3.00; 1290x2796; 123)',
  gmailIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.40.109;]',
  androidWebView: 'Mozilla/5.0 (Linux; Android 14; SM-S918B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36',
  androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0',
  edgeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 EdgA/138.0.0.0',
  chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  chromeOS: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  edgeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  firefoxMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15.5; rv:141.0) Gecko/20100101 Firefox/141.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0',
};

test('platformOf: every browser the Install guide has steps for', () => {
  const want = {
    iphoneSafari: 'ios-safari', ipadSafari: 'ios-safari', iphoneChrome: 'ios-browser', iphoneFirefox: 'ios-browser', iphoneEdge: 'ios-browser',
    instagramIos: 'in-app', gmailIos: 'in-app', facebookAndroid: 'in-app', androidWebView: 'in-app',
    androidChrome: 'android-chrome', samsung: 'android-samsung', firefoxAndroid: 'android-firefox', edgeAndroid: 'android-other',
    chromeWin: 'desktop-chrome', chromeMac: 'desktop-chrome', chromeOS: 'desktop-chrome', edgeWin: 'desktop-edge',
    safariMac: 'mac-safari', firefoxMac: 'desktop-firefox', firefoxLinux: 'desktop-firefox',
  };
  for (const [name, kind] of Object.entries(want)) assert.equal(R.platformOf({ ua: UA[name], touch: name.startsWith('i') ? 5 : 0 }), kind, name);
  assert.equal(R.platformOf({ ua: '' }), 'other');
  assert.equal(R.platformOf(), 'other');
  for (const k of Object.values(want)) assert.ok(R.KINDS.includes(k), k);
});

test('platformOf: iPadOS asks for desktop pages with a Mac user agent; a touch screen tells it from a Mac', () => {
  assert.equal(R.platformOf({ ua: UA.ipadDesktop, touch: 5 }), 'ios-safari');
  assert.equal(R.platformOf({ ua: UA.ipadDesktop, touch: 0 }), 'mac-safari');
});

test('isInstalled: a standalone-like display mode or iOS navigator.standalone', () => {
  assert.equal(R.isInstalled({ displayMode: 'browser' }), false);
  assert.equal(R.isInstalled({}), false);
  for (const m of ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']) assert.equal(R.isInstalled({ displayMode: m }), true, m);
  assert.equal(R.isInstalled({ displayMode: 'browser', iosStandalone: true }), true);
  assert.equal(R.isInstalled({ displayMode: 'browser', iosStandalone: 'yes' }), false);
});

test('readState: the saved install state, with anything odd ignored', () => {
  assert.deepEqual(R.readState(null), { later: 0, until: 0, installed: 0 });
  assert.deepEqual(R.readState('not json'), { later: 0, until: 0, installed: 0 });
  assert.deepEqual(R.readState('{"later":2,"until":5,"installed":0,"name":"Swift Tiger 42"}'), { later: 2, until: 5, installed: 0 });
  assert.deepEqual(R.readState({ later: 99, until: -1, installed: 'x' }), { later: R.MAX_LATER, until: 0, installed: 0 });
});

const DAY = 864e5, NOW = Date.UTC(2026, 9, 21, 12);
const due = (o = {}) => R.nudgeDue({ kind: 'android-chrome', canPrompt: true, installed: false, engaged: true, busy: false, state: null, now: NOW, ...o });

test('nudgeDue: an engaged Player on a browser that can install, with the slot free', () => {
  assert.equal(due(), true);
  assert.equal(due({ kind: 'ios-safari', canPrompt: false }), true, 'Safari on iPhone and iPad never hands over a prompt');
  assert.equal(due({ canPrompt: false }), false, 'Chrome without its prompt: nothing to offer in one tap, so no nudge');
  for (const k of ['ios-browser', 'in-app', 'desktop-firefox', 'mac-safari', 'other']) assert.equal(due({ kind: k, canPrompt: false }), false, k);
  assert.equal(due({ engaged: false }), false, 'a first day of play');
  assert.equal(due({ busy: true }), false, 'another prompt, a dialog or a toast');
  assert.equal(due({ installed: true }), false, 'the Installed app');
  assert.equal(due({ state: { installed: NOW - DAY } }), false, 'this browser installed it');
});

test('"Not now" hides the nudge for 7 days, three times, then for good', () => {
  let s = null, now = NOW;
  for (let n = 1; n <= R.MAX_LATER; n++) {
    s = R.pressLater(s, now);
    assert.equal(s.later, n);
    assert.equal(due({ state: s, now: now + 1 }), false, `hidden right after Not now ${n}`);
    assert.equal(due({ state: s, now: now + R.LATER_DAYS * DAY - 1 }), false, `still hidden on day 6 after Not now ${n}`);
    now += R.LATER_DAYS * DAY;
    assert.equal(due({ state: s, now }), n < R.MAX_LATER, `after 7 days, Not now ${n}`);
  }
  assert.equal(due({ state: s, now: now + 365 * DAY }), false, 'never again after the third');
  assert.equal(R.pressLater(s, now).later, R.MAX_LATER);
});

test('appinstalled stops the nudge; a new install prompt (the app was removed) lets it come back, keeping the Not now count', () => {
  const s = R.markInstalled(R.pressLater(null, NOW - 30 * DAY), NOW);
  assert.equal(due({ state: s }), false);
  const back = R.markNotInstalled(s);
  assert.equal(back.installed, 0);
  assert.equal(back.later, 1);
  assert.equal(due({ state: back }), true);
});

test('the Prompt slot: one holder at a time, freed when its signal aborts or it releases', () => {
  const doc = { querySelector: () => null };
  assert.equal(slot.free(doc), true);
  const a = new AbortController();
  assert.equal(slot.claim('install', a.signal), true);
  assert.equal(slot.claim('install', a.signal), true, 'the holder may claim again');
  assert.equal(slot.free(doc), false);
  const b = new AbortController();
  assert.equal(slot.claim('family', b.signal), false, 'a second prompt waits');
  a.abort();
  assert.equal(slot.free(doc), true);
  assert.equal(slot.claim('family', b.signal), true);
  slot.release('install');
  assert.equal(slot.holderOf(), 'family', 'only the holder releases');
  slot.release('family');
  assert.equal(slot.free(doc), true);
});

test('the Prompt slot is not free while a dialog, a toast, the tour or a round is on screen', () => {
  let found = null;
  const doc = { querySelector: sel => { found = sel; return {}; } };
  assert.equal(slot.free(doc), false);
  for (const s of ['dialog[open]', '.fx-toast', 'html.play-open', 'html.tour-open']) assert.ok(found.includes(s), s);
});

test('the Install guide has steps for every kind, with pictures it draws, and no em dash', async () => {
  const src = readFileSync(new URL('../js/install.js', import.meta.url), 'utf8');
  for (const k of R.KINDS) assert.match(src, new RegExp(`'${k}'|\\b${k}:`), k);
  assert.doesNotMatch(src, /—|&mdash;/);
});

test('the game page: theme-color is the Daybreak --bg, and the pre-paint script sets the Deep Space --bg before the first paint', () => {
  /* A meta tag cannot read a CSS token, so these are the two places the page spells a color out; they must be the tokens' values */
  const html = readFileSync(new URL('../learn/index.html', import.meta.url), 'utf8');
  const tokens = readFileSync(new URL('../vendor/design-system/2.2.0/tokens.css', import.meta.url), 'utf8');
  const daybreak = tokens.match(/:root\s*\{[\s\S]*?--bg:\s*(#[0-9A-Fa-f]{6})/)[1].toLowerCase();
  const deepSpace = tokens.match(/:root\[data-theme="dark"\]\s*\{[\s\S]*?--bg:\s*(#[0-9A-Fa-f]{6})/)[1].toLowerCase();
  assert.notEqual(daybreak, deepSpace);
  const metas = [...html.matchAll(/<meta name="theme-color" content="(#[0-9A-Fa-f]{6})">/g)];
  assert.equal(metas.length, 1, 'one theme-color tag (two with media queries could not follow a saved scheme)');
  assert.equal(metas[0][1].toLowerCase(), daybreak);
  const set = html.match(/meta\[name="theme-color"\]'\)\.content='(#[0-9A-Fa-f]{6})'/);
  assert.ok(set, 'the pre-paint script sets the bar color');
  assert.equal(set[1].toLowerCase(), deepSpace);
  assert.ok(metas[0].index < html.indexOf("localStorage.getItem('theme')"), 'the tag comes before the script that sets it');
  for (const n of ['apple-mobile-web-app-capable', 'mobile-web-app-capable']) assert.match(html, new RegExp(`<meta name="${n}" content="yes">`), n);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="Vedic Math">/);
});

test('the manifest: the game as its own app, every field the install screens use', () => {
  const m = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(m.name, 'Learn Vedic Math');
  assert.equal(m.short_name, 'Vedic Math');
  assert.equal(m.id, '/play/', 'the id from before the move to /learn/ names the installed app, so it never changes (indexable-routes D10)');
  assert.equal(m.scope, R.SCOPE);
  assert.ok(m.start_url.startsWith(R.SCOPE));
  assert.equal(m.display, 'standalone');
  const tokens = readFileSync(new URL('../vendor/design-system/2.2.0/tokens.css', import.meta.url), 'utf8');
  const daybreakBg = tokens.match(/:root\s*\{[\s\S]*?--bg:\s*(#[0-9A-Fa-f]{6})/)[1];
  assert.equal(m.background_color.toLowerCase(), daybreakBg.toLowerCase(), 'the Daybreak --bg token');
  assert.equal(m.theme_color.toLowerCase(), daybreakBg.toLowerCase());
  for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['192x192', 'maskable'], ['512x512', 'maskable']])
    assert.ok(m.icons.some(i => i.sizes === size && i.purpose === purpose), `${size} ${purpose}`);
  assert.ok(m.screenshots.some(s => s.form_factor === 'narrow') && m.screenshots.some(s => s.form_factor === 'wide'));
  for (const s of m.screenshots) {
    const [w, h] = s.sizes.split('x').map(Number);
    assert.ok(w >= 320 && h >= 320 && w <= 3840 && h <= 3840 && Math.max(w, h) / Math.min(w, h) <= 2.3, s.src);
    const png = readFileSync(new URL('..' + s.src, import.meta.url));
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [w, h], `${s.src} is ${s.sizes}`);
    assert.ok(s.label && s.label.length > 5, s.src);
  }
  for (const s of m.shortcuts) assert.match(s.url, new RegExp(`^${R.SCOPE}[a-z][\\w/-]*$`), `${s.url}: a screen's path, no #/ route`);
});
