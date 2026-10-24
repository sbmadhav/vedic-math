/* tools/perf-compare.ts (task 1.8; openspec changes perf-gate-fcp and perf-same-runner): each gated metric passes at
   its tolerance and fails one step past it, first contentful paint is reported and never fails, a missing page or
   interaction fails, and time to first byte and Speed Index are shown for information only. With production measured
   in the same job the limits count from production's medians (a slow runner that moves both hosts passes, the
   regression a pull request adds fails), largest contentful paint stays on the baseline (the hosts differ on the
   network chain), and the table gets a Production column. */
import { test, expect } from 'vitest';
import { main, compare, table, notes, REPORTED, ABSOLUTE, type PerfBaseline, type Lh, type Ix, type Reference } from '../perf-compare.ts';

const lh = (o: Partial<Lh> = {}): Lh => ({ fcp: 1900, lcp: 5200, tbt: 30, cls: 0.007, si: 1900, ttfb: 70, ...o });
const ix = (o: Partial<Ix> = {}): Ix => ({ inp: 48, visible: 33, ...o });
const base: PerfBaseline = { lighthouse: { pages: { arena: { path: '/play/#/arena', visit: 'returning', median: lh() } } }, interactions: { interactions: { 'arena-answer': ix() } } };
const run = (l: Lh, i: Ix) => compare(base, { pages: { arena: { median: l } } }, { interactions: { 'arena-answer': i } });
const over = (l: Lh, i: Ix) => run(l, i).filter(r => !r.ok).map(r => `${r.what} ${r.metric}`);

/* The same, with production measured in the same job as the reference */
const production = (l: Lh, i: Ix): Reference => ({ lh: { pages: { arena: { median: l } } }, ix: { interactions: { 'arena-answer': i } } });
const runP = (prodL: Lh, prodI: Ix, l: Lh, i: Ix) => compare(base, { pages: { arena: { median: l } } }, { interactions: { 'arena-answer': i } }, production(prodL, prodI));
const overP = (prodL: Lh, prodI: Ix, l: Lh, i: Ix) => runP(prodL, prodI, l, i).filter(r => !r.ok).map(r => `${r.what} ${r.metric}`);

test('at the tolerance passes; one step past fails, naming the metric', () => {
  expect(over(lh({ lcp: 5300, tbt: 55, cls: 0.1 }), ix({ inp: 68, visible: 53 }))).toEqual([]);
  expect(over(lh({ lcp: 5301, tbt: 56 }), ix())).toEqual(['arena lcp', 'arena tbt']);
  expect(over(lh({ cls: 0.101 }), ix({ inp: 69, visible: 54 }))).toEqual(['arena cls', 'arena-answer inp', 'arena-answer visible']);
  // Without production every limit counts from the baseline, and no row carries a production number
  expect(run(lh(), ix()).every(r => r.production === undefined && (r.from === 'baseline' || r.limit === null))).toBe(true);
});

test('first contentful paint is reported, not gated: the row keeps its 100 ms limit, reads reported and never fails (owner, 2026-10-23)', () => {
  expect([...REPORTED]).toEqual(['fcp']);
  const rows = run(lh({ fcp: 1900 + 400 }), ix());
  expect(rows.find(r => r.metric === 'fcp')).toMatchObject({ base: 1900, now: 2300, limit: 2000, ok: true, reported: true });
  expect(rows.filter(r => r.reported).map(r => r.metric)).toEqual(['fcp']);
  expect(over(lh({ fcp: 2300 }), ix())).toEqual([]);
  expect(table(rows)).toMatch(/\| arena \| fcp \| 1900 ms \| 2300 ms \| 2000 ms \| reported \|/);
  expect(table(rows)).toMatch(/\| arena \| lcp \| 5200 ms \| 5200 ms \| 5300 ms \| ok \|/);
});

test('the notes under the table: the reported metric only when a row is reported, the runner speed only when recorded', () => {
  const rows = run(lh(), ix());
  expect(notes(rows, {})).toEqual([expect.stringMatching(/^First contentful paint is reported, not gated, until the server-rendered shell/)]);
  expect(notes(rows.filter(r => !r.reported), {})).toEqual([]);
  expect(notes([], { benchmarkIndex: 1234.6 })).toEqual([expect.stringMatching(/^Runner CPU speed: Lighthouse benchmarkIndex 1235 \(higher is faster\)/)]);
  expect(notes(rows, { benchmarkIndex: 900 })).toHaveLength(2);
});

test('the spec example: an Arena answer 35 ms slower fails and shows both numbers', () => {
  const rows = run(lh(), ix({ inp: 48 + 35 }));
  expect(over(lh(), ix({ inp: 83 }))).toEqual(['arena-answer inp']);
  expect(table(rows)).toMatch(/\| arena-answer \| inp \| 48 ms \| 83 ms \| 68 ms \| \*\*over\*\* \|/);
});

test('layout shift may rise to 0.1 even from a smaller baseline; TTFB and Speed Index are information', () => {
  expect(over(lh({ cls: 0.09, ttfb: 900, si: 9000 }), ix())).toEqual([]);
});

test('a timing with recorded noise may move by that much, never less than the 20 ms tolerance', () => {
  const noisy: PerfBaseline = { ...base, interactions: { ...base.interactions, noise: { '//': 'why', 'arena-answer': { inp: 120 } } } };
  const over2 = (i: Ix) => compare(noisy, { pages: { arena: { median: lh() } } }, { interactions: { 'arena-answer': i } }).filter(r => !r.ok).map(r => r.metric);
  expect(over2(ix({ inp: 48 + 120 }))).toEqual([]);
  expect(over2(ix({ inp: 48 + 121 }))).toEqual(['inp']);
  expect(over2(ix({ visible: 33 + 21 }))).toEqual(['visible']);
});

test('a page or interaction missing from the run fails, the reported metric too', () => {
  expect(compare(base, { pages: {} }, { interactions: {} }).every(r => !r.ok)).toBe(true);
});

/* With production measured in the same job (openspec change perf-same-runner) */

test('the limits count from production: the slow runner of #125 passes, and the regression a pull request adds fails one step past the tolerance', () => {
  // Both hosts read blocking time far over the baseline's 30 + 25 on a slow runner: the preview is held to production + 25
  expect(overP(lh({ tbt: 190 }), ix(), lh({ tbt: 215 }), ix())).toEqual([]);
  expect(overP(lh({ tbt: 190 }), ix(), lh({ tbt: 216 }), ix())).toEqual(['arena tbt']);
  expect(runP(lh({ tbt: 190 }), ix(), lh({ tbt: 200 }), ix()).find(r => r.metric === 'tbt')).toMatchObject({ base: 30, production: 190, now: 200, limit: 215, from: 'production', ok: true });
  // A fast runner moves the limit down with production: a regression the baseline would hide still fails
  expect(runP(lh({ tbt: 20 }), ix(), lh({ tbt: 50 }), ix()).find(r => r.metric === 'tbt')).toMatchObject({ production: 20, now: 50, limit: 45, from: 'production', ok: false });
  // Interactions too: 20 ms over production, or the noise the baseline records, counted from production
  expect(overP(lh(), ix({ inp: 60, visible: 40 }), lh(), ix({ inp: 80, visible: 60 }))).toEqual([]);
  expect(overP(lh(), ix({ inp: 60, visible: 40 }), lh(), ix({ inp: 81, visible: 61 }))).toEqual(['arena-answer inp', 'arena-answer visible']);
  const noisy: PerfBaseline = { ...base, interactions: { ...base.interactions, noise: { 'arena-answer': { inp: 120 } } } };
  const noisyOver = (i: Ix) => compare(noisy, { pages: { arena: { median: lh() } } }, { interactions: { 'arena-answer': i } }, production(lh(), ix({ inp: 100 }))).filter(r => !r.ok).map(r => r.metric);
  expect(noisyOver(ix({ inp: 220 }))).toEqual([]);
  expect(noisyOver(ix({ inp: 221 }))).toEqual(['inp']);
});

test('the spec example against production: an Arena answer 35 ms slower than production fails and shows the three numbers', () => {
  const rows = runP(lh(), ix({ inp: 56 }), lh(), ix({ inp: 56 + 35 }));
  expect(rows.filter(r => !r.ok).map(r => `${r.what} ${r.metric}`)).toEqual(['arena-answer inp']);
  expect(table(rows)).toMatch(/\| arena-answer \| inp \| 48 ms \| 56 ms \| 91 ms \| 76 ms \| \*\*over\*\* \|/);
});

test('largest contentful paint is held to the baseline, not production: the hosts differ on the network chain (#139), and the table says so', () => {
  expect([...ABSOLUTE]).toEqual(['lcp']);
  // #139's job, the same bytes on both hosts: production 5340, the preview 5460 on /play/ against a baseline of 5420 passes
  const same: PerfBaseline = { ...base, lighthouse: { pages: { arena: { ...base.lighthouse.pages.arena!, median: lh({ lcp: 5420 }) } } } };
  const rows = compare(same, { pages: { arena: { median: lh({ lcp: 5460 }) } } }, { interactions: { 'arena-answer': ix() } }, production(lh({ lcp: 5340 }), ix()));
  expect(rows.find(r => r.metric === 'lcp')).toMatchObject({ base: 5420, production: 5340, now: 5460, limit: 5520, from: 'baseline', ok: true });
  expect(table(rows)).toMatch(/\| arena \| lcp \| 5420 ms \| 5340 ms \| 5460 ms \| 5520 ms \(baseline\) \| ok \|/);
  // Over the baseline's 100 ms fails, however production reads
  expect(runP(lh({ lcp: 5600 }), ix(), lh({ lcp: 5301 }), ix()).find(r => r.metric === 'lcp')).toMatchObject({ base: 5200, production: 5600, now: 5301, limit: 5300, from: 'baseline', ok: false });
  expect(overP(lh({ lcp: 5600 }), ix(), lh({ lcp: 5300 }), ix())).toEqual([]);
  expect(overP(lh({ lcp: 5000 }), ix(), lh({ lcp: 5300 }), ix())).toEqual([]);
  // Blocking time has no baseline gate: over the baseline's limit, within production's, passes
  expect(runP(lh({ tbt: 190 }), ix(), lh({ tbt: 200 }), ix()).find(r => r.metric === 'tbt')).toMatchObject({ limit: 215, from: 'production' });
  expect(table(runP(lh({ tbt: 190 }), ix(), lh({ tbt: 200 }), ix()))).toMatch(/\| arena \| tbt \| 30 ms \| 190 ms \| 200 ms \| 215 ms \| ok \|/);
});

test('layout shift may rise to the larger of production and 0.1; first contentful paint stays reported, with production shown', () => {
  expect(overP(lh({ cls: 0.02 }), ix(), lh({ cls: 0.1 }), ix())).toEqual([]);
  expect(overP(lh({ cls: 0.2 }), ix(), lh({ cls: 0.2 }), ix())).toEqual([]);
  expect(overP(lh({ cls: 0.2 }), ix(), lh({ cls: 0.201 }), ix())).toEqual(['arena cls']);
  const rows = runP(lh({ fcp: 2500 }), ix(), lh({ fcp: 3200 }), ix());
  expect(rows.find(r => r.metric === 'fcp')).toMatchObject({ base: 1900, production: 2500, now: 3200, limit: 2600, from: 'production', reported: true, ok: true });
  expect(table(rows)).toMatch(/\| arena \| fcp \| 1900 ms \| 2500 ms \| 3200 ms \| 2600 ms \| reported \|/);
});

test('the table with production has a Production column before Preview; without production the layout is as before', () => {
  const rows = runP(lh(), ix(), lh(), ix());
  expect(table(rows).split('\n').slice(0, 2)).toEqual(['| Page or interaction | Metric | Baseline | Production | Preview | Limit | |', '|---|---|---|---|---|---|---|']);
  expect(table(rows)).toMatch(/\| arena \| ttfb \| 70 ms \| 70 ms \| 70 ms \| info \| ok \|/);
  expect(table(run(lh(), ix())).split('\n').slice(0, 2)).toEqual(['| Page or interaction | Metric | Baseline | Now | Limit | |', '|---|---|---|---|---|---|']);
});

test('a page or interaction missing from production fails its rows and reads missing', () => {
  const rows = compare(base, { pages: { arena: { median: lh() } } }, { interactions: { 'arena-answer': ix() } }, { lh: { pages: {} }, ix: { interactions: {} } });
  expect(rows.every(r => !r.ok && r.limit === null)).toBe(true);
  expect(table(rows)).toMatch(/\| arena \| lcp \| 5200 ms \| missing \| 5200 ms \| info \| \*\*over\*\* \|/);
});

test('the notes with production: the same-runner line first, then both runners\' speeds', () => {
  const rows = runP(lh(), ix(), lh(), ix());
  const lines = notes(rows, { benchmarkIndex: 4177 }, { benchmarkIndex: 4190.4 });
  expect(lines).toHaveLength(3);
  expect(lines[0]).toMatch(/^Limits are production's median in this job plus the tolerance/);
  expect(lines[2]).toMatch(/^Runner CPU speed: Lighthouse benchmarkIndex 4177 on the preview's runs, 4190 on production's \(higher is faster\)/);
  // Production's speed not recorded: the preview's alone
  expect(notes(rows, { benchmarkIndex: 4177 }, {})[2]).toMatch(/^Runner CPU speed: Lighthouse benchmarkIndex 4177 \(higher is faster\)/);
});

test('an incomplete --production option is refused, never a silent fall back to the baseline (#139 review)', () => {
  // The usage check runs before any file is read, so the paths need not exist
  expect(() => main(['b.json', 'l.json', 'i.json', '--production'])).toThrow(/usage/);
  expect(() => main(['b.json', 'l.json', 'i.json', '--production', 'p.json'])).toThrow(/usage/);
  expect(() => main(['b.json', 'l.json', 'i.json', '--production', 'p.json', '--out', 't.md'])).toThrow(/usage/);
});
