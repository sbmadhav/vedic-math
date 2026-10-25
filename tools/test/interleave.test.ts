/* e2e/perf/interleave.mts (openspec change perf-same-runner): every page on each site in turn, the sites' order
   swapping page by page, so the two hosts of a perf job are measured on the same runner minutes apart and neither
   always goes first. */
import { test, expect } from 'vitest';
import { interleave } from '../../e2e/perf/interleave.mts';

const turns = <P, S>(pages: P[], sites: S[]) => interleave(pages, sites).map(t => `${t.page}:${t.site}`);

test('each page on every site in turn, the order swapping on each page', () => {
  expect(turns(['play-first', 'arena', 'games'], ['preview', 'production'])).toEqual([
    'play-first:preview', 'play-first:production',
    'arena:production', 'arena:preview',
    'games:preview', 'games:production',
  ]);
});

test('one site measures its pages in order, as before; no pages, no turns', () => {
  expect(turns(['play-first', 'arena'], ['preview'])).toEqual(['play-first:preview', 'arena:preview']);
  expect(interleave([], ['preview', 'production'])).toEqual([]);
});
