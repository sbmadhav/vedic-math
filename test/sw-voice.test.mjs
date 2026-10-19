/* sw.js voiceFile (openspec better-voice, review follow-up): studio voice files are cache first in lvm-voice,
   and the trim counts and drops whole lines only, so the line set, clip directory and packs (saved first, never
   re-saved) survive any number of lines heard and read aloud keeps working offline. sw.js runs in a vm with fake
   caches and fetch. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function load({ max } = {}) {
  const store = new Map(); // url -> body, in insertion order (the order cache.keys() lists them)
  const cache = {
    match: async req => (store.has(req.url) ? { ok: true, type: 'basic', body: store.get(req.url), clone() { return this; } } : undefined),
    put: async (req, res) => { store.delete(req.url); store.set(req.url, res.body); },
    keys: async () => [...store.keys()].map(url => ({ url })),
    delete: async req => store.delete(req.url),
  };
  const net = { up: true, calls: [] };
  const ctx = {
    self: { addEventListener() {}, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: async req => { net.calls.push(req.url); if (!net.up) throw new TypeError('offline'); return { ok: true, type: 'basic', body: 'net:' + req.url, clone() { return this; } }; },
    location: { origin: 'https://learnvedicmath.com' }, URL, setTimeout, Promise, console,
  };
  let src = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  if (max) src = src.replace(/const VOICE_MAX = \d+;/, `const VOICE_MAX = ${max};`);
  vm.createContext(ctx);
  vm.runInContext(src + '\n;globalThis.__voiceFile = voiceFile;', ctx);
  return { voiceFile: url => ctx.__voiceFile({ url }), store, net };
}
const V = 'https://voice.learnvedicmath.com/'; // the R2 voice host (design D17)
const line = i => `${V}l/${i.toString(16).padStart(14, '0')}.m4a`;

test('a studio voice file is cache first: heard once, it plays offline', async () => {
  const { voiceFile, net } = load();
  const a = await voiceFile(line(1));
  net.up = false;
  assert.equal((await voiceFile(line(1))).body, a.body);
  assert.equal(net.calls.length, 1);
});

test('the trim keeps the newest VOICE_MAX whole lines and never drops the line set, clip directory or packs', async () => {
  const { voiceFile, store, net } = load({ max: 3 });
  const index = [`${V}l/set.0123456789.bin`, `${V}p/dir.0123456789.json`, `${V}p/core.0123456789.json`, `${V}p/core.0123456789.m4a`];
  for (const u of index) await voiceFile(u);
  for (let i = 1; i <= 8; i++) await voiceFile(line(i));
  assert.deepEqual([...store.keys()], [...index, line(6), line(7), line(8)]);
  net.up = false;
  for (const u of index) assert.equal((await voiceFile(u)).body, 'net:' + u, `${u} still plays offline`);
});

test('a new recording replaces its line set, clip directory, packs and maps; other names and whole lines stay', async () => {
  const { voiceFile, store } = load();
  const old = [`${V}l/set.aaaaaaaaaa.bin`, `${V}p/dir.aaaaaaaaaa.json`, `${V}p/core.aaaaaaaaaa.json`, `${V}p/core.aaaaaaaaaa.m4a`, `${V}p/k-2.aaaaaaaaaa.m4a`];
  for (const u of old) await voiceFile(u);
  await voiceFile(line(1));
  const now = [`${V}l/set.bbbbbbbbbb.bin`, `${V}p/dir.bbbbbbbbbb.json`, `${V}p/core.bbbbbbbbbb.json`, `${V}p/core.bbbbbbbbbb.m4a`];
  for (const u of now) await voiceFile(u);
  assert.deepEqual([...store.keys()], [`${V}p/k-2.aaaaaaaaaa.m4a`, line(1), ...now]);
});
