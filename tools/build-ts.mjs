/* The TypeScript modules the Legacy views import, as published (openspec change react-typescript, phase 2 tasks 3.1
   to 3.3): each file with its types taken out by Node's own type stripper, the same way tools/build-sw.mjs publishes
   the service worker (every line stays where it is; comments and code are kept byte for byte). build.py runs this with
   the system node (22.13 or newer), then rewrites the import specifiers and publishes each module under /js/ts/.
   Until the framework build (task 2.1) bundles the game, this is how a js/ module that moved to shared/src/ or
   app/src/ still reaches the browser. TypeScript that is not plain type syntax (enums, namespaces, parameter
   properties) is refused, which keeps the published code the same as the source.

   Usage: node tools/build-ts.mjs <file.ts>...   (JSON on stdout: { js: { <file.ts>: JavaScript }, errors: { <file.ts>: why } }) */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stripTypes } from './build-sw.mjs';

/* { js: { <file>: JavaScript }, errors: { <file>: why it cannot be published } }: build.py fails only when a module
   the Legacy views reach is in errors, so a file nothing in js/ imports (a test harness) may use other syntax */
export function buildModules(paths) {
  const js = {}, errors = {};
  for (const p of paths) {
    try { js[p] = stripTypes(readFileSync(p, 'utf8')); } catch (e) { errors[p] = e.message; }
  }
  return { js, errors };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.stdout.write(JSON.stringify(buildModules(process.argv.slice(2))));
