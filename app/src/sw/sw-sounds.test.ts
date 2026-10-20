/* soundFile (openspec sutra-pronunciation, review follow-up; moved here from test/sw-sounds.test.mjs): sounds/ files
   with ?v= are cache first and never go stale (a changed file is a new URL), a sounds/ URL without ?v= is network
   first with the cache as the offline fallback, and the trim of the long-lived sound cache runs one at a time. */
import { test, expect } from 'vitest';
import { load } from './harness.ts';

function sounds({ max }: { max?: number } = {}) {
  const sw = load({ expose: ['soundFile'], slowPut: true, edits: max ? [[/const SOUNDS_MAX = \d+;/, `const SOUNDS_MAX = ${max};`]] : [] });
  const cache = sw.open('lvm-sounds');
  return { soundFile: (url: string) => sw.fns.soundFile!({ url }), store: cache.store, order: cache.order, net: sw.net };
}
const U = 'https://learnvedicmath.com/sounds/';

test('a ?v= sound is cache first: the second request never reaches the network, offline too', async () => {
  const { soundFile, net } = sounds();
  const a = await soundFile(U + 'om.m4a?v=aaa');
  net.up = false;
  const b = await soundFile(U + 'om.m4a?v=aaa');
  expect(b.body).toBe(a.body);
  expect(net.calls.length).toBe(1);
});

test('a changed file is a new ?v= URL, so the old entry is never served for it', async () => {
  const { soundFile, net } = sounds();
  await soundFile(U + 'om.m4a?v=aaa');
  net.body = 'v2';
  expect((await soundFile(U + 'om.m4a?v=bbb')).body).toBe('v2:' + U + 'om.m4a?v=bbb');
});

test('a sound without ?v= is network first and falls back to the cache offline', async () => {
  const { soundFile, net } = sounds();
  await soundFile(U + 'om.m4a');
  net.body = 'v2';
  expect((await soundFile(U + 'om.m4a')).body, 'online: the network copy, not the old one').toBe('v2:' + U + 'om.m4a');
  net.up = false;
  expect((await soundFile(U + 'om.m4a')).body, 'offline: the saved copy').toBe('v2:' + U + 'om.m4a');
});

test('many misses at once (the idle prefetch and a tap) trim one at a time and keep the newest SOUNDS_MAX', async () => {
  const { soundFile, store, order } = sounds({ max: 5 });
  await Promise.all(Array.from({ length: 12 }, (_, i) => soundFile(U + `sutras/s${i + 1}.m4a?v=${i}`)));
  expect(order.length).toBe(12);
  expect([...store.keys()], 'the five most recently stored survive; the oldest are dropped').toEqual(order.slice(-5));
});
