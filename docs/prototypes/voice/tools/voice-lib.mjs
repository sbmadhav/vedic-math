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
