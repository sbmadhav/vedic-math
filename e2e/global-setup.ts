import { request, type FullConfig } from '@playwright/test';

/* One request before the suite: if the site is down or GitHub Pages is rate limiting this IP
   (HTTP 429 "Rate limit exceeded", which lasts several minutes), every test would otherwise time out
   on a page with no app in it. Fail at once with the reason instead. */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const ctx = await request.newContext();
  try {
    const res = await ctx.get(`${baseURL}/vedic-math/`, { timeout: 30_000 });
    if (res.status() === 429)
      throw new Error(`${baseURL} answered 429: GitHub Pages is rate limiting this IP. Wait a few minutes (it clears by itself) and run again, with fewer workers if it keeps happening.`);
    if (!res.ok()) throw new Error(`${baseURL}/vedic-math/ answered HTTP ${res.status()}; the suite needs the site up.`);
  } finally {
    await ctx.dispose();
  }
}
