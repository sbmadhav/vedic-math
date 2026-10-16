/* Kid-voice candidates for the listening page: a few lines in several Kokoro voices and blends, whole lines only,
   with a rough pitch measure. No pitch shifting: every candidate is a stock Kokoro voice or a blend of them.
   Run: node kid-voices.mjs   Writes ../audio/kids/<candidate>/<item>.m4a and ../kids.json */
import { writeFileSync, mkdirSync } from 'node:fs';
import { normalize } from '../../../../js/voice.js';
import { speaker, trim, m4a, medianF0 } from './voice-lib.mjs';

const OUT = new URL('../', import.meta.url).pathname;
export const CANDIDATES = [
  { id: 'heart', spec: 'af_heart', speed: 0.92, note: 'Proposed for Challenger and Pro: warm, clear adult' },
  { id: 'bella', spec: 'af_bella', speed: 0.95, note: 'Bright, energetic' },
  { id: 'sky', spec: 'af_sky', speed: 0.95, note: 'Often called young-sounding, but breathier and lower; rated lower for clarity' },
  { id: 'nicole', spec: 'af_nicole', speed: 0.95, note: 'Soft, close to the microphone' },
  { id: 'bella-sky', spec: 'af_bella*0.5+af_sky*0.5', speed: 0.95, note: 'Blend: Bella and Sky, half each' },
  { id: 'heart-sky', spec: 'af_heart*0.4+af_sky*0.6', speed: 0.95, note: 'Blend: Heart 40%, Sky 60%' },
  { id: 'heart-bella', spec: 'af_heart*0.5+af_bella*0.5', speed: 1, note: 'Blend: Heart and Bella, half each, a little quicker' },
  { id: 'heart-alpha', spec: 'af_heart*0.7+jf_alpha*0.3', speed: 0.95, note: 'Proposed Explorer voice: Heart 70% with 30% of a lighter Japanese voice (jf_alpha), English words. Listen for any accent' }
];
const LINES = [['add', '7 + 5 = ?'], ['story', 'Leo has 8 cards and gets 2 more. How many now?'], ['praise', 'Yay! You got it!'], ['hint', 'Count up from 9 to 16. First get to 10.']];
const say = await speaker(), out = [];
for (const c of CANDIDATES) {
  mkdirSync(`${OUT}audio/kids/${c.id}`, { recursive: true });
  const files = {}; let f0 = [];
  for (const [id, html] of LINES) {
    const a = trim(await say(normalize(html), c.spec, c.speed));
    m4a(a, `${OUT}audio/kids/${c.id}/${id}.m4a`); files[id] = `audio/kids/${c.id}/${id}.m4a`; f0.push(medianF0(a));
  }
  f0.sort((x, y) => x - y);
  out.push({ ...c, f0: f0[Math.floor(f0.length / 2)], files });
  console.log(c.id, 'median F0', f0);
}
writeFileSync(OUT + 'kids.json', JSON.stringify({ lines: LINES.map(([id, html]) => ({ id, html, text: normalize(html) })), candidates: out }, null, 1));
