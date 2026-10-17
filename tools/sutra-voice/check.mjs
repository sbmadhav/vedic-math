/* Listen-check without ears: transcribe every clip back with Whisper (open weights, run locally through
   transformers.js) in Hindi mode, and score how close the Devanagari it hears is to the name.
   Run after make-sutra-clips.mjs:  node check.mjs [whisper model]   (default onnx-community/whisper-small)
   Reads ../../sounds/sutras/<id>.m4a and writes check.json here. The score is 1 minus the edit distance between the two letter skeletons
   (vowel signs and virama kept, spaces dropped) over the longer length; 1 is a perfect match.
   Whisper is a Hindi listener, so it tends to drop final short a and to "correct" Sanskrit into Hindi
   words; a low score means "listen to this one", not "this one is wrong". */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pipeline } from '@huggingface/transformers';
import { fileURLToPath } from 'node:url';

import { NAMES, appId } from './names.mjs';
import { toDeva } from './sanskrit.mjs';
import { VOICE } from '../../js/say-clips.js';

const DIR = fileURLToPath(new URL('../../', import.meta.url)), OUT = fileURLToPath(new URL('./check.json', import.meta.url));
const MODEL = process.argv[2] || 'onnx-community/whisper-small';

const pcm16k = file => { // m4a to 16 kHz mono float samples via macOS afconvert
  const tmp = OUT.replace(/check\.json$/, '.check.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', DIR + file, tmp]);
  const b = readFileSync(tmp); rmSync(tmp);
  let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const n = b.readUInt32LE(o + 4) / 2, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(o + 8 + i * 2) / 32768;
  return out;
};
const skeleton = s => s.replace(/[^ऀ-ॿ]/g, '').replace(/[।॥]/g, '');
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const score = (heard, want) => { const a = skeleton(heard), b = skeleton(want); return +(1 - lev(a, b) / Math.max(a.length, b.length, 1)).toFixed(2); };

const asr = await pipeline('automatic-speech-recognition', MODEL, { dtype: 'fp32' });
const out = { model: MODEL, voice: VOICE, mean: 0, rows: [] };
for (const n of NAMES) {
  const id = appId(n.id), deva = toDeva(n.say);
  const r = await asr(pcm16k(`sounds/sutras/${id}.m4a`), { language: 'hindi', task: 'transcribe' });
  const text = (r.text || '').trim(), row = { id, iast: n.iast, deva, heard: text, score: score(text, deva) };
  out.rows.push(row);
  console.log(id, deva, '|', text, `(${row.score})`);
}
out.mean = +(out.rows.reduce((a, r) => a + r.score, 0) / out.rows.length).toFixed(3);
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log('mean', out.mean);
