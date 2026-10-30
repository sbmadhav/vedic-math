/* The load and interaction gate (openspec change react-typescript, performance-budget spec "Load and interaction times
   do not regress", task 1.8; openspec changes perf-gate-fcp, perf-same-runner and perf-gate-same-runner-post-deploy).
   Compares a run of e2e/perf/lighthouse.mts and e2e/perf/interactions.ts with the baseline in docs/perf/baseline.json
   and with a reference measured in the same job (--reference, also spelled --production): production on a pull
   request, the pinned reference build after a deploy. Prints a Markdown table with every number, and
   fails beyond the tolerances: largest contentful paint more than 100 ms slower, total blocking time more than 25 ms
   longer, layout shift above the larger of the reference and 0.1, any interaction timing more than 20 ms slower (or more
   than the noise the baseline records for that timing, when it records one: interactions.noise).

   The reference each limit counts from (openspec change perf-same-runner, owner 2026-10-23): with --reference, the
   reference's median of the same job, so on a pull request (production as the reference) the limit is the regression
   the pull request adds, and after a deploy (the pinned reference build of baseline.json's `reference`, production
   measured) it is how far production has moved from the pinned code, both measured on the same runner.
   GitHub's runners differ about two to one in CPU speed and blocking time scales with it, so the Deep dive read 92 to
   191 ms across jobs on identical code (docs/perf/baseline.md, "The Deep dive's blocking time, after the fix"), and
   against the baseline alone a slow runner failed pull requests that changed nothing. The baseline stays in the table
   for information. Largest contentful paint is held to the baseline plus 100 ms, as before, not to the reference
   (ABSOLUTE; its Limit column says (baseline)): it sits at the end of the network chain, where the hosts differ (a
   workers.dev preview reads 60 to 150 ms over production on a cold first visit with the same bytes: docs/perf/baseline.md,
   "The same-runner reference"), while blocking time and the interactions are CPU time, where the runner differs and
   cancels. Without --reference every limit counts from the baseline, as before; after a deploy whose reference could
   not be uploaded, --reference-missing <why> says so under the table (openspec change perf-gate-same-runner-post-deploy,
   design D3).

   First contentful paint is reported, not gated (owner, 2026-10-23): its row keeps the reference, the measurement and
   the 100 ms limit it is held to again from the server-rendered shell on (react-typescript task 2.7 takes 'fcp' out of
   REPORTED), and never counts as over. On today's page Lighthouse's simulated first paint races the module graph, so
   the line misses on either host with the code unchanged (docs/perf/baseline.md, "First contentful paint races the
   module graph").

   Usage: node tools/perf-compare.ts <baseline.json> <lighthouse.json> <interactions.json>
            [--reference <lighthouse.json> <interactions.json>] [--reference-label <column>] [--label <column>]
            [--reference-missing <why>] [--out table.md]
   --reference-label names the reference's column (Production by default), --label the measured column (Preview with a
   reference, Now without). --reference (or --reference-missing) is the check after a deploy and its notes say so;
   --production is a pull request's.
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
  /** The pinned reference build the check after a deploy measures beside production (perf-gate-same-runner-post-deploy) */
  reference?: { commit: string; date: string; alias: string; why: string };
};
/** A run of e2e/perf/lighthouse.mts: the medians per page, and the machine's benchmarkIndex when the run recorded it */
export type LhRun = { pages: Record<string, { median: Lh }>; benchmarkIndex?: number };
/** A run of e2e/perf/interactions.ts: the medians per interaction */
export type IxRun = { interactions: Record<string, Ix> };
/** The host measured in the same job as the one checked (production on a pull request, the pinned reference build
    after a deploy): the reference the limits count from */
export type Reference = { lh: LhRun; ix: IxRun };
/** One line of the table. `reference` is set only when a reference was measured; `from` names the median the limit
    counts from, null for a metric shown for information or a missing value. */
export type Row = {
  what: string; metric: string; base: number; reference?: number; now: number;
  limit: number | null; from: 'reference' | 'baseline' | null; ok: boolean; reported: boolean;
};
/** The table's column names: the reference's and the measured host's */
export type Labels = { reference: string; measured: string };
/** A pull request's: production is the reference, the preview is measured */
export const PULL_REQUEST: Labels = { reference: 'Production', measured: 'Preview' };

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

/* Metrics held to the baseline, not the reference, when one was measured: largest contentful paint, a network chain on
   which the hosts differ (a workers.dev host against the custom domain; openspec change perf-same-runner) */
export const ABSOLUTE: ReadonlySet<string> = new Set(['lcp']);

export function compare(base: PerfBaseline, lh: LhRun, ix: IxRun, ref?: Reference): Row[] {
  const rows: Row[] = [];
  const noise = base.interactions.noise ?? {};
  const allowance = (what: string, metric: keyof Lh | keyof Ix) => {
    const n = noise[what];
    return typeof n === 'object' ? n[metric as keyof Ix] : undefined;
  };
  /* b: the baseline's median, n: the measured median, p: the reference's median of this job, when a reference was
     measured (undefined when the page or interaction is missing from it) */
  const add = (what: string, metric: keyof Lh | keyof Ix, b: number | undefined, n: number | undefined, p: number | undefined) => {
    const reference = ref ? { reference: p ?? NaN } : {};
    if (b === undefined || n === undefined || (ref && p === undefined)) {
      rows.push({ what, metric, base: b ?? NaN, ...reference, now: n ?? NaN, limit: null, from: null, ok: false, reported: false });
      return;
    }
    const lim = LIMITS[metric];
    let limit: number | null = null;
    let from: Row['from'] = null;
    if (lim) {
      const extra = allowance(what, metric);
      const at = (r: number) => Math.max(lim(r), extra === undefined ? -Infinity : r + extra);
      from = p !== undefined && !ABSOLUTE.has(metric) ? 'reference' : 'baseline';
      limit = at(from === 'reference' && p !== undefined ? p : b);
    }
    const reported = REPORTED.has(metric);
    rows.push({ what, metric, base: b, ...reference, now: n, limit, from, ok: reported || limit === null || n <= limit, reported });
  };
  for (const [page, { median }] of Object.entries(base.lighthouse.pages)) {
    const now = lh.pages[page]?.median;
    const r = ref?.lh.pages[page]?.median;
    for (const m of ['fcp', 'lcp', 'tbt', 'cls', 'si', 'ttfb', 'srt'] as const) if (median[m] !== undefined) add(page, m, median[m], now?.[m], r?.[m]);
  }
  for (const [name, b] of Object.entries(base.interactions.interactions)) {
    const now = ix.interactions[name];
    const r = ref?.ix.interactions[name];
    for (const m of ['inp', 'visible'] as const) add(name, m, b[m], now?.[m], r?.[m]);
  }
  return rows;
}

const fmt = (metric: string, v: number) => (Number.isNaN(v) ? 'missing' : metric === 'cls' ? v.toFixed(3) : `${Math.round(v)} ms`);

/* The limit, saying (baseline) when a reference was measured but the limit is the baseline's */
const limitCell = (r: Row) => (r.limit === null ? 'info' : `${fmt(r.metric, r.limit)}${r.reference !== undefined && r.from === 'baseline' ? ' (baseline)' : ''}`);

/** The table; `labels` names the reference's and the measured columns (a pull request's when not given). Without a
    reference the measured column reads its label when one was given, else Now. */
export function table(rows: Row[], given?: Labels): string {
  const labels = given ?? PULL_REQUEST;
  const withReference = rows.some(r => r.reference !== undefined);
  const lines = withReference
    ? [`| Page or interaction | Metric | Baseline | ${labels.reference} | ${labels.measured} | Limit | |`, '|---|---|---|---|---|---|---|']
    : [`| Page or interaction | Metric | Baseline | ${given ? labels.measured : 'Now'} | Limit | |`, '|---|---|---|---|---|---|'];
  for (const r of rows) {
    const cells = [r.what, r.metric, fmt(r.metric, r.base)];
    if (withReference) cells.push(fmt(r.metric, r.reference ?? NaN));
    cells.push(fmt(r.metric, r.now), limitCell(r), r.reported ? 'reported' : r.ok ? 'ok' : '**over**');
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

/** What the notes under the table say beyond the rows: the column names (a pull request's by default), whether this
    is the check after a deploy (the pinned reference build as the reference, production measured) rather than a pull
    request's, and why a reference that should have been measured was not (the pinned reference's commit and the reason) */
export type NoteContext = { labels?: Labels; afterDeploy?: boolean; missing?: { commit?: string | undefined; why: string } };

/** The lines under the table: what the limits count from when a reference was measured (or why the pinned one was
    not), what is reported rather than gated, and the runner's speed when the runs recorded it (both hosts' when a
    reference was measured) */
export function notes(rows: Row[], lh: Pick<LhRun, 'benchmarkIndex'>, reference?: Pick<LhRun, 'benchmarkIndex'>, context: NoteContext = {}): string[] {
  const labels = context.labels ?? PULL_REQUEST;
  const pullRequest = !context.afterDeploy;
  const out: string[] = [];
  if (rows.some(r => r.reference !== undefined)) {
    out.push(pullRequest
      ? 'Limits are production\'s median in this job plus the tolerance: the regression this pull request adds, measured on the same runner, so the runner\'s CPU speed cancels (openspec change perf-same-runner; docs/perf/baseline.md, "The same-runner reference"). The baseline column is information. Largest contentful paint is held to the baseline plus 100 ms instead, as before (its Limit reads (baseline)): it is a network chain on which the hosts differ, while blocking time and the interactions are CPU time, where the runner differs and cancels.'
      : `Limits are the median of ${labels.reference} in this job plus the tolerance: how far ${labels.measured} has moved from it, both measured page by page on the same runner, so the runner's CPU speed cancels (openspec change perf-gate-same-runner-post-deploy; docs/perf/baseline.md, "The post-deploy reference"). The baseline column is information. Largest contentful paint is held to the baseline plus 100 ms instead (its Limit reads (baseline)): the reference is on workers.dev, a different network chain from the custom domain.`);
  } else if (context.missing) {
    const which = context.missing.commit ? `The pinned reference (\`${context.missing.commit.slice(0, 7)}\`)` : 'The pinned reference';
    out.push(`${which} was not measured: ${context.missing.why}. Every limit counts from the baseline alone, as before the post-deploy reference, so blocking time and the interactions move with the runner's CPU speed and a miss on a slow runner may say nothing about the code (docs/perf/baseline.md, "The post-deploy reference").`);
  }
  if (rows.some(r => r.reported)) out.push('First contentful paint is reported, not gated, until the server-rendered shell (react-typescript task 2.7): on today\'s page Lighthouse\'s simulated first paint races the module graph (docs/perf/baseline.md). Its rows show the 100 ms limit it will be held to again.');
  const bench = (run: Pick<LhRun, 'benchmarkIndex'> | undefined) => (typeof run?.benchmarkIndex === 'number' ? Math.round(run.benchmarkIndex) : undefined);
  const now = bench(lh);
  const ref = bench(reference);
  const both = ref === undefined ? '' : pullRequest ? ` on the preview's runs, ${ref} on production's` : ` on the ${labels.measured} runs, ${ref} on the ${labels.reference} runs`;
  if (now !== undefined) out.push(`Runner CPU speed: Lighthouse benchmarkIndex ${now}${both} (higher is faster). Blocking time scales with it (docs/perf/baseline.md, "The Deep dive's blocking time").`);
  return out;
}

const USAGE = 'usage: node tools/perf-compare.ts <baseline.json> <lighthouse.json> <interactions.json> [--reference <lighthouse.json> <interactions.json>] [--reference-label <column>] [--label <column>] [--reference-missing <why>] [--out table.md]';

export function main(argv: string[]) {
  const args = [...argv];
  /* The values after an option, taken out of the positional arguments. An option given without its values, or with
     another option where a value belongs, is refused: never a silent fall back to the baseline (#139 review). */
  const take = (name: string, count: number) => {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    const values = args.splice(i, count + 1).slice(1);
    if (values.length < count || values.some(v => v.startsWith('--'))) throw new Error(USAGE);
    return values;
  };
  const [out] = take('--out', 1) ?? [];
  /* --production is the reference's first name (perf-same-runner), kept so preview.yml reads as it did */
  const asReference = take('--reference', 2);
  const asProduction = take('--production', 2);
  if (asReference && asProduction) throw new Error(USAGE);
  const [refLh, refIx] = asReference ?? asProduction ?? [];
  const [refLabel] = take('--reference-label', 1) ?? [];
  const [label] = take('--label', 1) ?? [];
  const [missing] = take('--reference-missing', 1) ?? [];
  const [basePath, lhPath, ixPath] = args;
  if (!basePath || !lhPath || !ixPath || args.length > 3 || (missing !== undefined && refLh !== undefined)) throw new Error(USAGE);
  const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
  const base = read(basePath) as PerfBaseline;
  const lh = read(lhPath) as LhRun;
  const reference: Reference | undefined = refLh && refIx ? { lh: read(refLh) as LhRun, ix: read(refIx) as IxRun } : undefined;
  const labels: Labels | undefined = refLabel === undefined && label === undefined
    ? undefined
    : { reference: refLabel ?? PULL_REQUEST.reference, measured: label ?? (reference ? PULL_REQUEST.measured : 'Now') };
  /* The check after a deploy spells the option --reference (or names a missing reference); a pull request --production */
  const afterDeploy = asReference !== undefined || missing !== undefined;
  const rows = compare(base, lh, read(ixPath) as IxRun, reference);
  const over = rows.filter(r => !r.ok);
  const context: NoteContext = { ...(labels ? { labels } : {}), afterDeploy, ...(missing === undefined ? {} : { missing: { commit: base.reference?.commit, why: missing } }) };
  const md = `${over.length ? `**${over.length} over budget**` : 'Every gated median is within its tolerance.'}\n\n${table(rows, labels)}\n${notes(rows, lh, reference?.lh, context).map(n => `\n${n}\n`).join('')}`;
  console.log(md);
  if (out) writeFileSync(out, md);
  if (over.length) process.exitCode = 1;
}

/* Run as a script (not imported by a test); real paths, as a checkout can be reached through a symlink */
const isMain = () => { try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); } catch { return false; } };
if (isMain()) main(process.argv.slice(2));
