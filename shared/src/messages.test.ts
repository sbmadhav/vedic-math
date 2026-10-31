/* What is sent (openspec change react-typescript, task 3.1): a World board entry holds exactly the fields
   cloud/firestore.rules accepts, and js/cloud.js writes those and nothing else. */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENTRY_FIELDS } from './messages.ts';

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('the entry fields are the ones the rules accept, no more and no fewer', () => {
  const rules = read('cloud/firestore.rules');
  const only = rules.match(/d\.keys\(\)\.hasOnly\((\[[^\]]*\])\)/)!, all = rules.match(/d\.keys\(\)\.hasAll\((\[[^\]]*\])\)/)!;
  assert.deepEqual(JSON.parse(only[1]!.replace(/'/g, '"')), [...ENTRY_FIELDS]);
  assert.deepEqual(JSON.parse(all[1]!.replace(/'/g, '"')), [...ENTRY_FIELDS]);
});

test('js/cloud.js writes exactly those fields', () => {
  const m = read('js/cloud.js').match(/fs\.setDoc\(ref, \{ ([^}]*) \}\)/)!;
  assert.deepEqual(m[1]!.split(',').map(s => s.trim().split(':')[0]), [...ENTRY_FIELDS]);
});
