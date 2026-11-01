/* First-load byte budget (openspec change react-typescript, performance-budget spec, tasks 0.4 and 1.8; openspec change
   render-performance, design D2, tasks 2.1 and 2.3 on the Legacy game).

   Measures the Brotli-compressed size of everything a first visit to the game requests before the first tap, read
   from a build (python3 build.py --out <dir>): the page itself, every file it links or loads, the module graph its
   entry imports statically, every file the service worker's install downloads (PRECACHE in the built sw.js, counted
   even when install ends after the tap) and sw.js itself, each unique file once. Phase 1 measures today's /play/,
   whose import map pins every module; from task 2.7 the first-load set comes from the client build's manifest.

   Within it, "before play" is what the page itself requests before the first tap, without the install's downloads
   (render-performance, "What counts as before play"): its JS (the page's scripts and the entry's static module graph)
   and its CSS (the page's stylesheets), and, for each landing or grown-up page, that page's JS. The owner's budgets
   (M5: 150 KB of JS before play, 40 KB of CSS, 15 KB of JS on a landing or grown-up page) are in docs/perf/baseline.json
   under `budgets`, each with a `failing` flag: a line the start measurement already missed is printed as missed and
   does not fail the build until a pull request meets it and turns `failing` on (design D2, item 4).

   Usage:
     node tools/budget.ts [site]                       the table and the total (site defaults to _site)
     node tools/budget.ts [site] --check <baseline>    also fails when the total is above the baseline's, or a
                                                       failing budget is over
     node tools/budget.ts [site] --json <file>         writes { total, files, beforePlay } for docs/perf/baseline.json

   Brotli at quality 11 on each file's bytes as published, so the number does not depend on a server's settings.
   Requests made after an idle timer (GoatCounter's count.js) and on a tap are not first load. */
import { readFileSync, writeFileSync, existsSync, statSync, realpathSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, posix, relative } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

export const PAGE = '/play/';
export const ENTRY = '/js/app.js';

/** What the page itself requests before the first tap: its JS and CSS in Brotli bytes, file by file, and each landing
    or grown-up page's JS */
export type BeforePlay = { js: number; css: number; jsFiles: Record<string, number>; cssFiles: Record<string, number>; pages: Record<string, number> };
export type Measure = { total: number; files: Record<string, number>; beforePlay: BeforePlay };
/** One of the owner's absolute budgets: the limit in bytes, and whether a miss fails the build yet (design D2, item 4) */
export type Budget = { limit: number; failing: boolean };
export type Budgets = { jsBeforePlay?: Budget; cssBeforePlay?: Budget; sitePageJs?: Budget };
export type Baseline = { firstLoad: { total: number; files: Record<string, number> }; budgets?: Budgets };

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

/** The same-origin scripts and stylesheets a page loads, without query strings (its canonical link aside) */
function linked(html: string): { scripts: string[]; styles: string[] } {
  const scripts: string[] = [], styles: string[] = [];
  for (const m of html.matchAll(/<(script|link)\b[^>]*?\b(?:src|href)="(\/[^"]*)"[^>]*>/g)) {
    const tag = m[0];
    if (/\brel="canonical"/.test(tag) || !m[2]) continue;
    const url = bare(m[2]);
    if (m[1] === 'script' && url.endsWith('.js')) scripts.push(url);
    else if (m[1] === 'link' && /\brel="stylesheet"/.test(tag)) styles.push(url);
  }
  return { scripts: [...new Set(scripts)], styles: [...new Set(styles)] };
}

/** The static module graph from an entry (dynamic imports wait for a tap or a route) */
function graphOf(site: string, entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  for (let url = queue.pop(); url !== undefined; url = queue.pop()) {
    if (seen.has(url)) continue;
    seen.add(url);
    const src = readFileSync(fileOf(site, url), 'utf8');
    for (const m of src.matchAll(STATIC_IMPORT)) {
      const spec = m[1] || m[2];
      if (!spec || /^[a-z]+:/i.test(spec)) continue;
      const next = spec.startsWith('/') ? spec : posix.normalize(posix.join(posix.dirname(url), spec));
      if (!seen.has(next)) queue.push(next);
    }
  }
  return [...seen];
}

/** Every URL the first visit requests, by what asks for it: the page's own links and loads, the entry's static module
    graph, and the service worker's install downloads (the fonts the CSS names are in it) */
export function firstLoadSets(site: string): { page: string[]; graph: string[]; precache: string[] } {
  const html = readFileSync(fileOf(site, PAGE), 'utf8');
  const page = new Set<string>([PAGE, '/sw.js']);
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="(\/[^"]*)"[^>]*>/g)) {
    if (/\brel="canonical"/.test(m[0])) continue;
    if (m[1]) page.add(bare(m[1]));
  }
  const sw = readFileSync(join(site, 'sw.js'), 'utf8');
  const block = sw.match(/const PRECACHE = (\[[\s\S]*?\]);\n/);
  if (!block?.[1]) throw new Error(`${site}/sw.js: no PRECACHE list (build it with python3 build.py, not --dev)`);
  const precache = (JSON.parse(block[1]) as [string, string][]).map(([url]) => bare(url));
  return { page: [...page], graph: graphOf(site, ENTRY), precache };
}

/** Every URL a first visit to the page requests before the first tap, without query strings, sorted */
export function firstLoadUrls(site: string): string[] {
  const { page, graph, precache } = firstLoadSets(site);
  return [...new Set([...page, ...graph, ...precache])].sort();
}

/** The landing and grown-up pages of a build: every index.html and 404.html outside the game, as URLs */
export function sitePages(site: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { if (!name.startsWith('.') && !name.startsWith('_') && posix.join(relative(site, p)) !== 'play') walk(p); }
      else if (name === 'index.html' || name === '404.html') {
        const rel = relative(site, p).split('\\').join('/');
        out.push('/' + (rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : rel));
      }
    }
  };
  walk(site);
  return out.filter(u => !u.startsWith(PAGE)).sort();
}

export function measure(site: string): Measure {
  const size = (url: string): number => {
    const file = fileOf(site, url);
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`${url}: requested on first load but not in ${site}`);
    return brotli(readFileSync(file));
  };
  const files: Record<string, number> = {};
  let total = 0;
  for (const url of firstLoadUrls(site)) {
    const n = size(url);
    files[url] = n;
    total += n;
  }
  /* Before play: the page's scripts and the entry's static graph, and the page's stylesheets */
  const { scripts, styles } = linked(readFileSync(fileOf(site, PAGE), 'utf8'));
  const jsFiles: Record<string, number> = {}, cssFiles: Record<string, number> = {};
  for (const url of new Set([...scripts, ...graphOf(site, ENTRY)])) jsFiles[url] = files[url] ?? size(url);
  for (const url of styles) cssFiles[url] = files[url] ?? size(url);
  const pages: Record<string, number> = {};
  for (const url of sitePages(site)) {
    const page = linked(readFileSync(fileOf(site, url), 'utf8'));
    pages[url] = page.scripts.reduce((sum, u) => sum + size(u), 0);
  }
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  return { total, files, beforePlay: { js: sum(jsFiles), css: sum(cssFiles), jsFiles, cssFiles, pages } };
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

/** The owner's budgets as lines: the measurement, the limit, and whether it is within, missed (reported, not failing
    yet) or over (failing). Each line names what it measures and, for a miss, the largest file. */
export function budgetLines(m: Measure, budgets: Budgets = {}): { line: string; over: boolean; failing: boolean; error: string }[] {
  const largest = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const one = (what: string, n: number, files: Record<string, number> | null, b: Budget | undefined, unit: string) => {
    const count = files ? ` in ${Object.keys(files).length} ${unit}` : '';
    if (!b) return { line: `  ${kb(n).padStart(9)}  ${what}${count} (no budget recorded)`, over: false, failing: false, error: '' };
    const over = n > b.limit;
    const top = files ? largest(files) : undefined;
    const state = !over ? 'within' : b.failing ? `over by ${n - b.limit} bytes` : 'missed: reported until a pull request meets it (docs/perf/baseline.json budgets)';
    const line = `  ${kb(n).padStart(9)}  ${what}${count}; budget ${kb(b.limit)}, ${state}`;
    const error = over && b.failing ? `${what} budget: ${n} bytes Brotli is over ${b.limit} bytes (docs/perf/baseline.json budgets)${top ? `; largest file: ${top[0]} (${top[1]} bytes)` : ''}` : '';
    return { line, over, failing: b.failing, error };
  };
  const out = [
    one('JS before play', m.beforePlay.js, m.beforePlay.jsFiles, budgets.jsBeforePlay, 'files'),
    one('CSS before play', m.beforePlay.css, m.beforePlay.cssFiles, budgets.cssBeforePlay, 'files'),
  ];
  const largestPage = Object.entries(m.beforePlay.pages).sort((a, b) => b[1] - a[1])[0];
  if (largestPage) {
    const [url, n] = largestPage;
    const r = one(`JS on a landing or grown-up page, the largest ${url}`, n, null, budgets.sitePageJs, '');
    out.push({ ...r, error: r.error ? `${r.error}; page ${url}` : '' });
  }
  return out;
}

/** The table printed on every run: the biggest files, the before-play lines, then the total against the limit */
export function table(m: Measure, limit?: number, budgets?: Budgets): string {
  const rows = Object.entries(m.files).sort((a, b) => b[1] - a[1]);
  const lines = rows.slice(0, 12).map(([u, n]) => `  ${kb(n).padStart(9)}  ${u}`);
  if (rows.length > 12) lines.push(`  ${''.padStart(9)}  ... and ${rows.length - 12} more files`);
  const head = `First load of ${PAGE} (Brotli, ${rows.length} files): ${m.total} bytes (${kb(m.total)})`;
  const before = ['  before play (what the page requests before the first tap, the install\'s downloads aside):', ...budgetLines(m, budgets).map(b => '  ' + b.line)];
  const tail = limit === undefined ? '' : `\n  budget: ${limit} bytes (${kb(limit)}), ${m.total <= limit ? 'within' : `over by ${m.total - limit} bytes`}`;
  return `${head}\n${lines.join('\n')}\n${before.join('\n')}${tail}`;
}

/** Why a measurement is over the baseline: the files that are new or grew, largest change first */
export function growth(m: Measure, base: Baseline['firstLoad']): [string, number][] {
  return Object.entries(m.files)
    .map(([u, n]): [string, number] => [u, n - (base.files[u] ?? 0)])
    .filter(([, d]) => d > 0)
    .sort((a, b) => b[1] - a[1]);
}

/** Every reason the build fails: the first-load total above the baseline's, and each failing budget that is over */
export function check(m: Measure, base: Baseline): string | null {
  const errors: string[] = [];
  const limit = base.firstLoad.total;
  if (m.total > limit) {
    const grew = growth(m, base.firstLoad);
    const top = grew[0];
    const what = top ? `; largest new or grown file: ${top[0]} (+${top[1]} bytes${base.firstLoad.files[top[0]] === undefined ? ', new' : ''})` : '';
    errors.push(`first-load budget: ${m.total} bytes Brotli is above the baseline's ${limit} bytes (docs/perf/baseline.json)${what}`);
  }
  for (const b of budgetLines(m, base.budgets)) if (b.error) errors.push(b.error);
  return errors.length ? errors.join('\n') : null;
}

/** The ratchet (render-performance design D2, item 2): a build under the baseline's total says so, so the pull request
    records the new ceiling; a budget met while still reported says so too, so the pull request turns it to failing */
export function ratchet(m: Measure, base: Baseline): string[] {
  const out: string[] = [];
  /* Not for a few bytes: a local build and CI's differ by one on /js/nav.js (docs/perf/baseline.md) */
  if (m.total < base.firstLoad.total - 64) out.push(`  ${base.firstLoad.total - m.total} bytes under the baseline's ${base.firstLoad.total}: a pull request that lowers first load records ${m.total} as firstLoad.total in docs/perf/baseline.json, with a changes entry saying why`);
  for (const b of budgetLines(m, base.budgets)) if (!b.over && !b.failing && /budget/.test(b.line) && !/no budget/.test(b.line)) out.push(`  met while still reported: ${b.line.trim()}; the pull request that meets it turns its failing flag on in docs/perf/baseline.json budgets`);
  return out;
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
  console.log(table(m, base?.firstLoad.total, base?.budgets));
  if (json) writeFileSync(json, JSON.stringify(m, null, 1) + '\n');
  if (base) {
    for (const note of ratchet(m, base)) console.log(note);
    const err = check(m, base);
    if (err) {
      for (const line of err.split('\n')) console.error(`::error::${line}`);
      process.exitCode = 1;
    }
  }
}

/* Run as a script, not imported by a test. Real paths: import.meta.url is resolved through symlinks and
   percent-encoded, process.argv[1] is neither (a temp directory under /var on macOS, a space in the path) */
const isMain = () => { try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); } catch { return false; } };
if (isMain()) main(process.argv.slice(2));
