/* Voice samples for the Nikhilam Family helpers (openspec family-helpers, design D13, task 1.6): a few lines per friend
   and Reading band in each friend's Chirp 3 HD voice (Shunya Puck, Nava Leda, Eka Charon), so the owner can listen
   on docs/prototypes/family-helpers/listen.html and swap a voice before the full recording.
   Repo-only and owner-run. Without GO=1 it only prints the plan and its cost, and sends nothing. With GO=1 it asks
   Google Text-to-Speech through voice-lib.mjs's spend guard ($300 a month, $50 a run, paced), caches every line, and
   writes git-ignored files: tools/voice/out/family-samples/<friend>/<band>-<n>-<voice>-<text hash>.m4a and samples.json
   (the voice and the text are in the name, so a swapped voice or a changed line gets fresh audio, never a relabelled file).
     node tools/voice/family-samples.mjs                       the plan and the cost, nothing sent
     GOOGLE_TTS_TOKEN=$(gcloud auth print-access-token) GOOGLE_CLOUD_PROJECT=sbmadhav-vedic-math GO=1 node tools/voice/family-samples.mjs
   Swap a voice for a try: SHUNYA=en-US-Chirp3-HD-Fenrir (likewise NAVA, EKA). Never commit the audio or a key. */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { LINES } from '../../js/family-lines.js';
import { FRIENDS, BANDS } from '../../js/family-helpers.js';
import { PRICE_PER_CHAR } from './voice-lib.mjs';

const OUT = fileURLToPath(new URL('./out/family-samples/', import.meta.url));
/* The kinds sampled per friend: a hello, a nudge, their own thing, a cheer */
export const KINDS = { shunya: ['hello', 'nudgeEarly', 'intro', 'cheer'], nava: ['hello', 'nudgeEarly', 'encourage', 'cheer'], eka: ['hello', 'methodEarly', 'steps', 'cheer'] };
export const VARS = { name: 'Swift Tiger', title: 'Square numbers ending in 5' };
const fill = line => line.replace(/\{(\w+)\}/g, (m, k) => VARS[k] || '');
const stamp = text => createHash('sha1').update(text).digest('hex').slice(0, 6);

/* { friend, band, n, voice, text, file } for every sample; env may swap a friend's voice */
export function samplePlan(env = process.env) {
  const out = [];
  for (const [id, f] of Object.entries(FRIENDS)) {
    const voice = env[id.toUpperCase()] || f.voice;
    for (const band of BANDS) KINDS[id].forEach((kind, n) => {
      const list = (LINES[id][kind] || {})[band]; if (!list || !list.length) return;
      const text = fill(list[0]);
      out.push({ friend: id, name: f.name, band, kind, n: n + 1, voice, text, file: `${id}/${band}-${n + 1}-${voice.split('-').pop()}-${stamp(text)}.m4a` });
    });
  }
  return out;
}
export const planCost = plan => plan.reduce((a, s) => a + s.text.length, 0) * PRICE_PER_CHAR.google;

async function main() {
  const plan = samplePlan(), chars = plan.reduce((a, s) => a + s.text.length, 0);
  console.log(`${plan.length} samples, ${chars} characters, about $${planCost(plan).toFixed(4)} at list price (Chirp 3 HD, $30 per million)`);
  for (const id of Object.keys(FRIENDS)) console.log(`  ${FRIENDS[id].name}: ${plan.find(s => s.friend === id).voice}`);
  if (process.env.GO !== '1') { console.log('Nothing sent. Run again with GO=1 (and GOOGLE_TTS_TOKEN or GOOGLE_TTS_KEY) to make them.'); return; }
  if (!process.env.GOOGLE_TTS_TOKEN && !process.env.GOOGLE_TTS_KEY) throw new Error('set GOOGLE_TTS_TOKEN=$(gcloud auth print-access-token) or GOOGLE_TTS_KEY');
  const { speakerFor, trim, m4a } = await import('./voice-lib.mjs');
  const say = await speakerFor('google');
  for (const s of plan) {
    const file = OUT + s.file; mkdirSync(OUT + s.friend, { recursive: true });
    if (!existsSync(file)) m4a(trim(await say(s.text, s.voice, 1)), file);
  }
  writeFileSync(OUT + 'samples.json', JSON.stringify({ made: new Date().toISOString(), samples: plan }, null, 1));
  console.log(`Wrote ${OUT}. Serve the repository root (python3 -m http.server 8371) and open /docs/prototypes/family-helpers/listen.html`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exit(1); });
