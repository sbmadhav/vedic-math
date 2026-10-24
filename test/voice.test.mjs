/* Built-in voice (openspec better-voice, part A): every English voice is rated good, ok or poor, a poor voice is
   never picked when a better one exists, and speech is at pitch 1 with a calm rate. Run: pnpm test */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { rateVoice, englishVoices, bestVoice, onlyPoorVoices, builtInTuning, speak, stop } from '../js/voice.js';

const V = (name, lang = 'en-US', voiceURI = name, extra = {}) => ({ name, lang, voiceURI, localService: true, default: false, ...extra });

test('macOS Safari: an Enhanced voice beats a compact one', () => {
  const list = [V('Samantha', 'en-US', 'com.apple.voice.compact.en-US.Samantha'), V('Ava', 'en-US', 'com.apple.voice.enhanced.en-US.Ava')];
  assert.equal(rateVoice(list[0]).tier, 'poor');
  assert.equal(rateVoice(list[1]).tier, 'good');
  assert.equal(bestVoice(list).name, 'Ava');
});

test('Windows Edge: an online neural voice beats a desktop voice', () => {
  const list = [V('Microsoft David - English (United States)'), V('Microsoft Aria Online (Natural) - English (United States)')];
  assert.equal(rateVoice(list[0]).tier, 'poor');
  assert.equal(bestVoice(list).name, 'Microsoft Aria Online (Natural) - English (United States)');
});

test('Chrome on macOS: Google US English beats plain Samantha', () => {
  const list = [V('Samantha'), V('Google US English')];
  assert.equal(rateVoice(list[0]).tier, 'ok');
  assert.equal(bestVoice(list).name, 'Google US English');
});

test('Android: a voice with no vendor name is ok', () => {
  assert.equal(rateVoice(V('English United States', 'en_US')).tier, 'ok');
});

test('novelty, eSpeak and Eloquence voices are poor and sort last', () => {
  for (const n of ['Albert', 'Zarvox', 'eSpeak English', 'Bad News', 'Junior', 'Eddy (English (US))', 'Grandma (English (US))']) assert.equal(rateVoice(V(n)).tier, 'poor', n);
  const list = [V('Zarvox'), V('Albert'), V('English United States')];
  assert.equal(rateVoice(englishVoices(list).at(-1)).tier, 'poor');
  assert.equal(bestVoice(list).name, 'English United States');
});

test('only poor voices: the best poor one is used and onlyPoorVoices says so', () => {
  const list = [V('Albert'), V('Zarvox'), V('eSpeak English')];
  assert.ok(bestVoice(list));
  assert.equal(onlyPoorVoices(list), true);
  assert.equal(onlyPoorVoices([...list, V('Ava', 'en-US', 'com.apple.voice.enhanced.en-US.Ava')]), false);
  assert.equal(onlyPoorVoices([]), false);
});

test('non-English voices are never returned', () => {
  const list = [V('Thomas', 'fr-FR'), V('Anna', 'de-DE'), V('Karen', 'en-AU')];
  assert.equal(rateVoice(list[0]), null);
  assert.deepEqual(englishVoices(list).map(v => v.name), ['Karen']);
});

test('US English comes before other English in the same tier', () => {
  const list = [V('Google UK English Female', 'en-GB'), V('Google US English', 'en-US')];
  assert.equal(bestVoice(list).name, 'Google US English');
});

test('tuning: pitch 1 always, rate 0.9 for Explorer and 0.95 otherwise', () => {
  assert.deepEqual(builtInTuning(true), { pitch: 1, rate: 0.9 });
  assert.deepEqual(builtInTuning(false), { pitch: 1, rate: 0.95 });
});

test('speak() with the built-in voice uses pitch 1 and the Explorer rate', async () => {
  const spoken = [], voices = [V('Samantha', 'en-US', 'com.apple.voice.compact.en-US.Samantha'), V('Ava', 'en-US', 'com.apple.voice.enhanced.en-US.Ava')];
  const synth = { getVoices: () => voices, speak: u => { spoken.push(u); setTimeout(() => u.onend && u.onend(), 0); }, cancel() {}, paused: false, resume() {}, addEventListener() {} };
  class Utterance { constructor(text) { this.text = text; } }
  const saved = { window: globalThis.window, document: globalThis.document, speechSynthesis: globalThis.speechSynthesis, SpeechSynthesisUtterance: globalThis.SpeechSynthesisUtterance };
  globalThis.window = { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance };
  globalThis.speechSynthesis = synth; globalThis.SpeechSynthesisUtterance = Utterance;
  const classes = new Set(['mode-explorer']);
  globalThis.document = { body: { classList: { contains: c => classes.has(c) } }, querySelector: () => null };
  try {
    speak('7 + 5 = ?', { natural: false });
    await new Promise(r => setTimeout(r, 120));
    assert.equal(spoken.length, 1);
    assert.equal(spoken[0].text, '7 plus 5 equals what?');
    assert.equal(spoken[0].pitch, 1);
    assert.equal(spoken[0].rate, 0.9);
    assert.equal(spoken[0].voice.name, 'Ava');
    classes.clear();
    speak('Correct.', { natural: false });
    await new Promise(r => setTimeout(r, 120));
    assert.equal(spoken.at(-1).rate, 0.95);
    assert.equal(spoken.at(-1).pitch, 1);
  } finally {
    stop();
    Object.assign(globalThis, saved);
  }
});
