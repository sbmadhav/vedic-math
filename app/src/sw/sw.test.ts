/* The service worker's request routing (openspec change react-typescript, task 1.5; offline-app spec), on the worker
   exactly as build.py publishes it, with a built VERSION, fake caches and a fake network (./harness.ts). The thumbnail
   case was test/sw-thumbs.test.mjs (openspec change learnvedicmath, review). */
import { test, expect } from 'vitest';
import { load, response, ORIGIN, type FakeResponse } from './harness.ts';

const built = (more: [RegExp | string, string][] = []) => load({ edits: [["const VERSION = 'dev';", "const VERSION = 'test123456';"], ...more], expose: ['page'] });
const at = (path: string) => ORIGIN + path;

test('who answers what: pages, hashed files, sounds, voice and plain files go through the worker', () => {
  const sw = built();
  expect(sw.request(at('/play/'), { mode: 'navigate' }).answered).toBe(true);
  expect(sw.request(at('/js/app.js?v=abcdef0123')).answered).toBe(true);
  expect(sw.request(at('/sounds/om.m4a?v=1')).answered).toBe(true);
  expect(sw.request('https://voice.learnvedicmath.com/l/0123456789abcd.m4a').answered).toBe(true);
  expect(sw.request(at('/vendor/tesseract/worker.min.js')).answered).toBe(true);
});

test('left to the browser: another origin, a POST, /api/, a page outside /play/ and video pictures', () => {
  const sw = built();
  expect(sw.request('https://firestore.googleapis.com/v1/projects/x').answered).toBe(false);
  expect(sw.request('https://www.youtube-nocookie.com/embed/x', { mode: 'navigate' }).answered).toBe(false);
  expect(sw.request(at('/_csp'), { method: 'POST' }).answered).toBe(false);
  expect(sw.request(at('/api/voice/v1/say?x=1')).answered).toBe(false);
  expect(sw.request(at('/parents/'), { mode: 'navigate' }).answered).toBe(false);
  expect(sw.request(at('/thumbs/yt-abc.webp')).answered).toBe(false);
});

test('a hashed file is cache first; a plain file is network first with the cache when offline', async () => {
  const sw = built();
  const first = await sw.request(at('/js/app.js?v=abcdef0123')).answer!;
  sw.net.up = false;
  expect((await sw.request(at('/js/app.js?v=abcdef0123')).answer!).body).toBe(first.body);
  sw.net.up = true;
  const plain = await sw.request(at('/manifest.webmanifest')).answer!;
  await new Promise(r => setTimeout(r, 0)); // the runtime put is not awaited by the response
  sw.net.body = 'changed';
  expect((await sw.request(at('/manifest.webmanifest')).answer!).body).toBe(`changed:${at('/manifest.webmanifest')}`);
  sw.net.up = false;
  expect((await sw.request(at('/manifest.webmanifest')).answer!).body).not.toBe(plain.body);
  expect((await sw.request(at('/manifest.webmanifest')).answer!).body).toBe(`changed:${at('/manifest.webmanifest')}`);
});

test('a page load is network first; offline it gets the saved shell of this version', async () => {
  const sw = built();
  expect((await sw.request(at('/play/?source=pwa'), { mode: 'navigate' }).answer!).body).toBe(`net:${at('/play/?source=pwa')}`);
  await sw.open('lvm-test123456').put(at('/play/'), response('the shell'));
  sw.net.up = false;
  expect((await sw.request(at('/play/'), { mode: 'navigate' }).answer!).body).toBe('the shell');
});

test("a 'dev' worker has no fetch handler, so the browser goes to the network", () => {
  const sw = load();
  expect(sw.listeners.fetch).toBeUndefined();
  expect(sw.request(at('/js/app.js?v=abcdef0123')).answered).toBe(false);
});

test('--voice off: no request is a Studio voice file', () => {
  const sw = built([[/^const VOICE_ORIGIN = .*$/m, 'const VOICE_ORIGIN = null;']]);
  expect(sw.request('https://voice.learnvedicmath.com/l/0123456789abcd.m4a').answered).toBe(false);
});

/* Saved on first request, carried across versions (openspec change render-performance, design D10, owner P5): the
   Play experiences, their styles, their kit and the video list are LAZY, never precached */
const LAZY = ['/js/play/exp/tala.js?v=aaaaaaaaaa', '/css/play/tala.css?v=bbbbbbbbbb', '/js/videos.js?v=cccccccccc'];
const lazy = (more: [RegExp | string, string][] = []) => built([['const LAZY = [];', `const LAZY = ${JSON.stringify(LAZY)};`], ...more]);
const activate = async (sw: ReturnType<typeof built>) => { let done: Promise<void> = Promise.resolve(); sw.listeners.activate!({ waitUntil: (p: Promise<void>) => { done = p; } }); await done; };
const settled = () => new Promise(r => setTimeout(r, 5)); // the runtime put is not awaited by the response

test('a lazy file is saved the first time a page requests it, when it is a success of the type its name says', async () => {
  const sw = lazy();
  await sw.request(at(LAZY[0]!)).answer!;
  await settled();
  expect(await sw.open('lvm-test123456').match(at(LAZY[0]!))).toBeDefined();
  /* The 404 page is HTML with a 404 status; a success of the wrong type is not saved either */
  sw.net.type = 'text/html; charset=utf-8';
  await sw.request(at(LAZY[1]!)).answer!;
  await settled();
  expect(await sw.open('lvm-test123456').match(at(LAZY[1]!))).toBeUndefined();
  sw.net.type = undefined;
  await sw.request(at(LAZY[1]!)).answer!;
  await settled();
  expect(await sw.open('lvm-test123456').match(at(LAZY[1]!))).toBeDefined();
});

test('activate carries the saved lazy files this version still uses into its cache, and no other', async () => {
  const sw = lazy();
  const older = sw.open('lvm-older00000'), old = sw.open('lvm-old0000000');
  await older.put(at(LAZY[0]!), response('tala from two versions ago'));
  await old.put(at(LAZY[0]!), response('tala from the version before'));
  await old.put(at(LAZY[2]!), response('videos'));
  await old.put(at('/js/play/exp/art.js?v=0000000000'), response('art, changed since: a new stamp, not in LAZY'));
  await old.put(at('/js/app.js?v=1111111111'), response('a precached module of the old version'));
  await old.put(at('/manifest.webmanifest'), response('a plain file'));
  await activate(sw);
  const now = sw.open('lvm-test123456');
  expect((await now.match(at(LAZY[0]!)))!.body).toBe('tala from the version before');
  expect((await now.match(at(LAZY[2]!)))!.body).toBe('videos');
  for (const u of ['/js/play/exp/art.js?v=0000000000', '/js/app.js?v=1111111111', '/manifest.webmanifest']) expect(await now.match(at(u)), u).toBeUndefined();
  expect([...sw.caches.keys()]).toEqual(['lvm-old0000000', 'lvm-test123456']); // the version before is kept, older ones deleted
});

test('activate enables navigation preload, and a page load takes the preloaded response instead of fetching again', async () => {
  const sw = built();
  expect(sw.registration.navigationPreload.enabled).toBe(false);
  await activate(sw);
  expect(sw.registration.navigationPreload.enabled).toBe(true);
  let answer: Promise<FakeResponse> | null = null;
  sw.listeners.fetch!({ request: { method: 'GET', url: at('/play/'), mode: 'navigate' }, preloadResponse: Promise.resolve(response('preloaded page')), respondWith: (p: Promise<FakeResponse>) => { answer = p; } });
  expect((await answer!).body).toBe('preloaded page');
  expect(sw.net.calls).toEqual([]);
  /* No preloaded response (preload off, or a browser without it): the page is fetched as before */
  sw.listeners.fetch!({ request: { method: 'GET', url: at('/play/'), mode: 'navigate' }, preloadResponse: Promise.resolve(undefined), respondWith: (p: Promise<FakeResponse>) => { answer = p; } });
  expect((await answer!).body).toBe(`net:${at('/play/')}`);
});

test('saved stamped files are never trimmed with the runtime entries', async () => {
  const sw = lazy([['const RUNTIME_MAX = 60;', 'const RUNTIME_MAX = 2;']]);
  for (const u of LAZY) await sw.request(at(u)).answer!;
  for (const u of ['/vendor/a.js', '/vendor/b.js', '/vendor/c.js', '/vendor/d.js']) { await sw.request(at(u)).answer!; await settled(); }
  const keys = (await sw.open('lvm-test123456').keys()).map(k => new URL(k.url).pathname + new URL(k.url).search);
  for (const u of LAZY) expect(keys).toContain(u);
  expect(keys.filter(k => k.startsWith('/vendor/'))).toEqual(['/vendor/c.js', '/vendor/d.js']);
});

test("a page's 'cached?' message is answered on its port with the saved URLs among those asked", async () => {
  const sw = lazy();
  await sw.request(at(LAZY[0]!)).answer!;
  await settled();
  let got: unknown = null, done: Promise<void> = Promise.resolve();
  sw.listeners.message!({ data: { type: 'cached?', urls: [LAZY[0], LAZY[1], 42] }, ports: [{ postMessage: (m: unknown) => { got = m; } }], waitUntil: (p: Promise<void>) => { done = p; } });
  await done;
  expect(got).toEqual({ type: 'cached', urls: [LAZY[0]] });
  /* Another message, or one without a port, is ignored */
  got = null;
  sw.listeners.message!({ data: { type: 'hello' }, ports: [{ postMessage: (m: unknown) => { got = m; } }], waitUntil: () => {} });
  sw.listeners.message!({ data: { type: 'cached?', urls: LAZY }, ports: [], waitUntil: () => {} });
  await settled();
  expect(got).toBeNull();
});
