/* Nicknames (openspec change react-typescript, task 3.1): cloud/firestore.rules, the authority on what a World board
   accepts, lists the same words and avatar colors as names.ts, and every generated name passes the rules' checks. */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ADJ, NOUN, AVATARS, makeName, NAME_RE, isNickname } from './names.ts';

const rules = readFileSync(new URL('../../cloud/firestore.rules', import.meta.url), 'utf8');
const list = (re: RegExp) => JSON.parse(rules.match(re)![1]!.replace(/'/g, '"')) as string[];

test('cloud/firestore.rules lists the same Nickname words and avatar colors as names.ts', () => {
  assert.deepEqual(list(/w\[0\] in (\[[^\]]*\])/), ADJ);
  assert.deepEqual(list(/w\[1\] in (\[[^\]]*\])/), NOUN);
  assert.deepEqual(list(/d\.avatar in (\[[^\]]*\])/), AVATARS);
  assert.match(rules, /d\.name\.matches\('\^\[A-Z\]\[a-z\]\+ \[A-Z\]\[a-z\]\+ \[1-9\]\[0-9\]\$'\)/, 'the rules check the same form isNickname does');
});

test('every generated Nickname has the form and words the rules accept', () => {
  for (let i = 0; i < 500; i++) {
    const n = makeName();
    assert.match(n, NAME_RE);
    assert.ok(isNickname(n), n);
  }
});

test('a typed or made-up name is not a Nickname', () => {
  for (const n of ['Swift Tiger 05', 'Swift Tiger 100', 'Fast Tiger 42', 'Swift Cat 42', 'swift tiger 42', 'Swift  Tiger 42', 'Ada Lovelace 12', '', 42, null])
    assert.equal(isNickname(n), false, String(n));
});
