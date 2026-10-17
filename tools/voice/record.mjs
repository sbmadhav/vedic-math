/* Studio voice, step 2 of 3: record every line in tools/voice/out/lines.json with Google Chirp 3 HD
   (openspec better-voice, task 2.3).
   Run from the repo root, signed in with gcloud (no key is ever written anywhere):
     GOOGLE_TTS_TOKEN=$(gcloud auth print-access-token) GOOGLE_CLOUD_PROJECT=sbmadhav-vedic-math node tools/voice/record.mjs
   or with a restricted classic key in GOOGLE_TTS_KEY.
   Writes tools/voice/out/voice/ (git-ignored): l/<hash>.m4a per whole line, l/set.<h>.bin (the sorted 32-bit keys of
   every whole line), p/<pack>.<h>.m4a + .json (clip sprites and their offsets), p/dir.<h>.json (clip id -> pack).
   Then rewrites js/voice-index.js (tag and sha256 cleared until publish.mjs uploads the archive) and
   tools/voice/manifest.json (every recorded line hash, for test/voice-coverage.test.mjs).
   Safe to stop and re-run: a whole line already on disk is never recorded again, and clips are cached in .cache/.
   Spend: voice-lib.mjs's guard refuses anything past BUDGET_USD (default 300) a month or RUN_USD (default 50) a run,
   and paces requests to RATE_PER_MIN (default 300).
   LIMIT=20 records only the first 20 whole lines and their clips into out-test/, and leaves the repo files alone. */
import { writeFileSync, readFileSync, existsSync, mkdirSync, renameSync, rmSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lineHash, lineKey, planLine, clipText as clipTextOf } from '../../js/voice-plan.js';
import { indexModule } from './index-file.mjs';
import { CLOUD, sharedGuard, trim, m4a, RATE, speakerFor } from './voice-lib.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const HERE = new URL('./', import.meta.url).pathname;
const LIMIT = +(process.env.LIMIT || 0);
const OUT = HERE + (LIMIT ? 'out-test/voice/' : 'out/voice/');
const WORKERS = +(process.env.WORKERS || 6);
const GAP = 0.25; // seconds of silence between clips in a pack, so the decoder's start offset never cuts a word

const L = JSON.parse(readFileSync(HERE + 'out/lines.json', 'utf8'));
let whole = L.whole, clipIds = Object.keys(L.clips);
if (LIMIT) {
  whole = whole.slice(0, LIMIT);
  const need = new Set(whole.flatMap(w => planLine(w.words).filter(p => p.clip).map(p => p.clip)));
  clipIds = clipIds.filter(id => need.has(id)).slice(0, LIMIT);
}
const failed = []; // whole lines the provider refused (not budget): left out of the index, so clips say them
const guard = sharedGuard(); // the same guard speakerFor() charges, so RUN_USD caps the whole run
const sha = buf => createHash('sha256').update(buf).digest('hex');
const short = buf => sha(buf).slice(0, 10);

/* One Chirp request with retries: a 401 refreshes a gcloud token once; 429 and 5xx back off. Charged once, before sending. */
async function say(text) {
  guard.charge('google', text.length);
  for (let attempt = 0; ; attempt++) {
    await guard.pace();
    try { return await CLOUD.google.say(text, L.voice, L.speed); }
    catch (e) {
      const status = +String(e.message).slice(0, 3);
      if (status === 401 && attempt === 0 && process.env.GOOGLE_TTS_TOKEN) {
        process.env.GOOGLE_TTS_TOKEN = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
        continue;
      }
      if ((status === 429 || status >= 500) && attempt < 5) { await new Promise(r => setTimeout(r, 2000 * 2 ** attempt)); continue; }
      throw e;
    }
  }
}

async function recordWhole() {
  mkdirSync(OUT + 'l', { recursive: true });
  let next = 0, done = 0, made = 0; failed.length = 0;
  const work = async () => {
    while (next < whole.length) {
      const { words } = whole[next++], file = `${OUT}l/${lineHash(L.voice, words)}.m4a`;
      if (!existsSync(file)) {
        try { m4a(trim(await say(words)), file); made++; }
        catch (e) { if (String(e.message).startsWith('budget:')) throw e; failed.push(words); console.error(`  failed: "${words}": ${String(e.message).slice(0, 160)}`); }
      }
      if (++done % 500 === 0) console.log(`  whole lines: ${done} of ${whole.length} (${made} new, $${guard.runUsd().toFixed(2)} this run)`);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, work));
  console.log(`whole lines: ${whole.length} (${made} recorded this run${failed.length ? `, ${failed.length} failed: said from clips until a re-run records them` : ''})`);
}

async function recordPacks() {
  mkdirSync(OUT + 'p', { recursive: true });
  const sayClip = await speakerFor('google'); // cached in .cache/, charged by the same ledger
  const packs = [];
  for (const name of L.packs) {
    const ids = clipIds.filter(id => L.clips[id] === name); if (!ids.length) continue;
    const map = {}, chunks = [new Float32Array(Math.round(GAP * RATE))]; let at = chunks[0].length;
    for (const id of ids) {
      const a = trim(await sayClip(clipTextOf(id), L.voice, L.speed));
      map[id] = [+(at / RATE).toFixed(4), +(a.length / RATE).toFixed(4)];
      chunks.push(a, new Float32Array(Math.round(GAP * RATE))); at += a.length + Math.round(GAP * RATE);
    }
    const all = new Float32Array(at); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
    /* Named by the hash of its samples, so an unchanged pack keeps its name and file (AAC encoding is not byte-stable) */
    const audio = `p/${name}.${short(Buffer.from(all.buffer))}.m4a`;
    const bytes = existsSync(OUT + audio) ? statSync(OUT + audio).size : m4a(all, OUT + audio);
    const json = JSON.stringify({ rate: RATE, gap: GAP, clips: map }), mapFile = `p/${name}.${short(json)}.json`;
    writeFileSync(OUT + mapFile, json);
    packs.push({ name, audio, map: mapFile, bytes, clips: ids.length });
    console.log(`pack ${name}: ${ids.length} clips, ${(bytes / 1e6).toFixed(2)} MB`);
  }
  /* Packs and maps no longer named are left behind by an older recording: remove them */
  const keep = new Set(packs.flatMap(p => [p.audio, p.map]));
  for (const f of readdirSync(OUT + 'p')) if (!f.startsWith('dir.') && !keep.has('p/' + f)) rmSync(OUT + 'p/' + f);
  return packs;
}

await recordWhole();
const packs = await recordPacks();
const dirJson = JSON.stringify(Object.fromEntries(clipIds.map(id => [id, L.clips[id]])));
for (const f of readdirSync(OUT + 'p').filter(f => f.startsWith('dir.'))) rmSync(OUT + 'p/' + f);
const dir = `p/dir.${short(dirJson)}.json`; writeFileSync(OUT + dir, dirJson);
const hashes = [...new Set(whole.map(w => lineHash(L.voice, w.words)))].filter(h => existsSync(`${OUT}l/${h}.m4a`)).sort(); // only lines on disk
const keys = Uint32Array.from(new Set(hashes.map(lineKey))).sort();
const setBuf = Buffer.from(keys.buffer);
for (const f of readdirSync(OUT + 'l').filter(f => f.startsWith('set.'))) rmSync(OUT + 'l/' + f);
/* Lines no longer said (a wording change) leave the archive but stay on disk in stale/, in case the wording comes back */
const keep = new Set(hashes.map(h => h + '.m4a')); mkdirSync(OUT + '../stale/', { recursive: true });
for (const f of readdirSync(OUT + 'l').filter(f => f.endsWith('.m4a') && !keep.has(f))) renameSync(OUT + 'l/' + f, OUT + '../stale/' + f);
const lineSet = `l/set.${short(setBuf)}.bin`; writeFileSync(OUT + lineSet, setBuf);

const index = { voice: L.voice, speed: L.speed, base: '/vedic-math/voice/', tag: null, sha256: null, lineSet, dir, packs, coveredSkills: L.coveredSkills, counts: { lines: hashes.length, clips: clipIds.length } };
if (LIMIT) {
  console.log(`test run: ${OUT} written; js/voice-index.js and manifest.json left alone`, JSON.stringify(index).slice(0, 300));
} else {
  writeFileSync(ROOT + 'js/voice-index.js', indexModule(index));
  writeFileSync(HERE + 'manifest.json', JSON.stringify({ voice: L.voice, speed: L.speed, chars: L.chars, clips: clipIds.slice().sort(), lines: hashes }));
  console.log('wrote js/voice-index.js and tools/voice/manifest.json; next: node tools/voice/publish.mjs');
}
console.log(`spent this run: $${guard.runUsd().toFixed(2)} at list price; this month: $${guard.spent().toFixed(2)} (ledger tools/voice/.cache/ledger.json)`);

