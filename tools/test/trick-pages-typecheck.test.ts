/* The Trick pages' TypeScript is type checked with the DOM types (openspec change trick-pages, task 2.1): a browser
   module in tools/trick-pages/ that misuses a DOM type fails `pnpm typecheck`. The fixture is checked with the same
   tsconfig as calculator.ts, copied beside it, so the paths mapping for /js/ imports and the DOM lib apply. */
import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TSC = join(ROOT, 'node_modules/.bin/tsc');

/* A copy of tools/trick-pages/ in a scratch folder under tools/ (so ../../tsconfig.base.json, ../../shared/src and the
   node types resolve as they do for the real folder), plus one fixture */
function checkWith(fixture: string) {
  const dir = mkdtempSync(join(ROOT, 'tools', '_tp-'));
  try {
    cpSync(join(ROOT, 'tools/trick-pages'), dir, { recursive: true });
    writeFileSync(join(dir, 'fixture.ts'), fixture);
    const r = spawnSync(TSC, ['-p', join(dir, 'tsconfig.json')], { encoding: 'utf8' });
    return { status: r.status, out: r.stdout + r.stderr };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('a DOM type error in a Trick page module fails the type check', () => {
  const r = checkWith(`const el: HTMLElement | null = document.getElementById('tkCalc');\nexport const bad: string = el?.nosuchProperty ?? '';\n`);
  expect(r.status).not.toBe(0);
  expect(r.out).toMatch(/fixture\.ts.*nosuchProperty/);
}, 120_000);

test('the real modules pass, and a module may import the catalog as .ts and js/life.js by its URL', () => {
  const r = checkWith(`import { TRICKS } from '../../shared/src/vedic.ts';\nimport { on } from '/js/life.js';\nexport const n: number = TRICKS.length;\non(window, 'load', () => {}, new AbortController().signal);\n`);
  expect(r.out).toBe('');
  expect(r.status).toBe(0);
  expect(readFileSync(join(ROOT, 'tools/package.json'), 'utf8')).toContain('tsc -p trick-pages/tsconfig.json');
}, 120_000);
