/* Studio voice planning (openspec better-voice, task 3.1): line hashes name the recorded files and must be the same in
   Node (tools/voice/record.mjs) and the browser (js/voice.js); plans turn a line into clips. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { lineHash, lineKey, inLineSet, planLine, numClips, clipText, NUMBER_CLIPS } from '../js/voice-plan.js';
import { normalize } from '../js/voice.js';

const AOEDE = 'en-US-Chirp3-HD-Aoede';
const clips = text => planLine(text).map(p => p.clip || '_' + p.pause);

test('line hashes are 14 hex characters, stable, and depend on the voice and the words', () => {
  assert.equal(lineHash(AOEDE, '7 plus 5 equals what?'), '180d5780055105'); // fixed: recorded files are named by it
  assert.match(lineHash(AOEDE, 'Super star!'), /^[0-9a-f]{14}$/);
  assert.notEqual(lineHash(AOEDE, '7 plus 5 equals what?'), lineHash('en-US-Chirp3-HD-Leda', '7 plus 5 equals what?'));
  assert.notEqual(lineHash(AOEDE, '7 plus 5 equals what?'), lineHash(AOEDE, '7 plus 6 equals what?'));
});

test('the line set finds recorded lines by their first 32 bits', () => {
  const hs = ['Super star!', 'You are so smart!', 'How many dots are there?'].map(t => lineHash(AOEDE, t));
  const set = Uint32Array.from(hs.map(lineKey)).sort();
  hs.forEach(h => assert.ok(inLineSet(set, h)));
  assert.ok(!inLineSet(set, lineHash(AOEDE, 'Not recorded.')));
  assert.ok(!inLineSet(new Uint32Array(0), hs[0]));
});

test('plans: frames between numbers, end takes before a sentence end', () => {
  assert.deepEqual(clips(normalize('7 + 5 = ?')), ['n:7', 'f:plus', 'n:5', 'f:equals what?']);
  assert.deepEqual(clips('Count up from 9 to 16. First get to 10.'), ['f:Count up from', 'n:9', 'f:to', 'n:16.', '_long', 'f:First get to', 'n:10.', '_long']);
  assert.deepEqual(clips(normalize('4368 &divide; 16 = ?')), ['n:4', 'w:thousand', 'n:3', 'w:hundred', 'n:68', 'f:divided by', 'n:16', 'f:equals what?']);
  assert.deepEqual(clips('It is -7 now'), ['f:It is', 'w:negative', 'n:7', 'f:now']);
  assert.deepEqual(clips('Round 3.25 to'), ['f:Round', 'n:3', 'w:point', 'n:2', 'n:5', 'f:to']);
  assert.deepEqual(numClips('1000000'), ['n:1', 'w:million']);
  assert.deepEqual(numClips('120', true), ['n:1', 'w:hundred', 'n:20.']);
});

test('clip texts: numbers are spelled with the take, frames are said as written', () => {
  assert.equal(clipText('n:73'), 'seventy three,');
  assert.equal(clipText('n:73.'), 'seventy three.');
  assert.equal(clipText('n:0'), 'zero,');
  assert.equal(clipText('w:hundred'), 'hundred,');
  assert.equal(clipText('f:equals what?'), 'equals what?');
  assert.equal(NUMBER_CLIPS.length, 210);
  assert.equal(new Set(NUMBER_CLIPS).size, 210);
});

test('fractions spoken as words are their own frames, so the frames around them are shared', () => {
  assert.deepEqual(clips(normalize('<span class="fr"><span>5</span><span>8</span></span> + <span class="fr"><span>1</span><span>8</span></span> = ?')), ['f:five eighths', 'f:plus', 'f:one eighth', 'f:equals what?']);
  assert.deepEqual(clips('11 twelfths minus 3 twelfths equals what?'), ['n:11', 'f:twelfths', 'f:minus', 'n:3', 'f:twelfths', 'f:equals what?']);
  assert.deepEqual(clips('Compare four tenths and two thirds. Which is more?'), ['f:Compare', 'f:four tenths', 'f:and', 'f:two thirds.', '_long', 'f:Which is more?']);
  assert.deepEqual(clips('What is the third term?'), ['f:What is the third term?']); // an ordinal with no number is not a fraction
});
