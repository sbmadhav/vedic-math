/* First-load byte budget (openspec change react-typescript, performance-budget spec, tasks 0.4 and 1.8).

   Measures the Brotli-compressed size of everything a first visit to the game requests before the first tap, read
   from a build (python3 build.py --out <dir>): the page itself, every file it links or loads, the module graph its
   entry imports statically, every file the service worker's install downloads (PRECACHE in the built sw.js, counted
   even when install ends after the tap) and sw.js itself, each unique file once. Phase 1 measures today's /play/,
   whose import map pins every module; from task 2.7 the first-load set comes from the client build's manifest.

   Usage:
     node tools/budget.ts [site]                       the table and the total (site defaults to _site)
     node tools/budget.ts [site] --check <baseline>    also fails when the total is above the baseline's
     node tools/budget.ts [site] --json <file>         writes { total, files } for docs/perf/baseline.json

   Brotli at quality 11 on each file's bytes as published, so the number does not depend on a server's settings.
   Requests made after an idle timer (GoatCounter's count.js) and on a tap are not first load. */
import { readFileSync, writeFileSync, existsSync, statSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, posix } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

export const PAGE = '/play/';
export const ENTRY = '/js/app.js';

export type Measure = { total: number; files: Record<string, number> };
export type Baseline = { firstLoad: Measure };

const STATIC_IMPORT = /(?:^|[;\n}])\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|[;\n}])\s*import\s*['"]([^'"]+)['"]/g;

/** The file a published URL is served from */
export function fileOf(site: string, url: string): string {
  const path = decodeURIComponent(new URL(url, 'https://x.invalid').pathname);
  const rel = path.endsWith('/') ? path + 'index.html' : path;
  return join(site, rel);
}

export const brotli = (buf: Uint8Array): number =>
  brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }).length;

/** Every URL a first visit to the page requests before the first tap, without query strings, sorted */
export function firstLoadUrls(site: string): string[] {
  const urls = new Set<string>([PAGE, '/sw.js']);
  const html = readFileSync(fileOf(site, PAGE), 'utf8');
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="(\/[^"]*)"[^>]*>/g)) {
    const tag = m[0];
    if (/\brel="canonical"/.test(tag)) continue;
    urls.add(m[1]!.split(/[?#]/)[0]!);
  }
  // The static module graph from the entry (dynamic imports wait for a tap or a route)
  const queue = [ENTRY];
  while (queue.length) {
    const url = queue.pop()!;
    if (urls.has(url) && url !== ENTRY) continue;
    urls.add(url);
    const src = readFileSync(fileOf(site, url), 'utf8');
    for (const m of src.matchAll(STATIC_IMPORT)) {
      const spec = (m[1] || m[2])!;
      if (/^[a-z]+:/i.test(spec)) continue;
      const next = spec.startsWith('/') ? spec : posix.normalize(posix.join(posix.dirname(url), spec));
      if (!urls.has(next)) queue.push(next);
    }
  }
  // CSS the page links: the files its url() names (fonts, pictures) are fetched when used; the precache has the fonts
  // The service worker's install downloads
  const sw = readFileSync(join(site, 'sw.js'), 'utf8');
  const block = sw.match(/const PRECACHE = (\[[\s\S]*?\]);\n/);
  if (!block) throw new Error(`${site}/sw.js: no PRECACHE list (build it with python3 build.py, not --dev)`);
  for (const [url] of JSON.parse(block[1]!) as [string, string][]) urls.add(url.split(/[?#]/)[0]!);
  return [...urls].sort();
}

export function measure(site: string): Measure {
  const files: Record<string, number> = {};
  let total = 0;
  for (const url of firstLoadUrls(site)) {
    const file = fileOf(site, url);
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`${url}: requested on first load but not in ${site}`);
    const n = brotli(readFileSync(file));
    files[url] = n;
    total += n;
  }
  return { total, files };
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

/** The table printed on every run: the biggest files, then the total against the limit */
export function table(m: Measure, limit?: number): string {
  const rows = Object.entries(m.files).sort((a, b) => b[1] - a[1]);
  const lines = rows.slice(0, 12).map(([u, n]) => `  ${kb(n).padStart(9)}  ${u}`);
  if (rows.length > 12) lines.push(`  ${''.padStart(9)}  ... and ${rows.length - 12} more files`);
  const head = `First load of ${PAGE} (Brotli, ${rows.length} files): ${m.total} bytes (${kb(m.total)})`;
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
  const site = args[0] || '_site';
  const m = measure(site);
  const base = baseline ? (JSON.parse(readFileSync(baseline, 'utf8')) as Baseline) : undefined;
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
