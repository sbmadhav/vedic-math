/* sw.js (openspec change learnvedicmath, review): video pictures under /thumbs/ are left to the network, so a scroll
   through the Watch shelf never pushes the large vendor files out of the runtime cache. Other same-origin files are
   still answered by the worker. sw.js runs in a vm with a non-dev VERSION and fake caches. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function fetchHandler() {
  const listeners = {};
  const ctx = {
    self: { addEventListener: (t, f) => { listeners[t] = f; }, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => ({ match: async () => undefined, put: async () => {}, keys: async () => [], delete: async () => true }), keys: async () => [], delete: async () => true },
    fetch: async () => ({ ok: true, type: 'basic', clone() { return this; } }),
    location: { origin: 'https://learnvedicmath.com' }, URL, setTimeout, Promise, console,
  };
  const src = readFileSync(new URL('../sw.js', import.meta.url), 'utf8').replace("const VERSION = 'dev';", "const VERSION = 'test1234';");
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return url => {
    let answered = false;
    listeners.fetch({ request: { method: 'GET', url, mode: 'no-cors' }, respondWith: p => { answered = true; Promise.resolve(p).catch(() => {}); } });
    return answered;
  };
}

test('a thumbnail is left to the network; a script is answered by the worker', () => {
  const handle = fetchHandler();
  assert.equal(handle('https://learnvedicmath.com/thumbs/yt-abc.webp'), false);
  assert.equal(handle('https://learnvedicmath.com/js/app.js?v=abc'), true);
  assert.equal(handle('https://learnvedicmath.com/vendor/tesseract/worker.min.js'), true);
});
