/* Writes the Trick pages (openspec change trick-pages, design D3): site/tricks/index.html and one
   site/tricks/<slug>/index.html per row of pages.ts, rendered from shared/src/vedic.ts with the header from
   theme/header.html. The output is committed; test/trick-pages.test.mjs regenerates it and fails when a committed page
   differs.

     pnpm gen:tricks                                 (node tools/trick-pages/generate.ts) rewrites site/tricks/
     node tools/trick-pages/generate.ts --out DIR    writes the same pages under DIR instead (the test's scratch folder)

   Node 22.18 or newer runs this file as is (its types are stripped, like tools/budget.ts). */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAll } from './pages.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export function generate(outDir: string): string[] {
  const header = readFileSync(join(ROOT, 'theme/header.html'), 'utf8');
  const written: string[] = [];
  for (const [rel, html] of renderAll(header)) {
    const path = join(outDir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, html);
    written.push(path);
  }
  return written;
}

const args = process.argv.slice(2);
const at = args.indexOf('--out');
const outDir = (at >= 0 && args[at + 1]) || join(ROOT, 'site');
const files = generate(outDir);
console.log(`trick-pages: wrote ${files.length} pages under ${outDir}`);
