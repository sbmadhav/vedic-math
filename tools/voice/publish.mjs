/* Studio voice, step 3 of 3: publish the recordings (openspec better-voice, task 2.4).
   Run from the repo root after record.mjs:  node tools/voice/publish.mjs
   Packs tools/voice/out/voice/ into voice-<id>.tar, uploads it to a GitHub Release of this repo (tag voice-<id>, stored by
   GitHub outside git history, marked a prerelease so it never shows as the app's latest release), and writes the tag and the archive's SHA-256 into js/voice-index.js. Commit that file:
   the CI deploy (tools/voice/ci-fetch.mjs) then downloads the archive, checks the hash and unpacks it into _site/voice/. */
import { readFileSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeIndex } from './index-file.mjs';

const HERE = fileURLToPath(new URL('./', import.meta.url)), VOICE = HERE + 'out/voice/';
const { STUDIO } = await import(`../../js/voice-index.js?t=${Date.now()}`);
const fail = m => { console.error('publish: ' + m); process.exit(1); };
if (!STUDIO.lineSet || !STUDIO.dir || !STUDIO.packs.length) fail('js/voice-index.js names no recordings; run record.mjs first');
for (const f of [STUDIO.lineSet, STUDIO.dir, ...STUDIO.packs.flatMap(p => [p.audio, p.map])]) if (!existsSync(VOICE + f)) fail(`${f} is missing from tools/voice/out/voice/`);

const tmp = HERE + 'voice.tar';
/* macOS tar would add AppleDouble ._ files and extended attributes, which would land in _site/voice/ on Linux */
const macTar = process.platform === 'darwin' ? ['--no-mac-metadata', '--no-xattrs'] : [];
execFileSync('tar', [...macTar, '-C', VOICE, '-cf', tmp, 'l', 'p'], { env: { ...process.env, COPYFILE_DISABLE: '1' } });
const sha256 = createHash('sha256').update(readFileSync(tmp)).digest('hex'), tag = 'voice-' + sha256.slice(0, 10);
const file = `${HERE}${tag}.tar`; renameSync(tmp, file);
const exists = (() => { try { execFileSync('gh', ['release', 'view', tag], { stdio: 'ignore' }); return true; } catch (e) { return false; } })();
if (exists) execFileSync('gh', ['release', 'upload', tag, file, '--clobber'], { stdio: 'inherit' });
else execFileSync('gh', ['release', 'create', tag, file, '--prerelease', '--latest=false', '--title', `Studio voice audio (${STUDIO.voice}, ${STUDIO.counts.lines} lines, ${STUDIO.counts.clips} clips)`,
  '--notes', 'Recordings for the Vedic Math studio voice, copied to the voice host (voice.learnvedicmath.com) by the CI voice-upload job (tools/voice/r2-upload.mjs). Not source code: do not edit.'], { stdio: 'inherit' });
writeIndex({ ...STUDIO, tag, sha256 });
console.log(`published ${tag} (${(readFileSync(file).length / 1e6).toFixed(1)} MB); js/voice-index.js now names it. Commit js/voice-index.js and tools/voice/manifest.json.`);
