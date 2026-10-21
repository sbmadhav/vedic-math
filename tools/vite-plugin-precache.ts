/* The service worker's VERSION and PRECACHE from a Vite build's manifest (openspec change react-typescript, design D9
   and D13). Carried over from branch react-ts-phase-1 (bd086fa) in task 1.5 with its walk, its 3D exclusion and its
   modes, and tested on fixture manifests (test/vite-plugin-precache.test.ts). Not wired yet: in phase 1 python3
   build.py still fills the worker's block from the import map; task 2.6 runs this plugin on the React Router client
   build's manifest instead.

   The worker source (app/src/sw/sw.ts) keeps VERSION = 'dev' and an empty PRECACHE between its
   "build.py: precache" markers. This plugin replaces that block in the published copy:
   - PRECACHE: the entries build.py lists (the /play/ shell, the stamped stylesheets and classic scripts the page
     loads, the play stylesheets, fonts, icons and the manifest), plus every file the game's build wrote to
     /play/assets/ except 3D files. Each entry is [url, the first 10 hex digits of the file's SHA-256], the hash the
     worker checks on install.
   - VERSION: a hash of that list and the rest of the worker source, so any change to the game installs a fresh cache.

   3D files (design D13): a file is never precached when it is reachable only through a 3D scene's dynamic import():
   the walk below starts at every entry and follows static imports and every dynamic import except one whose target
   is a 3D module (app/src/scenes-3d/, three, React Three Fiber, drei). Whatever the walk reaches is precached, so a
   chunk the app's entry also imports is precached even when a 3D scene imports it too.

   Modes (LVM_SW_MODE): site (default), dev (the source block stays: a 'dev' worker that caches nothing), moved (the
   Phase B page for the old origin: KILL = true, the old cache prefix vedic-math-, an empty list). LVM_VOICE=off
   leaves the voice host out (VOICE_ORIGIN = null). */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

export const START = '/* build.py: precache (generated, do not edit) */';
export const END = '/* /build.py: precache */';
/* The lines the build rewrites, as sw.ts writes them (a Vite transform with enforce 'pre' sees the TypeScript) */
export const DEV_BLOCK = "const VERSION: string = 'dev';\nconst PRECACHE: [string, string][] = [];";
const VOICE_LINE = /^const VOICE_ORIGIN: string \| null = '[^']*';.*$/m;

export type Entry = [url: string, hash: string];
/* One entry of Vite's .vite/manifest.json */
export type ManifestChunk = {
  file: string;
  src?: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
};
export type Manifest = Record<string, ManifestChunk>;

export const shortHash = (b: Buffer | string): string => createHash('sha256').update(b).digest('hex').slice(0, 10);

/* A module of the 3D dependency graph: a scene, three.js, React Three Fiber or drei */
export const isThreeD = (src: string): boolean =>
  /(^|\/)app\/src\/scenes-3d\//.test(src) || /(^|\/)scenes-3d\//.test(src) || /(^|\/)node_modules\/(\.pnpm\/[^/]+\/node_modules\/)?(three|@react-three\/[\w-]+)\//.test(src);

/* Every emitted file (relative to the build's outDir) the walk from the entries reaches without entering a 3D dynamic
   import, and the files only 3D dynamic imports reach */
export function reach(manifest: Manifest): { precached: Set<string>; threeD: Set<string> } {
  const files = (c: ManifestChunk) => [c.file, ...(c.css || []), ...(c.assets || [])];
  const seen = new Set<string>();
  const visit = (key: string) => {
    if (seen.has(key)) return;
    const c = manifest[key];
    if (!c) return;
    seen.add(key);
    for (const k of c.imports || []) visit(k);
    for (const k of c.dynamicImports || []) if (!isThreeD(manifest[k]?.src || k)) visit(k);
  };
  for (const [key, c] of Object.entries(manifest)) if (c.isEntry) visit(key);
  const precached = new Set([...seen].flatMap(k => { const c = manifest[k]; return c ? files(c) : []; }));
  const threeD = new Set<string>();
  for (const [key, c] of Object.entries(manifest)) if (!seen.has(key)) for (const f of files(c)) if (!precached.has(f)) threeD.add(f);
  return { precached, threeD };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/* The precache entries for the game's build in `outDir` (the directory served at `base`): every file under
   assets/ that is not a 3D file */
export function assetEntries(manifest: Manifest, outDir: string, base: string): Entry[] {
  const { threeD } = reach(manifest);
  return walk(join(outDir, 'assets'))
    .map(p => relative(outDir, p).split('\\').join('/'))
    .filter(f => !threeD.has(f))
    .sort()
    .map(f => [base + f, shortHash(readFileSync(join(outDir, f)))] as Entry);
}

export function listing(entries: Entry[]): string {
  return '[\n' + entries.map(e => ' ' + JSON.stringify(e)).join(',\n') + '\n]';
}

/* The worker source with its block filled; throws when the markers or the 'dev' block are not found */
export function fill(source: string, opts: { mode: 'site' | 'dev' | 'moved'; entries: Entry[]; voiceOff: boolean }): { code: string; version: string } {
  const i = source.indexOf(START), j = source.indexOf(END);
  if (i < 0 || j < i || source.indexOf(START, i + 1) >= 0) throw new Error('sw.ts: precache markers not found (exactly one pair)');
  if (source.slice(i + START.length, j).trim() !== DEV_BLOCK) throw new Error(`sw.ts is stamped; the source must keep\n${DEV_BLOCK}\nbetween the precache markers (the build stamps the copy)`);
  let src = source;
  if (opts.voiceOff) {
    if (!VOICE_LINE.test(src)) throw new Error('sw.ts: the VOICE_ORIGIN line was not found (build.py --voice off replaces it)');
    src = src.replace(VOICE_LINE, 'const VOICE_ORIGIN: string | null = null; // no Studio voice in this build (build.py --voice off)');
  }
  const block = (body: string) => src.slice(0, src.indexOf(START)) + START + body + END + src.slice(src.indexOf(END) + END.length);
  if (opts.mode === 'dev') return { code: src, version: 'dev' };
  if (opts.mode === 'moved') {
    if (!src.includes('const KILL: boolean = false;') || !/const PREFIX: string = '[\w-]+';/.test(src)) throw new Error('sw.ts: the KILL switch or PREFIX not found');
    src = src.replace('const KILL: boolean = false;', 'const KILL: boolean = true;').replace(/const PREFIX: string = '[\w-]+';/, "const PREFIX: string = 'vedic-math-';");
    const version = shortHash('moved\n' + block(''));
    return { code: block(`\nconst VERSION: string = '${version}';\nconst PRECACHE: [string, string][] = [];\n`), version };
  }
  const list = listing(opts.entries);
  const version = shortHash(list + block(''));
  return { code: block(`\nconst VERSION: string = '${version}';\nconst PRECACHE: [string, string][] = ${list};\n`), version };
}

/* The Vite plugin: fills the block of sw.ts during the worker's build, from the environment build.py sets */
export default function precachePlugin(): Plugin {
  const mode = (process.env.LVM_SW_MODE || 'site') as 'site' | 'dev' | 'moved';
  return {
    name: 'lvm-precache',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/sw/sw.ts')) return null;
      let entries: Entry[] = [];
      if (mode === 'site') {
        const out = process.env.LVM_OUT, manifestPath = process.env.LVM_APP_MANIFEST, extra = process.env.LVM_PRECACHE_EXTRA;
        if (!out || !manifestPath || !extra) throw new Error('LVM_OUT, LVM_APP_MANIFEST and LVM_PRECACHE_EXTRA must be set (python3 build.py sets them)');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
        entries = [...(JSON.parse(readFileSync(extra, 'utf8')) as Entry[]), ...assetEntries(manifest, join(out, 'play'), '/play/')];
        const urls = entries.map(([u]) => u);
        const dup = urls.find((u, k) => urls.indexOf(u) !== k);
        if (dup) throw new Error(`${dup}: listed twice in the precache list`);
      }
      const { code: filled, version } = fill(code, { mode, entries, voiceOff: process.env.LVM_VOICE === 'off' });
      if (process.env.LVM_SW_REPORT) {
        // build.py reads VERSION and the count from here (one line of JSON)
        process.stdout.write(`lvm-sw ${JSON.stringify({ version, precached: entries.length })}\n`);
      }
      return { code: filled, map: null };
    },
  };
}
