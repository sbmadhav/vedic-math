/* The server latency Lighthouse's simulation uses (openspec change react-typescript, performance-budget spec).

   With simulated throttling, Lighthouse adds the measured origin's observed server response time to every request it
   models. Largest contentful paint sits at the end of a chain of requests (the page, app.js, three levels of static
   imports, the styles they load), so a host that answers 25 ms slower reads about 300 ms slower, and the same code
   measured on a workers.dev preview missed the baseline measured on production by 170 to 380 ms (docs/perf/baseline.md,
   "The server latency is fixed"). Passing these values as settings.precomputedLanternData fixes the latency for the
   measured origin whichever host serves the page, so a preview is compared with the baseline as if production served
   it; the observed latency is still recorded for information (lat in e2e/perf/lighthouse.mts). */
export function lanternData(url: string, serverResponseTime: number) {
  const origin = new URL(url).origin; /* lantern keys its tables by the request's security origin: scheme, host and a non-default port */
  return { additionalRttByOrigin: { [origin]: 0 }, serverResponseTimeByOrigin: { [origin]: serverResponseTime } };
}
