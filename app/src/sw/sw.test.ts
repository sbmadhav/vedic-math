/* The service worker's request routing (openspec change react-typescript, task 1.5; offline-app spec), on the worker
   exactly as build.py publishes it, with a built VERSION, fake caches and a fake network (./harness.ts). The thumbnail
   case was test/sw-thumbs.test.mjs (openspec change learnvedicmath, review). */
import { test, expect } from 'vitest';
import { load, response, ORIGIN } from './harness.ts';

const built = (more: [RegExp | string, string][] = []) => load({ edits: [["const VERSION = 'dev';", "const VERSION = 'test123456';"], ...more], expose: ['page'] });
const at = (path: string) => ORIGIN + path;

test('who answers what: pages, hashed files, sounds, voice and plain files go through the worker', () => {
  const sw = built();
  expect(sw.request(at('/learn/'), { mode: 'navigate' }).answered).toBe(true);
  expect(sw.request(at('/js/app.js?v=abcdef0123')).answered).toBe(true);
  expect(sw.request(at('/sounds/om.m4a?v=1')).answered).toBe(true);
  expect(sw.request('https://voice.learnvedicmath.com/l/0123456789abcd.m4a').answered).toBe(true);
  expect(sw.request(at('/vendor/tesseract/worker.min.js')).answered).toBe(true);
});

test('left to the browser: another origin, a POST, /api/, a page outside /learn/ and video pictures', () => {
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
  expect((await sw.request(at('/learn/?source=pwa'), { mode: 'navigate' }).answer!).body).toBe(`net:${at('/learn/?source=pwa')}`);
  await sw.open('lvm-test123456').put(at('/learn/'), response('the shell'));
  sw.net.up = false;
  expect((await sw.request(at('/learn/'), { mode: 'navigate' }).answer!).body).toBe('the shell');
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
