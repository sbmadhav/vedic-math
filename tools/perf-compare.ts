/* The load and interaction gate (openspec change react-typescript, performance-budget spec "Load and interaction times
   do not regress", task 1.8). Compares a run of e2e/perf/lighthouse.mts and e2e/perf/interactions.ts with the
   baseline in docs/perf/baseline.json, prints a Markdown table with both numbers, and fails beyond the tolerances:
   first or largest contentful paint more than 100 ms slower, total blocking time more than 25 ms longer, layout shift
   above the larger of the baseline and 0.1, any interaction timing more than 20 ms slower.

   Usage: node tools/perf-compare.ts <baseline.json> <lighthouse.json> <interactions.json> [--out table.md]
   Exit code 1 when a median misses its tolerance. Time to first byte and Speed Index are shown for information. */
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Lh = { fcp: number; lcp: number; tbt: number; cls: number; si: number; ttfb: number };
export type Ix = { inp: number; visible: number };
export type PerfBaseline = {
  lighthouse: { pages: Record<string, { path: string; visit: string; median: Lh }> };
  interactions: { interactions: Record<string, Ix> };
};
export type Row = { what: string; metric: string; base: number; now: number; limit: number | null; ok: boolean };

/* The tolerance of each gated metric: the largest value that still passes, given the baseline's */
export const LIMITS: Partial<Record<keyof Lh | keyof Ix, (base: number) => number>> = {
  fcp: b => b + 100,
  lcp: b => b + 100,
  tbt: b => b + 25,
  cls: b => Math.max(b, 0.1),
  inp: b => b + 20,
  visible: b => b + 20,
};

export function compare(base: PerfBaseline, lh: { pages: Record<string, { median: Lh }> }, ix: { interactions: Record<string, Ix> }): Row[] {
  const rows: Row[] = [];
  const add = (what: string, metric: keyof Lh | keyof Ix, b: number | undefined, n: number | undefined) => {
    if (b === undefined || n === undefined) {
      rows.push({ what, metric, base: b ?? NaN, now: n ?? NaN, limit: null, ok: false });
      return;
    }
    const lim = LIMITS[metric];
    const limit = lim ? lim(b) : null;
    rows.push({ what, metric, base: b, now: n, limit, ok: limit === null || n <= limit });
  };
  for (const [page, { median }] of Object.entries(base.lighthouse.pages)) {
    const now = lh.pages[page]?.median;
    for (const m of ['fcp', 'lcp', 'tbt', 'cls', 'si', 'ttfb'] as const) add(page, m, median[m], now?.[m]);
  }
  for (const [name, b] of Object.entries(base.interactions.interactions)) {
    const now = ix.interactions[name];
    for (const m of ['inp', 'visible'] as const) add(name, m, b[m], now?.[m]);
  }
  return rows;
}

const fmt = (metric: string, v: number) => (Number.isNaN(v) ? 'missing' : metric === 'cls' ? v.toFixed(3) : `${Math.round(v)} ms`);

export function table(rows: Row[]): string {
  const lines = ['| Page or interaction | Metric | Baseline | Now | Limit | |', '|---|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.what} | ${r.metric} | ${fmt(r.metric, r.base)} | ${fmt(r.metric, r.now)} | ${r.limit === null ? 'info' : fmt(r.metric, r.limit)} | ${r.ok ? 'ok' : '**over**'} |`);
  return lines.join('\n');
}

function main(argv: string[]) {
  const args = [...argv];
  const i = args.indexOf('--out');
  const out = i >= 0 ? args.splice(i, 2)[1] : undefined;
  const [basePath, lhPath, ixPath] = args;
  if (!basePath || !lhPath || !ixPath) throw new Error('usage: node tools/perf-compare.ts <baseline.json> <lighthouse.json> <interactions.json> [--out table.md]');
  const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
  const rows = compare(read(basePath) as PerfBaseline, read(lhPath), read(ixPath));
  const over = rows.filter(r => !r.ok);
  const md = `${over.length ? `**${over.length} over budget**` : 'Every median is within its tolerance.'}\n\n${table(rows)}\n`;
  console.log(md);
  if (out) writeFileSync(out, md);
  if (over.length) process.exitCode = 1;
}

/* Run as a script (not imported by a test); real paths, as a checkout can be reached through a symlink */
const isMain = () => { try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); } catch { return false; } };
if (isMain()) main(process.argv.slice(2));
