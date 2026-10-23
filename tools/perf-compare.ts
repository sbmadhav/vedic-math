/* The load and interaction gate (openspec change react-typescript, performance-budget spec "Load and interaction times
   do not regress", task 1.8; openspec changes perf-gate-fcp and perf-same-runner). Compares a run of
   e2e/perf/lighthouse.mts and e2e/perf/interactions.ts with the baseline in docs/perf/baseline.json and, on a pull
   request, with production measured in the same job (--production), prints a Markdown table with every number, and
   fails beyond the tolerances: largest contentful paint more than 100 ms slower, total blocking time more than 25 ms
   longer, layout shift above the larger of the reference and 0.1, any interaction timing more than 20 ms slower (or more
   than the noise the baseline records for that timing, when it records one: interactions.noise).

   The reference each limit counts from (openspec change perf-same-runner, owner 2026-10-23): with --production, the
   production median of the same job, so the limit is the regression the pull request adds, measured on the same runner.
   GitHub's runners differ about two to one in CPU speed and blocking time scales with it, so the Deep dive read 92 to
   191 ms across jobs on identical code (docs/perf/baseline.md, "The Deep dive's blocking time, after the fix"), and
   against the baseline alone a slow runner failed pull requests that changed nothing. The baseline stays in the table
   for information. Largest contentful paint is held to the baseline plus 100 ms, as before, not to production
   (ABSOLUTE; its Limit column says (baseline)): it sits at the end of the network chain, where the hosts differ (a
   workers.dev preview reads 60 to 150 ms over production on a cold first visit with the same bytes: docs/perf/baseline.md,
   "The same-runner reference"), while blocking time and the interactions are CPU time, where the runner differs and
   cancels. Without --production (production after a deploy, e2e.yml, which has no second host) every limit counts from
   the baseline, as before.

   First contentful paint is reported, not gated (owner, 2026-10-23): its row keeps the reference, the measurement and
   the 100 ms limit it is held to again from the server-rendered shell on (react-typescript task 2.7 takes 'fcp' out of
   REPORTED), and never counts as over. On today's page Lighthouse's simulated first paint races the module graph, so
   the line misses on either host with the code unchanged (docs/perf/baseline.md, "First contentful paint races the
   module graph").

   Usage: node tools/perf-compare.ts <baseline.json> <lighthouse.json> <interactions.json>
            [--production <lighthouse.json> <interactions.json>] [--out table.md]
   Exit code 1 when a gated median misses its tolerance. Time to first byte, the server's response time and Speed Index
   are shown for information. The runner's CPU speed (Lighthouse's benchmarkIndex, when a run recorded it) is printed
   under the table for each host measured: blocking time scales with it. */
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Lh = { fcp: number; lcp: number; tbt: number; cls: number; si: number; ttfb: number; srt?: number };
export type Ix = { inp: number; visible: number };
export type PerfBaseline = {
  lighthouse: { pages: Record<string, { path: string; visit: string; median: Lh }> };
  interactions: { interactions: Record<string, Ix>; noise?: Record<string, Partial<Ix> | string> };
};
/** A run of e2e/perf/lighthouse.mts: the medians per page, and the machine's benchmarkIndex when the run recorded it */
export type LhRun = { pages: Record<string, { median: Lh }>; benchmarkIndex?: number };
/** A run of e2e/perf/interactions.ts: the medians per interaction */
export type IxRun = { interactions: Record<string, Ix> };
/** Production measured in the same job as the preview: the reference the limits count from */
export type Reference = { lh: LhRun; ix: IxRun };
/** One line of the table. `production` is set only when a reference was measured; `from` names the median the limit
    counts from, null for a metric shown for information or a missing value. */
export type Row = {
  what: string; metric: string; base: number; production?: number; now: number;
  limit: number | null; from: 'production' | 'baseline' | null; ok: boolean; reported: boolean;
};

/* The tolerance of each gated metric: the largest value that still passes, given the reference's */
export const LIMITS: Partial<Record<keyof Lh | keyof Ix, (ref: number) => number>> = {
  fcp: r => r + 100,
  lcp: r => r + 100,
  tbt: r => r + 25,
  cls: r => Math.max(r, 0.1),
  inp: r => r + 20,
  visible: r => r + 20,
};

/* Metrics shown with their limit but never over: first contentful paint until the server-rendered shell (above) */
export const REPORTED: ReadonlySet<string> = new Set(['fcp']);

/* Metrics held to the baseline, not production, when production is the reference: largest contentful paint, a network
   chain on which the hosts differ (openspec change perf-same-runner) */
export const ABSOLUTE: ReadonlySet<string> = new Set(['lcp']);

export function compare(base: PerfBaseline, lh: LhRun, ix: IxRun, ref?: Reference): Row[] {
  const rows: Row[] = [];
  const noise = base.interactions.noise ?? {};
  const allowance = (what: string, metric: keyof Lh | keyof Ix) => {
    const n = noise[what];
    return typeof n === 'object' ? n[metric as keyof Ix] : undefined;
  };
  /* b: the baseline's median, n: the measured (preview's) median, p: production's median of this job, when a
     reference was measured (undefined when the page or interaction is missing from it) */
  const add = (what: string, metric: keyof Lh | keyof Ix, b: number | undefined, n: number | undefined, p: number | undefined) => {
    const production = ref ? { production: p ?? NaN } : {};
    if (b === undefined || n === undefined || (ref && p === undefined)) {
      rows.push({ what, metric, base: b ?? NaN, ...production, now: n ?? NaN, limit: null, from: null, ok: false, reported: false });
      return;
    }
    const lim = LIMITS[metric];
    let limit: number | null = null;
    let from: Row['from'] = null;
    if (lim) {
      const extra = allowance(what, metric);
      const at = (r: number) => Math.max(lim(r), extra === undefined ? -Infinity : r + extra);
      from = p !== undefined && !ABSOLUTE.has(metric) ? 'production' : 'baseline';
      limit = at(from === 'production' && p !== undefined ? p : b);
    }
    const reported = REPORTED.has(metric);
    rows.push({ what, metric, base: b, ...production, now: n, limit, from, ok: reported || limit === null || n <= limit, reported });
  };
  for (const [page, { median }] of Object.entries(base.lighthouse.pages)) {
    const now = lh.pages[page]?.median;
    const prod = ref?.lh.pages[page]?.median;
    for (const m of ['fcp', 'lcp', 'tbt', 'cls', 'si', 'ttfb', 'srt'] as const) if (median[m] !== undefined) add(page, m, median[m], now?.[m], prod?.[m]);
  }
  for (const [name, b] of Object.entries(base.interactions.interactions)) {
    const now = ix.interactions[name];
    const prod = ref?.ix.interactions[name];
    for (const m of ['inp', 'visible'] as const) add(name, m, b[m], now?.[m], prod?.[m]);
  }
  return rows;
}

const fmt = (metric: string, v: number) => (Number.isNaN(v) ? 'missing' : metric === 'cls' ? v.toFixed(3) : `${Math.round(v)} ms`);

/* The limit, saying (baseline) when production is the reference but the baseline's limit is the smaller */
const limitCell = (r: Row) => (r.limit === null ? 'info' : `${fmt(r.metric, r.limit)}${r.production !== undefined && r.from === 'baseline' ? ' (baseline)' : ''}`);

export function table(rows: Row[]): string {
  const withProduction = rows.some(r => r.production !== undefined);
  const lines = withProduction
    ? ['| Page or interaction | Metric | Baseline | Production | Preview | Limit | |', '|---|---|---|---|---|---|---|']
    : ['| Page or interaction | Metric | Baseline | Now | Limit | |', '|---|---|---|---|---|---|'];
  for (const r of rows) {
    const cells = [r.what, r.metric, fmt(r.metric, r.base)];
    if (withProduction) cells.push(fmt(r.metric, r.production ?? NaN));
    cells.push(fmt(r.metric, r.now), limitCell(r), r.reported ? 'reported' : r.ok ? 'ok' : '**over**');
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

/** The lines under the table: what the limits count from when production was measured, what is reported rather than
    gated, and the runner's speed when the runs recorded it (both hosts' when production was measured) */
export function notes(rows: Row[], lh: Pick<LhRun, 'benchmarkIndex'>, production?: Pick<LhRun, 'benchmarkIndex'>): string[] {
  const out: string[] = [];
  if (rows.some(r => r.production !== undefined)) out.push('Limits are production\'s median in this job plus the tolerance: the regression this pull request adds, measured on the same runner, so the runner\'s CPU speed cancels (openspec change perf-same-runner; docs/perf/baseline.md, "The same-runner reference"). The baseline column is information. Largest contentful paint is held to the baseline plus 100 ms instead, as before (its Limit reads (baseline)): it is a network chain on which the hosts differ, while blocking time and the interactions are CPU time, where the runner differs and cancels.');
  if (rows.some(r => r.reported)) out.push('First contentful paint is reported, not gated, until the server-rendered shell (react-typescript task 2.7): on today\'s page Lighthouse\'s simulated first paint races the module graph (docs/perf/baseline.md). Its rows show the 100 ms limit it will be held to again.');
  const bench = (run: Pick<LhRun, 'benchmarkIndex'> | undefined) => (typeof run?.benchmarkIndex === 'number' ? Math.round(run.benchmarkIndex) : undefined);
  const now = bench(lh);
  const prod = bench(production);
  if (now !== undefined) out.push(`Runner CPU speed: Lighthouse benchmarkIndex ${now}${prod !== undefined ? ` on the preview's runs, ${prod} on production's` : ''} (higher is faster). Blocking time scales with it (docs/perf/baseline.md, "The Deep dive's blocking time").`);
  return out;
}

const USAGE = 'usage: node tools/perf-compare.ts <baseline.json> <lighthouse.json> <interactions.json> [--production <lighthouse.json> <interactions.json>] [--out table.md]';

function main(argv: string[]) {
  const args = [...argv];
  /* The values after an option, taken out of the positional arguments */
  const take = (name: string, count: number) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, count + 1).slice(1) : []; };
  const [out] = take('--out', 1);
  const [prodLh, prodIx] = take('--production', 2);
  const [basePath, lhPath, ixPath] = args;
  if (!basePath || !lhPath || !ixPath || args.length > 3 || (prodLh !== undefined && (!prodIx || prodIx.startsWith('--')))) throw new Error(USAGE);
  const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
  const lh = read(lhPath) as LhRun;
  const production: Reference | undefined = prodLh && prodIx ? { lh: read(prodLh) as LhRun, ix: read(prodIx) as IxRun } : undefined;
  const rows = compare(read(basePath) as PerfBaseline, lh, read(ixPath) as IxRun, production);
  const over = rows.filter(r => !r.ok);
  const md = `${over.length ? `**${over.length} over budget**` : 'Every gated median is within its tolerance.'}\n\n${table(rows)}\n${notes(rows, lh, production?.lh).map(n => `\n${n}\n`).join('')}`;
  console.log(md);
  if (out) writeFileSync(out, md);
  if (over.length) process.exitCode = 1;
}

/* Run as a script (not imported by a test); real paths, as a checkout can be reached through a symlink */
const isMain = () => { try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); } catch { return false; } };
if (isMain()) main(process.argv.slice(2));
