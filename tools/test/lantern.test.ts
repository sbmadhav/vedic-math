/* e2e/perf/lantern.mts: the fixed server latency is keyed by the origin lantern looks up (scheme, host and a
   non-default port), whatever the page's path or hash, with no extra round trip for it. */
import { test, expect } from 'vitest';
import { lanternData } from '../../e2e/perf/lantern.mts';

test('the latency is fixed for the measured origin, whatever the path', () => {
  expect(lanternData('https://pr-124-learnvedicmath.sbmadhav.workers.dev/play/#/arena', 30)).toEqual({
    additionalRttByOrigin: { 'https://pr-124-learnvedicmath.sbmadhav.workers.dev': 0 },
    serverResponseTimeByOrigin: { 'https://pr-124-learnvedicmath.sbmadhav.workers.dev': 30 },
  });
  expect(lanternData('https://learnvedicmath.com/play/', 30).serverResponseTimeByOrigin).toEqual({ 'https://learnvedicmath.com': 30 });
});

test('a local server keeps its port; a default port is left out', () => {
  expect(Object.keys(lanternData('http://localhost:8600/play/', 30).serverResponseTimeByOrigin)).toEqual(['http://localhost:8600']);
  expect(Object.keys(lanternData('https://learnvedicmath.com:443/play/', 30).serverResponseTimeByOrigin)).toEqual(['https://learnvedicmath.com']);
});
