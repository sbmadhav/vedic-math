/* better-voice listening prototype: makes the Kokoro audio for docs/prototypes/voice/ locally.
   No cloud service: kokoro-js runs the open Kokoro-82M model (Apache-2.0) on this machine.
   Needs macOS afconvert for AAC (m4a), which every current browser plays.
   Run:  cd docs/prototypes/voice/tools && npm install && node make-clips.mjs
   For each voice in VOICES it writes ../audio/<voice>/whole/<id>.m4a (one clip per item, the quality ceiling) and
   ../audio/<voice>/stitch.m4a + stitch.json (one sprite: the number clips, scale words and word frames the items
   need, numbers in mid-sentence and end-of-sentence takes), then ../items.json.
   Every generated clip is cached in .cache/ (git-ignored), so a stopped run resumes where it left off.
   ALL=1 also makes every number 0 to 99 in both takes (slow on a busy machine; about 210 clips per voice). */
import { writeFileSync, mkdirSync } from 'node:fs';
import { normalize } from '../../../../js/voice.js';
import { numClips, splitParts } from './stitch-plan.mjs';
import { speaker, trim, m4a, medianF0, RATE, BITRATE } from './voice-lib.mjs';

const OUT = new URL('../', import.meta.url).pathname;
const GAP = 0.25; // seconds of silence between clips in the sprite, so the decoder's start offset never cuts a word
/* The voices on the page. "kid" is the proposed Explorer voice: a blend of stock Kokoro voices, no pitch shifting. */
export const VOICES = [
  { key: 'heart', name: 'Heart', spec: 'af_heart', speed: 0.92 },
  { key: 'kid', name: 'Kid blend (Heart and Alpha)', spec: process.env.KID || 'af_heart*0.7+jf_alpha*0.3', speed: 0.95 }
];

export const ITEMS = [
  { id: 'add', mode: 'Explorer', label: 'Adding within 20', html: '7 + 5 = ?' },
  { id: 'bond', mode: 'Explorer', label: 'Number bond', html: '3 and how many more make <b>10</b>?' },
  { id: 'story', mode: 'Explorer', label: 'Story problem', html: 'Leo has 8 cards and gets 2 more. How many now?' },
  { id: 'balloon', mode: 'Explorer', label: 'Balloon game', html: 'Pop 8 balloons' },
  { id: 'hint', mode: 'Explorer', label: 'Hint', html: 'Count up from 9 to 16. First get to 10.' },
  { id: 'praise', mode: 'Explorer', label: 'Praise', html: 'Yay! You got it!' },
  { id: 'retry', mode: 'Explorer', label: 'Try again', html: 'Not quite. Try again!' },
  { id: 'sub3', mode: 'Challenger', label: 'Three-digit subtraction', html: '682 &minus; 628 = ?' },
  { id: 'divide', mode: 'Challenger', label: 'Big division', html: '4368 &divide; 16 = ?' },
  { id: 'percent', mode: 'Pro', label: 'Percent', html: 'What is 18% of 600?' },
  { id: 'frac', mode: 'Challenger', label: 'Fractions', html: '<span class="fr"><span>3</span><span>4</span></span> + <span class="fr"><span>1</span><span>6</span></span> = ?' },
  { id: 'algebra', mode: 'Pro', label: 'Equation', html: '&minus;8<i>x</i> &minus; 14 = 42' }
];

const say = await speaker();
const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const word = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
const clipFor = id => { const [k, v] = id.replace(/\.$/, '').split(':'), end = id.endsWith('.') ? '.' : ','; return (k === 'n' ? word(+v) : v) + end; };

const items = ITEMS.map(it => {
  const text = normalize(it.html);
  const plan = splitParts(text).flatMap(p => p.pause ? [{ pause: p.pause }] : p.n ? numClips(p.n, p.last).map(c => ({ clip: c })) : [{ clip: 'f:' + p.f }]);
  return { ...it, text, plan, whole: {} };
});
const clipText = new Map(); // clip id -> text to synthesize
if (process.env.ALL) { for (let n = 0; n < 100; n++) for (const e of ['', '.']) clipText.set(`n:${n}${e}`, clipFor(`n:${n}${e}`)); for (const w of ['hundred', 'thousand', 'million', 'point', 'negative']) for (const e of ['', '.']) clipText.set(`w:${w}${e}`, clipFor(`w:${w}${e}`)); }
items.forEach(it => it.plan.forEach(p => { if (p.clip) clipText.set(p.clip, p.clip.startsWith('f:') ? p.clip.slice(2) : clipFor(p.clip)); }));

const voices = [];
for (const v of VOICES) {
  const dir = `${OUT}audio/${v.key}/`; mkdirSync(dir + 'whole', { recursive: true });
  let wholeBytes = 0, wholeSecs = 0; const f0s = [];
  for (const it of items) {
    const audio = trim(await say(it.text, v.spec, v.speed)), bytes = m4a(audio, `${dir}whole/${it.id}.m4a`), secs = audio.length / RATE;
    wholeBytes += bytes; wholeSecs += secs; f0s.push(medianF0(audio));
    it.whole[v.key] = { file: `audio/${v.key}/whole/${it.id}.m4a`, bytes, secs: +secs.toFixed(2) };
  }
  /* The sprite: each clip trimmed, then GAP seconds of silence */
  const map = {}, chunks = [new Float32Array(Math.round(GAP * RATE))]; let at = chunks[0].length;
  for (const [id, text] of clipText) {
    const a = trim(await say(text, v.spec, v.speed));
    map[id] = [+(at / RATE).toFixed(4), +(a.length / RATE).toFixed(4)];
    chunks.push(a, new Float32Array(Math.round(GAP * RATE))); at += a.length + Math.round(GAP * RATE);
  }
  const all = new Float32Array(at); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  const spriteBytes = m4a(all, dir + 'stitch.m4a');
  writeFileSync(dir + 'stitch.json', JSON.stringify({ rate: RATE, gap: GAP, voice: v.spec, speed: v.speed, clips: map }));
  f0s.sort((x, y) => x - y);
  voices.push({ ...v, sprite: `audio/${v.key}/stitch.m4a`, map: `audio/${v.key}/stitch.json`, spriteBytes, spriteSecs: +(at / RATE).toFixed(1), clips: clipText.size,
    wholeBytes, wholeSecs: +wholeSecs.toFixed(1), f0: f0s[Math.floor(f0s.length / 2)] });
  console.log(v.key, voices.at(-1));
}
writeFileSync(OUT + 'items.json', JSON.stringify({ bitrateKbps: BITRATE / 1000, voices, items }, null, 1));
