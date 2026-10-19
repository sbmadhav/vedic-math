/* Saves a thumbnail for every Watch shelf video in thumbs/yt-<YouTube id>.webp (320x180), so the shelf shows pictures
   from this site and nothing reaches YouTube until a Player presses play (openspec change learnvedicmath, design D10).
   Repo-only. Needs cwebp (brew install webp).

     node tools/fetch-thumbs.mjs          fetch the ones that are missing
     node tools/fetch-thumbs.mjs --all    fetch every one again

   test/videos.test.mjs fails when a js/videos.js entry has no thumbnail, and when a thumbnail belongs to no entry. */
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { VIDEOS } from '../js/videos.js';

const dir = fileURLToPath(new URL('../thumbs/', import.meta.url));
mkdirSync(dir, { recursive: true });
const all = process.argv.includes('--all');
const ids = [...new Set(VIDEOS.filter(v => v.yt).map(v => v.yt))];
let made = 0;
for (const id of ids) {
  const out = join(dir, `yt-${id}.webp`);
  if (existsSync(out) && !all) continue;
  const r = await fetch(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
  if (!r.ok) { console.error(`${id}: HTTP ${r.status}`); process.exitCode = 1; continue; }
  const jpg = join(tmpdir(), `thumb-${id}.jpg`);
  writeFileSync(jpg, Buffer.from(await r.arrayBuffer()));
  execFileSync('cwebp', ['-quiet', '-q', '72', '-resize', '320', '180', '-metadata', 'none', jpg, '-o', out]);
  rmSync(jpg);
  made++;
}
const stale = readdirSync(dir).filter(f => f.endsWith('.webp') && !ids.includes(f.slice(3, -5)));
for (const f of stale) rmSync(join(dir, f));
console.log(`thumbs/: ${made} saved, ${stale.length} removed, ${ids.length} videos`);
