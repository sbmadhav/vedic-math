/* tools/perf-compare.ts (task 1.8; openspec change perf-gate-fcp): each gated metric passes at its tolerance and fails
   one step past it, first contentful paint is reported and never fails, a missing page or interaction fails, and time
   to first byte and Speed Index are shown for information only. */
import { test, expect } from 'vitest';
import { compare, table, notes, REPORTED, type PerfBaseline, type Lh, type Ix } from '../perf-compare.ts';

const lh = (o: Partial<Lh> = {}): Lh => ({ fcp: 1900, lcp: 5200, tbt: 30, cls: 0.007, si: 1900, ttfb: 70, ...o });
const ix = (o: Partial<Ix> = {}): Ix => ({ inp: 48, visible: 33, ...o });
const base: PerfBaseline = { lighthouse: { pages: { arena: { path: '/play/#/arena', visit: 'returning', median: lh() } } }, interactions: { interactions: { 'arena-answer': ix() } } };
const run = (l: Lh, i: Ix) => compare(base, { pages: { arena: { median: l } } }, { interactions: { 'arena-answer': i } });
const over = (l: Lh, i: Ix) => run(l, i).filter(r => !r.ok).map(r => `${r.what} ${r.metric}`);

test('at the tolerance passes; one step past fails, naming the metric', () => {
  expect(over(lh({ lcp: 5300, tbt: 55, cls: 0.1 }), ix({ inp: 68, visible: 53 }))).toEqual([]);
  expect(over(lh({ lcp: 5301, tbt: 56 }), ix())).toEqual(['arena lcp', 'arena tbt']);
  expect(over(lh({ cls: 0.101 }), ix({ inp: 69, visible: 54 }))).toEqual(['arena cls', 'arena-answer inp', 'arena-answer visible']);
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
  expect(notes([], { benchmarkIndex: 1234.6 })).toEqual([expect.stringMatching(/^Runner CPU speed: Lighthouse benchmarkIndex 1235 /)]);
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
