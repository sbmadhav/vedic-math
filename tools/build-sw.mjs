/* The service worker as published (openspec change react-typescript, design D9, task 1.5): app/src/sw/sw.ts with its
   types taken out, by Node's own type stripper (no install needed: python3 build.py runs this with the system node,
   22.13 or newer). The stripper blanks each type with spaces so every line stays where it was; this removes those
   blanks and the space that led into them, so `function f(req: Request): Promise<Response> {` publishes as
   `function f(req) {`. Comments and everything else are kept byte for byte, including the precache markers build.py
   fills. TypeScript that is not plain type syntax (enums, namespaces, parameter properties) is refused by the
   stripper, which is what a worker published as one classic script needs.

   Usage: node tools/build-sw.mjs [app/src/sw/sw.ts]   (the JavaScript on stdout) */
import { readFileSync } from 'node:fs';
import module from 'node:module';
import { fileURLToPath } from 'node:url';

export const SOURCE = fileURLToPath(new URL('../app/src/sw/sw.ts', import.meta.url));

export function stripTypes(ts) {
  if (typeof module.stripTypeScriptTypes !== 'function') throw new Error(`Node ${process.versions.node} has no module.stripTypeScriptTypes: use Node 22.13 or newer`);
  const js = module.stripTypeScriptTypes(ts, { mode: 'strip' });
  if (js.length !== ts.length) throw new Error('the type stripper moved code: only plain type syntax is allowed in the worker');
  const blank = i => js[i] !== ts[i];
  let out = '';
  for (let i = 0; i < js.length; i++) {
    if (blank(i)) continue;
    const c = ts[i];
    if (c === ' ' || c === '\t') {
      // A space or tab that leads into a blanked type (on the same line) goes with it
      let j = i;
      while (j < ts.length && (ts[j] === ' ' || ts[j] === '\t')) j++;
      if (j < ts.length && ts[j] !== '\n' && blank(j)) { i = j - 1; continue; }
    }
    out += c;
  }
  return out;
}

export const buildWorker = (path = SOURCE) => stripTypes(readFileSync(path, 'utf8'));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.stdout.write(buildWorker(process.argv[2] || SOURCE));
