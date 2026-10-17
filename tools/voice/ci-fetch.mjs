/* CI deploy step: put the studio voice recordings into the built site (openspec better-voice, task 2.4).
   Run after build.py:  GH_TOKEN=... node tools/voice/ci-fetch.mjs _site
   When js/voice-index.js names no archive, nothing has been recorded: skip, and read aloud uses the built-in voice.
   Otherwise download the archive from this repo's GitHub Release, check its SHA-256 against the index, unpack it into
   <site>/voice/, and check every file the index names is there. Any mismatch fails the job, so a deploy never ships an
   index that points at missing audio.
   Locally (and in test/voice-tools.test.mjs): VOICE_ARCHIVE=<a .tar> uses that file instead of downloading, and
   VOICE_INDEX=<a module> reads another index; for example, after publish.mjs,
     python3 build.py --out _site && VOICE_ARCHIVE=tools/voice/voice-<id>.tar node tools/voice/ci-fetch.mjs _site */
import { readFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const { STUDIO } = await import(process.env.VOICE_INDEX ? resolve(process.env.VOICE_INDEX) : '../../js/voice-index.js');
const site = resolve(process.argv[2] || '_site');
const fail = m => { console.error(`::error::studio voice: ${m}`); process.exit(1); };
if (!STUDIO.tag) { console.log('studio voice: js/voice-index.js names no archive yet; the built-in voice reads aloud'); process.exit(0); }
if (!/^voice-[0-9a-f]{10}$/.test(STUDIO.tag) || !/^[0-9a-f]{64}$/.test(STUDIO.sha256 || '')) fail('the tag or sha256 in js/voice-index.js is malformed');
if (!existsSync(join(site, 'index.html'))) fail(`${site} is not a built site`);
let tar = process.env.VOICE_ARCHIVE && resolve(process.env.VOICE_ARCHIVE);
if (!tar) {
  const dir = mkdtempSync(join(tmpdir(), 'voice-'));
  try { execFileSync('gh', ['release', 'download', STUDIO.tag, '--pattern', `${STUDIO.tag}.tar`, '--dir', dir], { stdio: 'inherit' }); }
  catch (e) { fail(`could not download ${STUDIO.tag}.tar from the release ${STUDIO.tag}`); }
  tar = join(dir, `${STUDIO.tag}.tar`);
}
if (!existsSync(tar)) fail(`${tar} does not exist`);
const got = createHash('sha256').update(readFileSync(tar)).digest('hex');
if (got !== STUDIO.sha256) fail(`${STUDIO.tag}.tar has sha256 ${got}, but js/voice-index.js expects ${STUDIO.sha256}`);
const out = join(site, 'voice'); mkdirSync(out, { recursive: true });
execFileSync('tar', ['-C', out, '-xf', tar]);
for (const f of [STUDIO.lineSet, STUDIO.dir, ...STUDIO.packs.flatMap(p => [p.audio, p.map])]) if (!existsSync(join(out, f))) fail(`${f} is named by js/voice-index.js but is not in the archive`);
const lines = readdirSync(join(out, 'l')).filter(f => /^[0-9a-f]{14}\.m4a$/.test(f)).length;
if (lines < STUDIO.counts.lines) fail(`the archive has ${lines} whole lines, the index says ${STUDIO.counts.lines}`);
console.log(`studio voice: ${STUDIO.tag} unpacked into ${out} (${lines} whole lines, ${STUDIO.packs.length} packs)`);
