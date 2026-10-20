/* Lighthouse load timings of the game (openspec change react-typescript, performance-budget spec, task 0.4; the
   preview gate of task 1.8 reads the same pages and settings from tools/lighthouserc.json).

   Run from e2e/: node perf/lighthouse.mts [base URL] [--runs N] [--json <file>]
   (base URL defaults to BASE_URL or https://learnvedicmath.com; Node 22.19 or newer runs the TypeScript as it is).

   Lighthouse's mobile preset (its default): simulated slow 4G, 4x CPU slowdown, a Moto G Power sized screen,
   performance only, the median of each metric over N runs (5). Chromium is Playwright's, so no other browser install
   is needed. Each run gets a fresh profile, so its HTTP cache, service worker and storage are empty, except:
   - "returning": a Player with a saved Mode (the e2e fixtures' Challenger Player), so a route draws its own screen
     instead of the first-visit Mode picker. Storage is seeded on robots.txt, so no game file is cached.
   - "repeat": a returning Player whose earlier visit finished and whose service worker took control: one unmeasured
     visit, wait for the worker to be active, then each measured run in the same profile.
   Analytics never counts a run: GoatCounter and Cloudflare Web Analytics are blocked by URL pattern. */
import lighthouse from 'lighthouse';
import { chromium, type BrowserContext } from '@playwright/test';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const HERE = dirname(fileURLToPath(import.meta.url));
const RC = JSON.parse(readFileSync(join(HERE, '..', '..', 'tools', 'lighthouserc.json'), 'utf8')) as {
  ci: { collect: { numberOfRuns: number; settings: Record<string, unknown> } };
  pages: { name: string; path: string; visit: 'first' | 'returning' | 'repeat' }[];
};

export type Metrics = { fcp: number; lcp: number; tbt: number; cls: number; si: number; ttfb: number };
export const METRICS: (keyof Metrics)[] = ['fcp', 'lcp', 'tbt', 'cls', 'si', 'ttfb'];
const AUDIT: Record<keyof Metrics, string> = {
  fcp: 'first-contentful-paint', lcp: 'largest-contentful-paint', tbt: 'total-blocking-time',
  cls: 'cumulative-layout-shift', si: 'speed-index', ttfb: 'server-response-time',
};

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

const PLAYER = JSON.stringify({ active: 'p1', list: [{ id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode: 'challenger', created: 1760000000000 }] });

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, () => { const a = s.address(); s.close(() => (a && typeof a === 'object' ? resolve(a.port) : reject(new Error('no port')))); });
  });
}

/* A fresh profile with its DevTools port open for Lighthouse. A port picked free can be taken by another program before
   Chromium binds it, so the port is checked and the launch tried again on another one. */
async function browser(): Promise<{ ctx: BrowserContext; port: number; dir: string }> {
  for (let attempt = 1; ; attempt++) {
    const dir = mkdtempSync(join(tmpdir(), 'lvm-lh-'));
    const port = await freePort();
    const ctx = await chromium.launchPersistentContext(dir, { channel: 'chromium', headless: true, args: [`--remote-debugging-port=${port}`] });
    const ok = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.ok && r.json()).then(v => !!(v && v.webSocketDebuggerUrl), () => false);
    if (ok) return { ctx, port, dir };
    await ctx.close();
    rmSync(dir, { recursive: true, force: true });
    if (attempt === 3) throw new Error(`Chromium's DevTools port did not answer after ${attempt} launches`);
  }
}

async function seedPlayer(ctx: BrowserContext, base: string) {
  const page = await ctx.newPage();
  await page.goto(`${base}/robots.txt`);
  await page.evaluate(p => { localStorage.setItem('vm.players', p); localStorage.setItem('vm.sound', '0'); localStorage.setItem('vm.tour', 'done'); }, PLAYER);
  await page.close();
}

async function workerReady(ctx: BrowserContext, base: string) {
  const page = await ctx.newPage();
  await page.goto(`${base}/play/`);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 60_000 }).catch(() => {});
  await page.close();
}

async function once(url: string, port: number, keepStorage: boolean): Promise<Metrics> {
  const flags = {
    port, output: 'json' as const, logLevel: 'error' as const, onlyCategories: ['performance'],
    disableStorageReset: keepStorage, blockedUrlPatterns: ['*goatcounter.com*', '*gc.zgo.at*', '*/vendor/goatcounter/count.js*', '*cloudflareinsights.com*'],
    ...RC.ci.collect.settings,
  };
  const res = await lighthouse(url, flags as Parameters<typeof lighthouse>[1]);
  if (!res) throw new Error(`${url}: Lighthouse returned nothing`);
  const lhr = res.lhr;
  if (lhr.runtimeError) throw new Error(`${url}: ${lhr.runtimeError.code} ${lhr.runtimeError.message}`);
  const out = {} as Metrics;
  for (const k of METRICS) {
    const v = lhr.audits[AUDIT[k]]?.numericValue;
    if (typeof v !== 'number') throw new Error(`${url}: no ${AUDIT[k]} in the report`);
    out[k] = v;
  }
  return out;
}

export async function page(base: string, path: string, visit: 'first' | 'returning' | 'repeat', runs: number): Promise<Metrics[]> {
  const url = base + path;
  const all: Metrics[] = [];
  if (visit === 'repeat') {
    const b = await browser();
    try {
      await seedPlayer(b.ctx, base);
      await workerReady(b.ctx, base);
      await once(url, b.port, true); // warm-up, not measured
      for (let i = 0; i < runs; i++) all.push(await once(url, b.port, true));
    } finally { await b.ctx.close(); rmSync(b.dir, { recursive: true, force: true }); }
    return all;
  }
  for (let i = 0; i < runs; i++) {
    const b = await browser();
    try {
      if (visit === 'returning') await seedPlayer(b.ctx, base);
      all.push(await once(url, b.port, visit === 'returning'));
    } finally { await b.ctx.close(); rmSync(b.dir, { recursive: true, force: true }); }
  }
  return all;
}

const round = (k: keyof Metrics, v: number) => (k === 'cls' ? Math.round(v * 1000) / 1000 : Math.round(v));

async function main(argv: string[]) {
  const args = [...argv];
  const opt = (name: string) => { const i = args.indexOf(name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
  const runs = Number(opt('--runs') || RC.ci.collect.numberOfRuns);
  const json = opt('--json');
  const base = (args[0] || process.env.BASE_URL || 'https://learnvedicmath.com').replace(/\/$/, '');
  const result: Record<string, { path: string; visit: string; median: Metrics; runs: Metrics[] }> = {};
  for (const p of RC.pages) {
    const all = await page(base, p.path, p.visit, runs);
    const med = {} as Metrics;
    for (const k of METRICS) med[k] = round(k, median(all.map(r => r[k])));
    result[p.name] = { path: p.path, visit: p.visit, median: med, runs: all };
    console.log(`${p.name.padEnd(16)} ${p.visit.padEnd(9)} ${METRICS.map(k => `${k} ${med[k]}`).join('  ')}`);
  }
  const out = { base, date: new Date().toISOString(), runs, lighthouse: (await import('lighthouse/package.json', { with: { type: 'json' } })).default.version, pages: result };
  if (json) writeFileSync(json, JSON.stringify(out, null, 1) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv.slice(2));
