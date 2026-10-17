/* sw.js soundFile (openspec sutra-pronunciation, review follow-up): sounds/ files with ?v= are cache first and never
   go stale (a changed file is a new URL), a sounds/ URL without ?v= is network first with the cache as the offline
   fallback, and the trim of the long-lived sound cache runs one at a time. sw.js runs in a vm with fake caches and fetch. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function load({ max } = {}) {
  const store = new Map(); // url -> body
  const order = []; // urls in the order their puts completed (the order cache.keys() lists them)
  const cache = {
    match: async req => (store.has(req.url) ? { ok: true, type: 'basic', body: store.get(req.url), clone() { return this; } } : undefined),
    put: async (req, res) => { await new Promise(r => setTimeout(r, Math.random() * 3)); store.delete(req.url); store.set(req.url, res.body); order.push(req.url); },
    keys: async () => [...store.keys()].map(url => ({ url })),
    delete: async req => store.delete(req.url),
  };
  const net = { up: true, calls: [], body: 'v1' };
  const ctx = {
    self: { addEventListener() {}, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: async req => { net.calls.push(req.url); if (!net.up) throw new TypeError('offline'); return { ok: true, type: 'basic', body: net.body + ':' + req.url, clone() { return this; } }; },
    location: { origin: 'https://sbmadhav.com' }, URL, setTimeout, Promise, console,
  };
  let src = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  if (max) src = src.replace(/const SOUNDS_MAX = \d+;/, `const SOUNDS_MAX = ${max};`);
  vm.createContext(ctx);
  vm.runInContext(src + '\n;globalThis.__soundFile = soundFile;', ctx);
  return { soundFile: url => ctx.__soundFile({ url }), store, net, order };
}
const U = 'https://sbmadhav.com/vedic-math/sounds/';

test('a ?v= sound is cache first: the second request never reaches the network, offline too', async () => {
  const { soundFile, net } = load();
  const a = await soundFile(U + 'om.m4a?v=aaa');
  net.up = false;
  const b = await soundFile(U + 'om.m4a?v=aaa');
  assert.equal(b.body, a.body);
  assert.equal(net.calls.length, 1);
});

test('a changed file is a new ?v= URL, so the old entry is never served for it', async () => {
  const { soundFile, net } = load();
  await soundFile(U + 'om.m4a?v=aaa');
  net.body = 'v2';
  const b = await soundFile(U + 'om.m4a?v=bbb');
  assert.equal(b.body, 'v2:' + U + 'om.m4a?v=bbb');
});

test('a sound without ?v= is network first and falls back to the cache offline', async () => {
  const { soundFile, net } = load();
  await soundFile(U + 'om.m4a');
  net.body = 'v2';
  assert.equal((await soundFile(U + 'om.m4a')).body, 'v2:' + U + 'om.m4a', 'online: the network copy, not the old one');
  net.up = false;
  assert.equal((await soundFile(U + 'om.m4a')).body, 'v2:' + U + 'om.m4a', 'offline: the saved copy');
});

test('many misses at once (the idle prefetch and a tap) trim one at a time and keep the newest SOUNDS_MAX', async () => {
  const { soundFile, store, order } = load({ max: 5 });
  await Promise.all(Array.from({ length: 12 }, (_, i) => soundFile(U + `sutras/s${i + 1}.m4a?v=${i}`)));
  assert.equal(order.length, 12);
  assert.deepEqual([...store.keys()], order.slice(-5), 'the five most recently stored survive; the oldest are dropped');
});
