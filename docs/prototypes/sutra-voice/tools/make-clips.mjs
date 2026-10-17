/* sutra-pronunciation listening page: makes a Kokoro clip of every Sutra and sub-sutra name, locally.
   No cloud service: kokoro-js runs the open Kokoro-82M model (Apache-2.0) on this machine. kokoro-js only
   exposes its English front end, so the phonemes come from sanskrit.mjs (the IAST read letter by letter)
   and go straight to the model, with Kokoro's Hindi voice files.
   For comparison, one set uses eSpeak's Hindi rules (what Kokoro's own Hindi pipeline would do; run
   espeak-hi.mjs first), and two sets are blends: a weighted average of two voices' style vectors, the same
   no-pitch-shift method the better-voice change uses for its kid blend.
   Same format as better-voice: AAC in .m4a, mono, 24 kHz, 32 kbps (macOS afconvert).
   Run:  cd docs/prototypes/sutra-voice/tools && npm install && node espeak-hi.mjs && node make-clips.mjs
   Writes ../audio/<set>/<id>.m4a and ../clips.json. */
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { KokoroTTS } from 'kokoro-js';
import { Tensor } from '@huggingface/transformers';
import { NAMES } from './names.mjs';
import { toDeva, toIPA, respell } from './sanskrit.mjs';

const OUT = new URL('../', import.meta.url).pathname;
const VOICES = new URL('./node_modules/kokoro-js/voices/', import.meta.url).pathname;
const RATE = 24000, BITRATE = 32000, SPEED = 0.85;
const ESPEAK = JSON.parse(readFileSync(new URL('./espeak-hi.json', import.meta.url), 'utf8'));

/* Each set: voice mix { file: weight }, and where its phonemes come from */
export const SETS = [
  { id: 'hf_alpha', mix: { hf_alpha: 1 }, label: 'Alpha (Hindi, woman)', src: 'iast' },
  { id: 'hf_beta', mix: { hf_beta: 1 }, label: 'Beta (Hindi, woman)', src: 'iast' },
  { id: 'hm_omega', mix: { hm_omega: 1 }, label: 'Omega (Hindi, man)', src: 'iast' },
  { id: 'hm_psi', mix: { hm_psi: 1 }, label: 'Psi (Hindi, man)', src: 'iast' },
  { id: 'kid_beta_jalpha', mix: { hf_beta: 0.7, jf_alpha: 0.3 }, label: 'Kid blend: Beta 70%, Kokoro\'s lighter Japanese voice 30%', src: 'iast' },
  { id: 'kid_alpha_jalpha', mix: { hf_alpha: 0.7, jf_alpha: 0.3 }, label: 'Kid blend: Alpha 70%, Kokoro\'s lighter Japanese voice 30%', src: 'iast' },
  { id: 'hf_alpha_espeak', mix: { hf_alpha: 1 }, label: 'Alpha reading with Hindi rules (eSpeak), for comparison', src: 'espeak' }
];

const voiceCache = new Map();
const voiceData = name => {
  if (!voiceCache.has(name)) { const b = readFileSync(VOICES + name + '.bin'); voiceCache.set(name, new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))); }
  return voiceCache.get(name);
};
/* What generate_from_ids does, with a blended style vector: the style row is picked by input length */
async function synth(tts, ids, mix, speed) {
  const row = 256 * Math.min(Math.max(ids.dims.at(-1) - 2, 0), 509), style = new Float32Array(256);
  for (const [name, w] of Object.entries(mix)) { const v = voiceData(name); for (let i = 0; i < 256; i++) style[i] += w * v[row + i]; }
  const { waveform } = await tts.model({ input_ids: ids, style: new Tensor('float32', style, [1, 256]), speed: new Tensor('float32', [speed], [1]) });
  return new Float32Array(waveform.data);
}

const trim = (a, thr = 0.012, pad = Math.round(RATE * 0.04)) => {
  let s = 0, e = a.length - 1;
  while (s < a.length && Math.abs(a[s]) < thr) s++;
  while (e > s && Math.abs(a[e]) < thr) e--;
  return a.slice(Math.max(0, s - pad), Math.min(a.length, e + pad + 1));
};
const fade = a => { const n = Math.min(a.length, Math.round(RATE * 0.015)); for (let i = 0; i < n; i++) { a[i] *= i / n; a[a.length - 1 - i] *= i / n; } return a; };
/* Typical pitch: median of per-frame autocorrelation peaks over voiced frames (75 to 400 Hz) */
export function medianF0(a) {
  const win = 1024, hop = 480, f0s = [];
  for (let s = 0; s + win < a.length; s += hop) {
    let energy = 0; for (let i = 0; i < win; i++) energy += a[s + i] * a[s + i];
    if (energy / win < 1e-3) continue;
    let best = 0, lag = 0;
    for (let L = Math.floor(RATE / 400); L <= Math.floor(RATE / 75); L++) { let r = 0; for (let i = 0; i < win - L; i++) r += a[s + i] * a[s + i + L]; if (r > best) { best = r; lag = L; } }
    if (lag && best / energy > 0.4) f0s.push(RATE / lag);
  }
  f0s.sort((x, y) => x - y);
  return f0s.length ? Math.round(f0s[Math.floor(f0s.length / 2)]) : 0;
}
const wav = (f32, path) => {
  const n = f32.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767))), 44 + i * 2);
  writeFileSync(path, buf);
};
const m4a = (f32, path) => { const tmp = path.replace(/\.m4a$/, '.wav'); wav(f32, tmp); execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', String(BITRATE), '-c', '1', tmp, path]); rmSync(tmp); return statSync(path).size; };

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
const vocab = tts.tokenizer.model.tokens_to_ids; // Map of symbol to id
const known = s => [...s].filter(ch => ch === ' ' || vocab.has(ch)).join('');
if (known('ʃuːnjəm') !== 'ʃuːnjəm') throw new Error('Kokoro vocabulary lookup is broken');

const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null; // node make-clips.mjs s01,u07 remakes a few
const prev = only ? JSON.parse(readFileSync(OUT + 'clips.json', 'utf8')) : null;
const clips = [];
for (const name of NAMES) {
  if (only && !only.has(name.id)) { clips.push(prev.clips.find(c => c.id === name.id)); continue; }
  const deva = toDeva(name.say), ipa = toIPA(name.say), esp = ESPEAK[name.id];
  const row = { ...name, deva, respell: respell(name.say), ipa, espeak: esp, files: {} };
  for (const set of SETS) {
    const { input_ids } = tts.tokenizer(known(set.src === 'espeak' ? esp : ipa), { truncation: true });
    const audio = fade(trim(await synth(tts, input_ids, set.mix, SPEED)));
    mkdirSync(`${OUT}audio/${set.id}`, { recursive: true });
    const file = `audio/${set.id}/${name.id}.m4a`, b = m4a(audio, OUT + file);
    row.files[set.id] = { file, bytes: b, secs: +(audio.length / RATE).toFixed(2), f0: medianF0(audio) };
  }
  clips.push(row);
  console.log(name.id, deva, '|', ipa, '|', Object.values(row.files).map(f => f.secs + 's').join(' '));
}
const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const perSet = Object.fromEntries(SETS.map(s => [s.id, {
  bytes: clips.reduce((a, c) => a + c.files[s.id].bytes, 0),
  secs: +clips.reduce((a, c) => a + c.files[s.id].secs, 0).toFixed(1),
  f0: med(clips.map(c => c.files[s.id].f0))
}]));
writeFileSync(OUT + 'clips.json', JSON.stringify({ rate: RATE, bitrateKbps: BITRATE / 1000, speed: SPEED, sets: SETS, perSet, clips }, null, 1));
console.log(perSet);
