import { expect, type Page } from '@playwright/test';

/* The Trick pages (openspec change trick-pages): the 15 pages of design D2, by slug, Trick id and title, shared by the
   specs. The list mirrors tools/trick-pages/pages.ts; test/trick-pages.test.mjs keeps that file and the committed pages
   in step, and trick-pages.spec.ts checks every page here opens. */
export const TRICK_PAGES: { slug: string; trick: string; title: string }[] = [
  { slug: 'square-numbers-ending-in-5', trick: 'sq5', title: 'Square numbers ending in 5' },
  { slug: 'multiply-numbers-near-100', trick: 'near-base', title: 'Multiply numbers near 10, 100 or 1000' },
  { slug: 'multiply-any-two-numbers-in-one-line', trick: 'crosswise', title: 'Multiply any two numbers in one line' },
  { slug: 'subtract-from-100-or-1000', trick: 'from9', title: 'Subtract from 100, 1000, 10000' },
  { slug: 'multiply-by-9-99-or-999', trick: 'by9s', title: 'Multiply by 9, 99 or 999' },
  { slug: 'multiply-when-last-digits-add-to-10', trick: 'ends10', title: 'Same start, last digits add to 10' },
  { slug: 'square-numbers-near-100', trick: 'square-near', title: 'Square numbers near a base' },
  { slug: 'multiply-by-11', trick: 'by11', title: 'Multiply by 11' },
  { slug: 'divide-by-9', trick: 'div9', title: 'Divide by 9 with running sums' },
  { slug: 'check-answers-with-digit-sums', trick: 'check9', title: 'Check answers with digit sums' },
  { slug: 'multiply-by-5-25-50-or-125', trick: 'times5', title: 'Multiply by 5, 25, 50 and 125' },
  { slug: 'multiply-with-a-working-base', trick: 'sub-base', title: 'Multiply with a working base like 50' },
  { slug: 'square-any-two-digit-number', trick: 'duplex', title: 'Square any two-digit number' },
  { slug: 'square-roots-in-your-head', trick: 'sqroot', title: 'Square roots by looking' },
  { slug: 'cube-roots-in-your-head', trick: 'cuberoot', title: 'Cube roots in two seconds' },
];

export const INDEX = '/tricks/';
export const trickUrl = (slug: string) => `${INDEX}${slug}/`;

/** Opens a Trick page and waits for its heading and, with JavaScript, for the calculator module to mark itself ready */
export async function openTrick(page: Page, slug: string, { js = true } = {}) {
  await page.goto(trickUrl(slug));
  await expect(page.locator('main h1')).toBeVisible();
  if (js) await expect(page.locator('#tkCalc[data-ready]')).toBeVisible();
}

/** Types the numbers into the calculator's fields (one per input) and presses Show steps */
export async function showSteps(page: Page, ...numbers: (number | string)[]) {
  const inputs = page.locator('#tkForm input[data-i]');
  await expect(inputs).toHaveCount(numbers.length);
  for (const [k, n] of numbers.entries()) await inputs.nth(k).fill(String(n));
  await page.locator('#tkShow').click();
}

/* A stub for /js/analytics.js that only records window.siteTrack paths (as the analytics cov specs do) */
export const ANALYTICS_STUB = `window.__events = window.__events || []; window.siteTrack = (path) => { window.__events.push(path); };`;
export const events = (page: Page): Promise<string[]> => page.evaluate(() => (globalThis as { __events?: string[] }).__events || []);
export async function stubAnalytics(page: Page) {
  await page.route(/\/js\/analytics\.js(\?.*)?$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: ANALYTICS_STUB }));
}
