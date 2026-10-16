/* Shared by make-clips.mjs and kid-voices.mjs: Kokoro with blended voices, a disk cache, trimming, AAC encoding
   and a rough pitch (F0) measure. Blends are weighted averages of Kokoro's voice style vectors, written next to
   the stock voices as <name>.bin (no retraining, no pitch shifting). */
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { KokoroTTS } from 'kokoro-js';

export const RATE = 24000, BITRATE = 32000;
const VOICES = new URL('./node_modules/kokoro-js/voices/', import.meta.url).pathname;
const CACHE = new URL('./.cache/', import.meta.url).pathname;

/* "af_bella*0.5+af_sky*0.5" -> a voice id kokoro-js can load */
export function voiceId(spec) {
  if (!spec.includes('+') && !spec.includes('*')) return spec;
  const id = 'blend_' + createHash('sha1').update(spec).digest('hex').slice(0, 8), file = VOICES + id + '.bin';
  if (!existsSync(file)) {
    const parts = spec.split('+').map(p => { const [v, w] = p.trim().split('*'); return [v, w === undefined ? 1 : +w]; });
    const total = parts.reduce((a, [, w]) => a + w, 0); let out = null;
    for (const [v, w] of parts) { const b = readFileSync(VOICES + v + '.bin'), f = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); out ||= new Float32Array(f.length); for (let i = 0; i < f.length; i++) out[i] += f[i] * w / total; }
    writeFileSync(file, Buffer.from(out.buffer));
  }
  return id;
}

let tts = null;
export async function speaker() {
  if (!tts) { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); tts._validate_voice = v => v.startsWith('b') && !v.startsWith('blend') ? 'b' : 'a'; }
  mkdirSync(CACHE, { recursive: true });
  return async (text, spec, speed) => {
    const f = CACHE + createHash('sha1').update(`${spec}|${speed}|${text}`).digest('hex') + '.f32';
    if (existsSync(f)) { const b = readFileSync(f); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
    const t0 = Date.now(), out = await tts.generate(text, { voice: voiceId(spec), speed }), a = new Float32Array(out.audio);
    writeFileSync(f, Buffer.from(a.buffer)); console.log(`  made "${text}" (${spec}) in ${Date.now() - t0} ms`); return a;
  };
}

export const trim = (a, thr = 0.012, pad = Math.round(RATE * 0.02)) => {
  let s = 0, e = a.length - 1;
  while (s < a.length && Math.abs(a[s]) < thr) s++;
  while (e > s && Math.abs(a[e]) < thr) e--;
  return a.slice(Math.max(0, s - pad), Math.min(a.length, e + pad + 1));
};
function wav(f32, path) {
  const n = f32.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767))), 44 + i * 2);
  writeFileSync(path, buf);
}
export function m4a(f32, path) {
  const tmp = path.replace(/\.m4a$/, '.wav'); wav(f32, tmp);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', String(BITRATE), '-c', '1', tmp, path]); rmSync(tmp);
  return statSync(path).size;
}
/* Median F0 in Hz over voiced 40 ms frames (autocorrelation, 120 to 500 Hz). Adult women speak around 180 to 230 Hz,
   children of 6 to 10 around 230 to 300 Hz. A rough guide only: the ear decides. */
export function medianF0(a) {
  const N = Math.round(RATE * 0.04), lo = Math.round(RATE / 500), hi = Math.round(RATE / 120), f0s = [];
  for (let s = 0; s + N + hi < a.length; s += N / 2) {
    let e = 0; for (let i = 0; i < N; i++) e += a[s + i] * a[s + i]; if (e / N < 1e-4) continue;
    const cs = []; let best = 0;
    for (let L = lo; L <= hi; L++) { let c = 0; for (let i = 0; i < N; i++) c += a[s + i] * a[s + i + L]; cs.push(c); if (c > best) best = c; }
    if (best / e < 0.5) continue;
    /* the shortest lag that is a local peak within 85% of the best, so a period's double (an octave too low) never wins */
    let lag = 0; for (let k = 1; k < cs.length - 1; k++) if (cs[k] >= 0.85 * best && cs[k] >= cs[k - 1] && cs[k] >= cs[k + 1]) { lag = lo + k; break; }
    if (lag) f0s.push(RATE / lag);
  }
  f0s.sort((x, y) => x - y); return f0s.length ? Math.round(f0s[Math.floor(f0s.length / 2)]) : 0;
}

/* ---------- Paid cloud voices, for dev-time generation only (never called from the app) ----------
   Each returns 24 kHz mono Float32 PCM. Keys come from the environment and are never written anywhere.
   The prototype's 12 lines plus their clips are about 1,500 characters per voice: inside every free tier. */
const pcm16 = buf => { const b = Buffer.from(buf), out = new Float32Array(b.length >> 1); for (let i = 0; i < out.length; i++) out[i] = b.readInt16LE(i * 2) / 32768; return out; };
const wavData = buf => { const b = Buffer.from(buf); let o = 12; while (o < b.length - 8) { const id = b.toString('ascii', o, o + 4), n = b.readUInt32LE(o + 4); if (id === 'data') return b.subarray(o + 8, o + 8 + n); o += 8 + n; } return b; };
const ok = async r => { if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r; };
export const CLOUD = {
  /* Google Cloud Text-to-Speech, e.g. en-US-Chirp3-HD-Aoede ($30 per million characters after 1 million free a month), en-US-Neural2-F, en-US-Wavenet-F */
  /* Auth: GOOGLE_TTS_KEY, a classic API key (AIza...) restricted to Cloud Text-to-Speech, or GOOGLE_TTS_TOKEN, an OAuth token
     (for example from `gcloud auth print-access-token` with a service account). "AQ." keys are refused by this API. */
  google: { env: ['GOOGLE_TTS_KEY', 'GOOGLE_TTS_TOKEN'], say: async (text, voice, speed) => {
    const auth = process.env.GOOGLE_TTS_TOKEN ? { authorization: `Bearer ${process.env.GOOGLE_TTS_TOKEN}` } : { 'x-goog-api-key': process.env.GOOGLE_TTS_KEY };
    const r = await ok(await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', { method: 'POST', headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ input: { text }, voice: { languageCode: voice.slice(0, 5), name: voice }, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: RATE, speakingRate: speed } }) }));
    return pcm16(wavData(Buffer.from((await r.json()).audioContent, 'base64')));
  } },
  /* Azure AI Speech neural voices, e.g. en-US-AvaMultilingualNeural ($15 per million after 0.5 million free a month). AZURE_TTS_REGION, e.g. eastus */
  azure: { env: 'AZURE_TTS_KEY', say: async (text, voice, speed) => {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const r = await ok(await fetch(`https://${process.env.AZURE_TTS_REGION || 'eastus'}.tts.speech.microsoft.com/cognitiveservices/v1`, { method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_TTS_KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm' },
      body: `<speak version="1.0" xml:lang="en-US"><voice name="${voice}"><prosody rate="${Math.round((speed - 1) * 100)}%">${esc(text)}</prosody></voice></speak>` }));
    return pcm16(wavData(await r.arrayBuffer()));
  } },
  /* OpenAI gpt-4o-mini-tts, e.g. voice "coral" (about 1.5 cents a minute of audio) */
  openai: { env: 'OPENAI_API_KEY', say: async (text, voice, speed) => {
    const r = await ok(await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, response_format: 'pcm', speed, instructions: 'A warm, clear, friendly teacher reading a math question to a young child. Calm pace.' }) }));
    return pcm16(await r.arrayBuffer());
  } },
  /* ElevenLabs, a voice id from their library, model eleven_flash_v2_5 (about $50 per million characters) */
  elevenlabs: { env: 'ELEVENLABS_API_KEY', say: async (text, voice, speed) => {
    const r = await ok(await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=pcm_24000`, { method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5', voice_settings: { speed } }) }));
    return pcm16(await r.arrayBuffer());
  } }
};
/* ---------- Spend guard ----------
   Every paid request is counted in .cache/ledger.json by calendar month (UTC), at list price and ignoring free tiers,
   so the count can only overstate the bill. A request that would take the month past BUDGET_USD (default 300, the
   owner's cap) or this run past RUN_USD (default 50) is refused before it is sent. Requests are also paced to
   RATE_PER_MIN (default 300) so a bug can never fire a burst. This guards this machine; the Google Cloud budget and
   API quota (design decision 12) guard the account. */
export const PRICE_PER_CHAR = { google: 30e-6, azure: 15e-6, openai: 20e-6, elevenlabs: 50e-6 }; // Chirp 3 HD $30/M; OpenAI about 1.5 cents a minute
const LEDGER = CACHE + 'ledger.json';
const month = () => new Date().toISOString().slice(0, 7);
let runUsd = 0, lastAt = 0;
function charge(engine, chars) {
  const budget = +(process.env.BUDGET_USD || 300), runCap = +(process.env.RUN_USD || 50), cost = chars * (PRICE_PER_CHAR[engine] || 50e-6);
  const led = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : {};
  const m = led[month()] ||= { usd: 0, chars: {} };
  if (m.usd + cost > budget) throw new Error(`budget: this month is at $${m.usd.toFixed(2)} of $${budget}; refusing a $${cost.toFixed(4)} request`);
  if (runUsd + cost > runCap) throw new Error(`budget: this run is at $${runUsd.toFixed(2)} of RUN_USD $${runCap}; refusing`);
  m.usd += cost; m.chars[engine] = (m.chars[engine] || 0) + chars; runUsd += cost;
  writeFileSync(LEDGER, JSON.stringify(led, null, 1));
}
async function pace() {
  const gap = 60000 / +(process.env.RATE_PER_MIN || 300), wait = lastAt + gap - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastAt = Date.now();
}
export const spentThisMonth = () => { const led = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : {}; return (led[month()] || { usd: 0 }).usd; };

/* say(text, spec, speed) for an engine, cached like Kokoro. Kokoro loads only when a Kokoro voice is used. */
export async function speakerFor(engine) {
  if (!engine || engine === 'kokoro') return speaker();
  const c = CLOUD[engine]; mkdirSync(CACHE, { recursive: true });
  return async (text, spec, speed) => {
    const f = CACHE + createHash('sha1').update(`${engine}|${spec}|${speed}|${text}`).digest('hex') + '.f32';
    if (existsSync(f)) { const b = readFileSync(f); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
    charge(engine, text.length); await pace();
    const a = await c.say(text, spec, speed); writeFileSync(f, Buffer.from(a.buffer)); console.log(`  made "${text}" (${engine} ${spec})`); return a;
  };
}
