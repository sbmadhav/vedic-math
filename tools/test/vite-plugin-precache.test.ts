/* tools/vite-plugin-precache.ts on fixture manifests (openspec change react-typescript, task 1.5): the walk from the
   entries, the 3D exclusion by reachability, the precache list with hashes, and the worker block in each mode. */
import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reach, assetEntries, fill, isThreeD, shortHash, listing, START, END, DEV_BLOCK, type Manifest } from '../vite-plugin-precache.ts';

const manifest = JSON.parse(readFileSync(new URL('./fixtures/precache/manifest.json', import.meta.url), 'utf8')) as Manifest & { '//'?: unknown };
delete manifest['//'];

test('a chunk the entry and a 3D scene both import is precached; a file only the 3D scene reaches is not', () => {
  const { precached, threeD } = reach(manifest);
  expect([...precached].sort()).toEqual(['assets/entry-a1.js', 'assets/entry-c3.css', 'assets/games-art-e5.svg', 'assets/games-d4.js', 'assets/shared-b2.js']);
  expect([...threeD].sort()).toEqual(['assets/sky-f6.js', 'assets/sky-g7.css', 'assets/three-h8.js']);
});

test('3D modules are the scenes, three.js and React Three Fiber, wherever pnpm puts them', () => {
  expect(isThreeD('app/src/scenes-3d/Sky.tsx')).toBe(true);
  expect(isThreeD('node_modules/three/build/three.module.js')).toBe(true);
  expect(isThreeD('node_modules/.pnpm/@react-three+fiber@9.0.0/node_modules/@react-three/fiber/dist/index.js')).toBe(true);
  expect(isThreeD('app/src/views/games/Games.tsx')).toBe(false);
  expect(isThreeD('node_modules/threeish/index.js')).toBe(false);
});

test('the precache entries are every built file but the 3D ones, each with the hash of its bytes', () => {
  const out = mkdtempSync(join(tmpdir(), 'lvm-precache-'));
  try {
    mkdirSync(join(out, 'assets'));
    const files = ['entry-a1.js', 'entry-c3.css', 'shared-b2.js', 'games-d4.js', 'games-art-e5.svg', 'sky-f6.js', 'sky-g7.css', 'three-h8.js'];
    for (const f of files) writeFileSync(join(out, 'assets', f), `/* ${f} */`);
    const entries = assetEntries(manifest, out, '/learn/');
    expect(entries.map(([u]) => u)).toEqual(['/learn/assets/entry-a1.js', '/learn/assets/entry-c3.css', '/learn/assets/games-art-e5.svg', '/learn/assets/games-d4.js', '/learn/assets/shared-b2.js']);
    for (const [u, hash] of entries) expect(hash).toBe(shortHash(`/* ${u.split('/').pop()} */`));
  } finally { rmSync(out, { recursive: true, force: true }); }
});

const SOURCE = `const KILL: boolean = false;\n${START}\n${DEV_BLOCK}\n${END}\nconst PREFIX: string = 'lvm-';\nconst VOICE_ORIGIN: string | null = 'https://voice.learnvedicmath.com'; // the voice host\n`;

test('site mode writes VERSION and PRECACHE; VERSION changes with the list and with the worker source', () => {
  const entries: [string, string][] = [['/play/', 'aaaaaaaaaa'], ['/js/app.js?v=bbbbbbbbbb', 'bbbbbbbbbb']];
  const { code, version } = fill(SOURCE, { mode: 'site', entries, voiceOff: false });
  expect(version).toMatch(/^[0-9a-f]{10}$/);
  expect(code).toContain(`${START}\nconst VERSION: string = '${version}';\nconst PRECACHE: [string, string][] = ${listing(entries)};\n${END}`);
  expect(code).toContain("const VOICE_ORIGIN: string | null = 'https://voice.learnvedicmath.com';");
  expect(fill(SOURCE, { mode: 'site', entries: entries.slice(1), voiceOff: false }).version).not.toBe(version);
  expect(fill(SOURCE + '// changed\n', { mode: 'site', entries, voiceOff: false }).version).not.toBe(version);
});

test('voice off leaves the voice host out; dev keeps the block; moved is the KILL worker with the old prefix', () => {
  expect(fill(SOURCE, { mode: 'site', entries: [], voiceOff: true }).code).toMatch(/^const VOICE_ORIGIN: string \| null = null;/m);
  expect(fill(SOURCE, { mode: 'dev', entries: [], voiceOff: false })).toEqual({ code: SOURCE, version: 'dev' });
  const moved = fill(SOURCE, { mode: 'moved', entries: [], voiceOff: false }).code;
  expect(moved).toMatch(/^const KILL: boolean = true;$/m);
  expect(moved).toMatch(/^const PREFIX: string = 'vedic-math-';$/m);
  expect(moved).toMatch(/^const PRECACHE: \[string, string\]\[\] = \[\];$/m);
});

test('a stamped source or missing markers fail', () => {
  expect(() => fill(SOURCE.replace("const VERSION: string = 'dev';", "const VERSION: string = 'abc';"), { mode: 'site', entries: [], voiceOff: false })).toThrow(/source must keep/);
  expect(() => fill(SOURCE.replace(START, ''), { mode: 'site', entries: [], voiceOff: false })).toThrow(/markers not found/);
});
