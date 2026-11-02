import test from '../support/node-test.mjs';
import assert from 'node:assert/strict';
import { rng, hashSeed, int, shuffle, seedOf, dayKey, dayNumber, b64url, SITE, APP_BASE } from '../../js/play/kit.js';

/* Every share link is built from these two (openspec change arena-challenge-link): the move to /learn/ (indexable-routes
   design D2) changes APP_BASE here and nowhere else */
test('the site and the game\'s base path, the one source for share links', () => {
  assert.equal(SITE, 'https://learnvedicmath.com');
  assert.match(APP_BASE, /^\/[a-z]+\/$/);
  assert.equal(APP_BASE, '/play/');
});

test('seeded rng is deterministic and in [0, 1)', () => {
  const a = rng('x'), b = rng('x');
  for (let i = 0; i < 1000; i++) { const v = a(); assert.equal(v, b()); assert.ok(v >= 0 && v < 1); }
  assert.notEqual(rng('x')(), rng('y')());
  assert.equal(hashSeed('abc'), hashSeed('abc'));
});

test('int stays in range and shuffle keeps elements', () => {
  const r = rng(1);
  for (let i = 0; i < 500; i++) { const v = int(r, 3, 9); assert.ok(v >= 3 && v <= 9 && Number.isInteger(v)); }
  assert.deepEqual(shuffle(r, [1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
});

test('seeds and days', () => {
  assert.equal(seedOf('daily', '2026-10-20'), 'v1:daily:2026-10-20');
  assert.match(dayKey(new Date(2026, 0, 5)), /^2026-01-05$/);
  assert.equal(dayNumber('2026-10-16'), 1);
  assert.equal(dayNumber('2026-10-23'), 8);
});

test('base64url round trip, including non-ASCII', () => {
  for (const s of ['hello', 'Śulba 3/4 + ā', JSON.stringify({ a: [1, 2], b: 'x' })]) assert.equal(b64url.dec(b64url.enc(s)), s);
});
