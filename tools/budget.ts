/* First-load byte budget (openspec change react-typescript, performance-budget spec, tasks 0.4 and 1.8).

   Measures the Brotli-compressed size of everything a first visit to the game requests before the first tap, read
   from a build (python3 build.py --out <dir>): the page itself, every file it links or loads, the module graph its
   entry imports statically, every file the service worker's install downloads (PRECACHE in the built sw.js, counted
   even when install ends after the tap) and sw.js itself, each unique file once. Phase 1 measures today's /play/,
   whose import map pins every module; from task 2.7 the first-load set comes from the client build's manifest.

   The Trick pages (openspec change trick-pages, design D7) are measured one page at a time with --page: the page, every
   file it links or loads, and the static module graph of its module scripts (no worker, no precache), against
   trickPage.max in the baseline.

   Usage:
     node tools/budget.ts [site]                       the table and the total (site defaults to _site)
     node tools/budget.ts [site] --check <baseline>    also fails when the total is above the baseline's
     node tools/budget.ts [site] --json <file>         writes { total, files } for docs/perf/baseline.json
     node tools/budget.ts [site] --page <path> [--page <path>...] [--check <baseline>] [--json <file>]
                                                       one or more pages instead of the game's first load: a line per
                                                       page and the largest page's table; --check fails a page above
                                                       trickPage.max; --json writes the largest page's measure

   Brotli at quality 11 on each file's bytes as published, so the number does not depend on a server's settings.
   Requests made after an idle timer (GoatCounter's count.js) and on a tap are not first load. */
import { readFileSync, writeFileSync, existsSync, statSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, posix } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

export const PAGE = '/play/';
export const ENTRY = '/js/app.js';

export type Measure = { total: number; files: Record<string, number> };
export type Baseline = { firstLoad: Measure; trickPage?: { max: number } };

const STATIC_IMPORT = /(?:^|[;\n}])\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|[;\n}])\s*import\s*['"]([^'"]+)['"]/g;

/** A URL without its query string or fragment */
const bare = (url: string): string => url.replace(/[?#].*$/, '');

/** The file a published URL is served from */
export function fileOf(site: string, url: string): string {
  const path = decodeURIComponent(new URL(url, 'https://x.invalid').pathname);
  const rel = path.endsWith('/') ? path + 'index.html' : path;
  return join(site, rel);
}

export const brotli = (buf: Uint8Array): number =>
  brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }).length;

/** The page and every same-origin file its <script> and <link> tags name (the canonical link aside) */
function linked(site: string, page: string): Set<string> {
  const urls = new Set<string>([page]);
  const html = readFileSync(fileOf(site, page), 'utf8');
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="(\/[^"]*)"[^>]*>/g)) {
    const tag = m[0];
    if (/\brel="canonical"/.test(tag)) continue;
    if (m[1]) urls.add(bare(m[1]));
  }
  return urls;
}

/** Adds the static module graph of the entries (dynamic imports wait for a tap or a route) */
function addGraph(site: string, entries: string[], urls: Set<string>): void {
  const queue = [...entries];
  const walked = new Set<string>();
  for (let url = queue.pop(); url !== undefined; url = queue.pop()) {
    if (walked.has(url)) continue;
    walked.add(url);
    urls.add(url);
    const src = readFileSync(fileOf(site, url), 'utf8');
    for (const m of src.matchAll(STATIC_IMPORT)) {
      const spec = m[1] || m[2];
      if (!spec || /^[a-z]+:/i.test(spec)) continue;
      const next = bare(spec.startsWith('/') ? spec : posix.normalize(posix.join(posix.dirname(url), spec)));
      if (!walked.has(next)) queue.push(next);
    }
  }
}

/** Every URL a first visit to the game requests before the first tap, without query strings, sorted */
export function firstLoadUrls(site: string): string[] {
  const urls = linked(site, PAGE);
  urls.add('/sw.js');
  addGraph(site, [ENTRY], urls);
  // The service worker's install downloads (the fonts the CSS names are in it)
  const sw = readFileSync(join(site, 'sw.js'), 'utf8');
  const block = sw.match(/const PRECACHE = (\[[\s\S]*?\]);\n/);
  if (!block?.[1]) throw new Error(`${site}/sw.js: no PRECACHE list (build it with python3 build.py, not --dev)`);
  for (const [url] of JSON.parse(block[1]) as [string, string][]) urls.add(bare(url));
  return [...urls].sort();
}

/** Every URL a first visit to one page outside the game requests: the page, what it links, and the static module
    graph of its module scripts (a src, or the imports of an inline module), without query strings, sorted */
export function pageUrls(site: string, page: string): string[] {
  const urls = linked(site, page);
  const html = readFileSync(fileOf(site, page), 'utf8');
  const entries: string[] = [];
  for (const m of html.matchAll(/<script type="module" src="(\/[^"]*)"/g)) if (m[1]) entries.push(bare(m[1]));
  for (const m of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    for (const s of (m[1] ?? '').matchAll(STATIC_IMPORT)) {
      const spec = s[1] || s[2];
      if (spec?.startsWith('/')) entries.push(bare(spec));
    }
  }
  addGraph(site, entries, urls);
  return [...urls].sort();
}

const sizes = new Map<string, number>();
function sizeOf(site: string, url: string): number {
  const file = fileOf(site, url);
  const known = sizes.get(file);
  if (known !== undefined) return known;
  if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`${url}: requested on first load but not in ${site}`);
  const n = brotli(readFileSync(file));
  sizes.set(file, n);
  return n;
}

function measureUrls(site: string, urls: string[]): Measure {
  const files: Record<string, number> = {};
  let total = 0;
  for (const url of urls) {
    const n = sizeOf(site, url);
    files[url] = n;
    total += n;
  }
  return { total, files };
}

export const measure = (site: string): Measure => measureUrls(site, firstLoadUrls(site));
export const measurePage = (site: string, page: string): Measure => measureUrls(site, pageUrls(site, page));

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

/** The table printed on every run: the biggest files, then the total against the limit */
export function table(m: Measure, limit?: number, page = PAGE): string {
  const rows = Object.entries(m.files).sort((a, b) => b[1] - a[1]);
  const lines = rows.slice(0, 12).map(([u, n]) => `  ${kb(n).padStart(9)}  ${u}`);
  if (rows.length > 12) lines.push(`  ${''.padStart(9)}  ... and ${rows.length - 12} more files`);
  const head = `First load of ${page} (Brotli, ${rows.length} files): ${m.total} bytes (${kb(m.total)})`;
  const tail = limit === undefined ? '' : `\n  budget: ${limit} bytes (${kb(limit)}), ${m.total <= limit ? 'within' : `over by ${m.total - limit} bytes`}`;
  return `${head}\n${lines.join('\n')}${tail}`;
}

/** Why a measurement is over the baseline: the files that are new or grew, largest change first */
export function growth(m: Measure, base: Measure): [string, number][] {
  return Object.entries(m.files)
    .map(([u, n]): [string, number] => [u, n - (base.files[u] ?? 0)])
    .filter(([, d]) => d > 0)
    .sort((a, b) => b[1] - a[1]);
}

export function check(m: Measure, base: Baseline): string | null {
  const limit = base.firstLoad.total;
  if (m.total <= limit) return null;
  const grew = growth(m, base.firstLoad);
  const top = grew[0];
  const what = top ? `; largest new or grown file: ${top[0]} (+${top[1]} bytes${base.firstLoad.files[top[0]] === undefined ? ', new' : ''})` : '';
  return `first-load budget: ${m.total} bytes Brotli is above the baseline's ${limit} bytes (docs/perf/baseline.json)${what}`;
}

/** A page against trickPage.max (openspec change trick-pages, design D7); null within it or when the baseline has none */
export function checkPage(page: string, m: Measure, base: Baseline): string | null {
  const limit = base.trickPage?.max;
  if (limit === undefined || m.total <= limit) return null;
  const top = Object.entries(m.files).sort((a, b) => b[1] - a[1])[0];
  return `Trick page budget: ${page} is ${m.total} bytes Brotli, above trickPage.max ${limit} bytes (docs/perf/baseline.json)${top ? `; largest file: ${top[0]} (${top[1]} bytes)` : ''}`;
}

function main(argv: string[]) {
  const args = [...argv];
  const opt = (name: string) => {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    const v = args[i + 1];
    args.splice(i, 2);
    return v;
  };
  const baseline = opt('--check');
  const json = opt('--json');
  const pages: string[] = [];
  for (let p = opt('--page'); p !== undefined; p = opt('--page')) pages.push(p);
  const site = args[0] || '_site';
  const base = baseline ? (JSON.parse(readFileSync(baseline, 'utf8')) as Baseline) : undefined;
  if (pages.length) {
    const measured = pages.map(p => [p, measurePage(site, p)] as const).sort((a, b) => b[1].total - a[1].total);
    const [largest, m] = measured[0] as (typeof measured)[number];
    console.log(table(m, base?.trickPage?.max, largest));
    for (const [p, mp] of measured.slice(1)) console.log(`  ${kb(mp.total).padStart(9)}  ${p} (${Object.keys(mp.files).length} files, ${mp.total} bytes)`);
    if (json) writeFileSync(json, JSON.stringify(m, null, 1) + '\n');
    if (base) {
      if (base.trickPage === undefined) console.log(`  trick pages not checked: ${baseline} has no trickPage.max`);
      for (const [p, mp] of measured) {
        const err = checkPage(p, mp, base);
        if (err) {
          console.error(`::error::${err}`);
          process.exitCode = 1;
        }
      }
    }
    return;
  }
  const m = measure(site);
  console.log(table(m, base?.firstLoad.total));
  if (json) writeFileSync(json, JSON.stringify(m, null, 1) + '\n');
  if (base) {
    const err = check(m, base);
    if (err) {
      console.error(`::error::${err}`);
      process.exitCode = 1;
    }
  }
}

/* Run as a script, not imported by a test. Real paths: import.meta.url is resolved through symlinks and
   percent-encoded, process.argv[1] is neither (a temp directory under /var on macOS, a space in the path) */
const isMain = () => { try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); } catch { return false; } };
if (isMain()) main(process.argv.slice(2));
