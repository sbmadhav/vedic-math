/* The order of a Lighthouse job that measures two sites (openspec change perf-same-runner): production and the pull
   request's preview in the same job, page by page, so both see the same runner within minutes of each other and the
   runner's CPU speed, which moves blocking time about two to one between GitHub's runners, cancels in the comparison
   (docs/perf/baseline.md, "The same-runner reference"). Every page is measured on each site in turn, the same runs
   each; the sites' order swaps on each page so neither always goes first. */
export function interleave<P, S>(pages: readonly P[], sites: readonly S[]): { page: P; site: S }[] {
  return pages.flatMap((page, i) => (i % 2 ? [...sites].reverse() : [...sites]).map(site => ({ page, site })));
}
