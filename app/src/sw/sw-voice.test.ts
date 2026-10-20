/* voiceFile (openspec better-voice, review follow-up; moved here from test/sw-voice.test.mjs): studio voice files are
   cache first in lvm-voice, and the trim counts and drops whole lines only, so the line set, clip directory and packs
   (saved first, never re-saved) survive any number of lines heard and read aloud keeps working offline. */
import { test, expect } from 'vitest';
import { load } from './harness.ts';

function voice({ max }: { max?: number } = {}) {
  const sw = load({ expose: ['voiceFile'], edits: max ? [[/const VOICE_MAX = \d+;/, `const VOICE_MAX = ${max};`]] : [] });
  const store = sw.open('lvm-voice').store;
  return { voiceFile: (url: string) => sw.fns.voiceFile!({ url }), store, net: sw.net };
}
const V = 'https://voice.learnvedicmath.com/'; // the R2 voice host (design D17)
const line = (i: number) => `${V}l/${i.toString(16).padStart(14, '0')}.m4a`;

test('a studio voice file is cache first: heard once, it plays offline', async () => {
  const { voiceFile, net } = voice();
  const a = await voiceFile(line(1));
  net.up = false;
  expect((await voiceFile(line(1))).body).toBe(a.body);
  expect(net.calls.length).toBe(1);
});

test('the trim keeps the newest VOICE_MAX whole lines and never drops the line set, clip directory or packs', async () => {
  const { voiceFile, store, net } = voice({ max: 3 });
  const index = [`${V}l/set.0123456789.bin`, `${V}p/dir.0123456789.json`, `${V}p/core.0123456789.json`, `${V}p/core.0123456789.m4a`];
  for (const u of index) await voiceFile(u);
  for (let i = 1; i <= 8; i++) await voiceFile(line(i));
  expect([...store.keys()]).toEqual([...index, line(6), line(7), line(8)]);
  net.up = false;
  for (const u of index) expect((await voiceFile(u)).body, `${u} still plays offline`).toBe('net:' + u);
});

test('a new recording replaces its line set, clip directory, packs and maps; other names and whole lines stay', async () => {
  const { voiceFile, store } = voice();
  const old = [`${V}l/set.aaaaaaaaaa.bin`, `${V}p/dir.aaaaaaaaaa.json`, `${V}p/core.aaaaaaaaaa.json`, `${V}p/core.aaaaaaaaaa.m4a`, `${V}p/k-2.aaaaaaaaaa.m4a`];
  for (const u of old) await voiceFile(u);
  await voiceFile(line(1));
  const now = [`${V}l/set.bbbbbbbbbb.bin`, `${V}p/dir.bbbbbbbbbb.json`, `${V}p/core.bbbbbbbbbb.json`, `${V}p/core.bbbbbbbbbb.m4a`];
  for (const u of now) await voiceFile(u);
  expect([...store.keys()]).toEqual([`${V}p/k-2.aaaaaaaaaa.m4a`, line(1), ...now]);
});
