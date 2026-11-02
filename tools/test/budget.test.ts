/* The byte budgets before play (openspec change render-performance, design D2, tasks 2.1 and 2.3, on the Legacy game):
   tools/budget.ts measures, from a build, the JS and CSS the game page itself requests before the first tap and each
   landing or grown-up page's JS, prints them with the owner's limits, fails a failing budget that is over (naming the
   budget, the size and the largest file or the page), reports a missed one that is not failing yet, and prints the
   ratchet lines. On a small fixture site, so the test needs no build. The real build's table is covered by
   test/build.test.mjs. */
import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { measure, beforePlay, beforePlayTable, checkBudgets, check, ratchet, brotli, type Baseline } from '../budget.ts';

/* A build with the game page, two modules on its static graph, a lazy module, a stylesheet, the worker and two site pages */
function site(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'lvm-budget-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  return dir;
}
const filler = (n: number) => `/* ${'x'.repeat(n)} ${Array.from({ length: n / 4 }, (_, i) => `v${i}:${(i * 7919) % 1000}`).join(',')} */\n`;
const FIXTURE = {
  'play/index.html': '<!doctype html><html><head><link rel="canonical" href="/play/"><link rel="stylesheet" href="/math.css?v=1"><link rel="preload" href="/fonts/a.woff2" as="font"></head>'
    + '<body><script type="module" src="/js/app.js?v=1"></script><script src="/js/analytics.js?v=1" defer></script></body></html>',
  'js/app.js': `import './a.js';\nconst late = () => import('./lazy.js');\n${filler(400)}`,
  'js/a.js': `export const a = 1;\n${filler(200)}`,
  'js/lazy.js': `export const lazy = 1;\n${filler(3000)}`,
  'js/analytics.js': `console.log(1);\n${filler(100)}`,
  'math.css': `body { margin: 0 }\n${filler(300)}`,
  'fonts/a.woff2': 'font bytes',
  'sw.js': 'const PRECACHE = [\n ["/play/", "aa"],\n ["/js/app.js?v=1", "bb"],\n ["/js/a.js?v=1", "cc"],\n ["/js/analytics.js?v=1", "dd"],\n ["/math.css?v=1", "ee"],\n ["/fonts/a.woff2", "ff"]\n];\nconst LAZY = [\n "/js/lazy.js?v=1"\n];\n',
  'index.html': '<!doctype html><html><head><link rel="stylesheet" href="/math.css?v=1"></head><body><script src="/js/analytics.js?v=1" defer></script></body></html>',
  'parents/index.html': `<!doctype html><html><head></head><body><script src="/js/analytics.js?v=1" defer></script><script src="/js/lazy.js?v=1"></script></body></html>`,
  '404.html': '<!doctype html><html><body>lost</body></html>',
};

test('before play is the page\'s scripts and the static graph, and the page\'s stylesheets; the install\'s downloads and a dynamic import are not', () => {
  const dir = site(FIXTURE);
  try {
    const m = { ...measure(dir), beforePlay: beforePlay(dir) };
    expect(Object.keys(m.beforePlay.jsFiles).sort()).toEqual(['/js/a.js', '/js/analytics.js', '/js/app.js']);
    expect(Object.keys(m.beforePlay.cssFiles)).toEqual(['/math.css']);
    expect(m.beforePlay.js).toBe(m.files['/js/app.js']! + m.files['/js/a.js']! + m.files['/js/analytics.js']!);
    expect(m.beforePlay.css).toBe(m.files['/math.css']);
    expect(m.files['/fonts/a.woff2']).toBeDefined(); // in the first load (the install downloads it) but not before play
    expect(m.files['/js/lazy.js']).toBeUndefined(); // a dynamic import: neither
    /* Each landing or grown-up page's JS, the 404 page included */
    expect(Object.keys(m.beforePlay.pages).sort()).toEqual(['/', '/404.html', '/parents/']);
    expect(m.beforePlay.pages['/']).toBe(brotli(Buffer.from(FIXTURE['js/analytics.js'])));
    expect(m.beforePlay.pages['/parents/']).toBeGreaterThan(m.beforePlay.pages['/']!);
    expect(m.beforePlay.pages['/404.html']).toBe(0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a failing budget that is over fails, naming the budget, the size and the largest file or the page; a missed one is reported', () => {
  const dir = site(FIXTURE);
  try {
    const m = { ...measure(dir), beforePlay: beforePlay(dir) };
    const roomy: Baseline = { firstLoad: { total: 1e9, files: {} } };
    expect(checkBudgets(m.beforePlay, roomy)).toBeNull();
    expect(beforePlayTable(m.beforePlay)).toMatch(/JS before play in 3 files \(no budget recorded\)/);
    const tight: Baseline = { firstLoad: { total: 1e9, files: {} }, budgets: {
      jsBeforePlay: { limit: m.beforePlay.js - 1, failing: true },
      cssBeforePlay: { limit: m.beforePlay.css - 1, failing: false },
      sitePageJs: { limit: m.beforePlay.pages['/parents/']! - 1, failing: true },
    } };
    const err = checkBudgets(m.beforePlay, tight)!;
    expect(err).toMatch(new RegExp(`JS before play budget: ${m.beforePlay.js} bytes Brotli is over ${m.beforePlay.js - 1} bytes .*largest file: /js/app.js \\(${m.files['/js/app.js']} bytes\\)`));
    expect(err).toMatch(/JS on a landing or grown-up page, the largest \/parents\/ budget: \d+ bytes Brotli is over \d+ bytes .*; page \/parents\//);
    expect(err).not.toMatch(/CSS before play budget/);
    const t = beforePlayTable(m.beforePlay, tight.budgets);
    expect(t).toMatch(/JS before play in 3 files; budget [\d.]+ KB, over by 1 bytes/);
    expect(t).toMatch(/CSS before play in 1 files; budget [\d.]+ KB, missed: reported until a pull request meets it/);
    expect(t).toMatch(/the largest \/parents\/; budget [\d.]+ KB, over by 1 bytes/);
    /* Within every budget: nothing fails, every line says within */
    const within: Baseline = { firstLoad: { total: 1e9, files: {} }, budgets: { jsBeforePlay: { limit: 153600, failing: true }, cssBeforePlay: { limit: 40960, failing: true }, sitePageJs: { limit: 15360, failing: true } } };
    expect(checkBudgets(m.beforePlay, within)).toBeNull();
    expect(beforePlayTable(m.beforePlay, within.budgets).match(/ KB, within/g)).toHaveLength(3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the ratchet: a total well under the baseline, or a reported budget now met, prints the line to record', () => {
  const dir = site(FIXTURE);
  try {
    const bp = beforePlay(dir);
    const m = { ...measure(dir), beforePlay: bp };
    const base: Baseline = { firstLoad: { total: m.total + 1000, files: {} }, budgets: { jsBeforePlay: { limit: m.beforePlay.js + 1, failing: false }, cssBeforePlay: { limit: m.beforePlay.css, failing: true } } };
    const notes = ratchet(m, bp, base);
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatch(new RegExp(`1000 bytes under the baseline's ${m.total + 1000}: .*records ${m.total} as firstLoad.total`));
    expect(notes[1]).toMatch(/met while still reported: .*JS before play.*turns its failing flag on/);
    /* A byte or two under (a local build against CI's figure) is not a ratchet; a budget already failing says nothing */
    expect(ratchet(m, bp, { firstLoad: { total: m.total + 1, files: {} }, budgets: { cssBeforePlay: { limit: m.beforePlay.css, failing: true } } })).toEqual([]);
    /* Over the baseline: check fails, the ratchet is quiet */
    expect(ratchet(m, bp, { firstLoad: { total: m.total - 1, files: {} } })).toEqual([]);
    expect(check(m, { firstLoad: { total: m.total - 1, files: {} } })).toMatch(/first-load budget: \d+ bytes Brotli is above the baseline's/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
