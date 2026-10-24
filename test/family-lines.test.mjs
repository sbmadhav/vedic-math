/* The Family helpers' line table (js/family-lines.js, openspec family-helpers "Their words fit the reader"):
   fixed lines per friend, kind and band, written to the band's limits, honest and never the answer. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { LINES } from '../js/family-lines.js';
import { linesFor } from '../js/family-helpers.js';

const all = () => Object.entries(LINES).flatMap(([f, kinds]) => Object.entries(kinds).flatMap(([k, bands]) => Object.entries(bands).flatMap(([b, list]) => list.map(line => ({ f, k, b, line })))));
const PLACE = ['name', 'title', 'idea', 'sutra', 'meaning', 'wrong'];
const sentences = line => line.replace(/\{\w+\}/g, 'X').split(/(?<=[.!?])\s+/).filter(Boolean);
const words = s => s.split(/\s+/).filter(w => /[A-Za-z]/.test(w));

test('every friend has a line for every kind they use, in every band', () => {
  const NEED = { shunya: ['hello', 'nudge', 'nudgeEarly', 'intro', 'encourage', 'cheer', 'leave'], nava: ['hello', 'nudge', 'nudgeEarly', 'encourage', 'outro', 'cheer', 'leave'], eka: ['hello', 'methodEarly', 'steps', 'remember', 'cheer'] };
  for (const [f, kinds] of Object.entries(NEED)) for (const k of kinds) for (const b of ['early', 'growing', 'fluent']) assert.ok(LINES[f][k][b] && LINES[f][k][b].length, `${f}.${k}.${b}`);
  for (const k of ['sutra', 'method']) for (const b of ['growing', 'fluent']) assert.ok(LINES.eka[k][b].length, `eka.${k}.${b}`);
  for (const b of ['growing', 'fluent']) { assert.ok(LINES.shunya.mistake[b].length); assert.ok(LINES.nava.catch[b].length); assert.ok(LINES.eka.catch[b].length); }
});

test('no playful mistakes and no catches are written for Early readers', () => {
  assert.equal(LINES.shunya.mistake.early, undefined);
  assert.equal(LINES.nava.catch.early, undefined);
  assert.equal(LINES.eka.catch.early, undefined);
});

test('no em dashes, no digits, only known placeholders, and no claim that the Sutras come from the Vedas', () => {
  for (const { f, k, b, line } of all()) {
    const at = `${f}.${k}.${b}: ${line}`;
    assert.doesNotMatch(line, /—/, at);
    assert.doesNotMatch(line, /\d/, at);
    for (const [, p] of line.matchAll(/\{(\w+)\}/g)) assert.ok(PLACE.includes(p), at);
    assert.doesNotMatch(line, /\bVedas?\b|ancient/i, at);
    assert.doesNotMatch(line, /answer is|the answer/i, `${at}: never the answer`);
  }
});

test('Early: at most 8 words a sentence and 2 sentences, no idea or meaning; Growing at most 14 words a sentence', () => {
  for (const { f, k, b, line } of all()) {
    const at = `${f}.${k}.${b}: ${line}`, ss = sentences(line);
    if (b === 'early') {
      assert.ok(ss.length <= 2, at);
      for (const s of ss) assert.ok(words(s).length <= 8, `${at} (${words(s).length} words)`);
      assert.doesNotMatch(line, /\{(idea|meaning)\}/, at);
    }
    if (b === 'growing') for (const s of ss) assert.ok(words(s).length <= 14, `${at} (${words(s).length} words)`);
  }
});

test('the friends are classmates: Eka credits Bolt, nobody calls themselves a teacher', () => {
  assert.ok(LINES.eka.method.growing.some(l => /Bolt/.test(l)));
  assert.ok(LINES.eka.methodEarly.early.some(l => /Bolt showed us/.test(l)));
  for (const { line } of all()) assert.doesNotMatch(line, /\bI am (your|the) teacher|\bteacher\b/i, line);
});

test('Fluent Eka quotes the Sutra and its meaning', () => {
  for (const l of LINES.eka.sutra.fluent) { assert.match(l, /\{sutra\}/); assert.match(l, /\{meaning\}/); }
});

test('linesFor falls back to Growing only where a band has no list of its own', () => {
  assert.deepEqual(linesFor('shunya', 'mistake', 'early'), LINES.shunya.mistake.growing);
  assert.deepEqual(linesFor('eka', 'hello', 'early'), LINES.eka.hello.early);
  assert.deepEqual(linesFor('eka', 'nope', 'early'), []);
});
