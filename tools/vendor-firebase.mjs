/* Vendors the Firebase JS SDK (the gstatic ESM build) into vendor/firebase/<version>/, so the game loads it from this
   site and never from www.gstatic.com (openspec change learnvedicmath, design D10). Repo-only.

     node tools/vendor-firebase.mjs 13.0.0

   Downloads the four modules js/cloud.js uses, rewrites their imports of https://www.gstatic.com/firebasejs/<v>/ to
   relative paths, adds the Apache-2.0 licence and writes SHA256SUMS (build.py and test/vendor.test.mjs check it).
   Then set V in js/cloud.js to the new version, list the folder in THIRD-PARTY-NOTICES.md, delete the old folder
   and review the diff. Upgrading is a deliberate PR: Dependabot cannot see this. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('usage: node tools/vendor-firebase.mjs <version, for example 13.0.0>'); process.exit(1); }
const FILES = ['firebase-app.js', 'firebase-firestore.js', 'firebase-auth.js', 'firebase-app-check.js'];
const CDN = `https://www.gstatic.com/firebasejs/${v}/`;
const dir = join(fileURLToPath(new URL('..', import.meta.url)), 'vendor', 'firebase', v);
mkdirSync(dir, { recursive: true });

const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.text(); };
export const rewrite = (text, cdn) => text.split(cdn).join('./');
const sums = [];
for (const f of FILES) {
  const text = rewrite(await get(CDN + f), CDN);
  if (/gstatic\.com\/firebasejs/.test(text)) throw new Error(`${f}: still names gstatic.com/firebasejs after the rewrite`);
  writeFileSync(join(dir, f), text);
  sums.push(`${createHash('sha256').update(text).digest('hex')}  ${f}`);
}
const licence = await get('https://www.apache.org/licenses/LICENSE-2.0.txt');
writeFileSync(join(dir, 'LICENSE'), licence);
sums.push(`${createHash('sha256').update(licence).digest('hex')}  LICENSE`);
writeFileSync(join(dir, 'SHA256SUMS'), sums.join('\n') + '\n');
console.log(`vendor/firebase/${v}/: ${FILES.length} modules and LICENSE. Now set V = '${v}' in js/cloud.js.`);
