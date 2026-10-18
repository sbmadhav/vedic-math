import { test, expect, APP, open } from '../fixtures';
import type { Page } from '@playwright/test';

/* content-security spec, Requirements "The published page carries a Content-Security-Policy" and "Inline scripts run
   only by hash": one test per scenario. The policy exists only in the build, so against a plain local checkout these
   skip (serve a build: python3 build.py --out _site && node e2e/local-server.mjs 8124 _site). The build-time rules
   (a policy or an inline handler committed to the source fails the build) are run by test/build.test.mjs; here the
   published page is checked for what those rules guarantee. */

type Violation = { directive: string; blocked: string; source: string };
async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; w.__csp = [];
    document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
      w.__csp.push({ directive: e.effectiveDirective || e.violatedDirective, blocked: e.blockedURI, source: `${e.sourceFile}:${e.lineNumber}` });
    });
  });
  return () => page.evaluate(() => ((window as any).__csp || []) as Violation[]);
}
async function policy(page: Page, baseURL?: string) {
  const meta = page.locator('meta[http-equiv="Content-Security-Policy"]');
  if (!/^https:/.test(baseURL || '') && await meta.count() === 0) test.skip(true, 'No CSP in the unbuilt source: serve a build');
  await expect(meta).toHaveCount(1);
  return (await meta.getAttribute('content'))!;
}

test('Built page: the published index.html has the policy right after <meta charset>, and the source in git has none', async ({ page, baseURL }) => {
  await open(page);
  await policy(page, baseURL);
  const html = await (await page.request.get(APP)).text();
  const charset = html.search(/<meta charset=/i), csp = html.search(/<meta http-equiv="Content-Security-Policy"/);
  expect(charset).toBeGreaterThanOrEqual(0);
  expect(csp).toBeGreaterThan(charset);
  // Nothing but whitespace between the two
  expect(html.slice(html.indexOf('>', charset) + 1, csp).trim()).toBe('');
  // The source carries none: the build adds it (test/build.test.mjs fails the build on a committed policy), and the
  // published page carries exactly one
  expect(html.match(/<meta http-equiv="Content-Security-Policy"/g)!.length).toBe(1);
});

test('A policy committed to the source: the published policy is the build\'s (hashes for its own inline scripts, no unsafe-inline), never a hand-written one', async ({ page, baseURL }) => {
  await open(page);
  const csp = await policy(page, baseURL);
  const script = csp.split(';').map(s => s.trim()).find(s => s.startsWith('script-src'))!;
  expect(script).toMatch(/'sha256-[A-Za-z0-9+/=]+'/);
  expect(script).not.toContain("'unsafe-inline'");
  expect(script).not.toContain("'unsafe-eval'");
  const inline = await page.evaluate(() => [...document.querySelectorAll('script:not([src])')].filter(s => !/json/i.test(s.getAttribute('type') || '')).length); // data blocks need no hash
  expect((script.match(/'sha256-/g) || []).length).toBeGreaterThanOrEqual(inline);
});

test("The page's own inline scripts: the color scheme script, the import map and the color mode buttons work with no violation", async ({ page, baseURL }) => {
  const list = await watchViolations(page);
  await open(page);
  await policy(page, baseURL);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#themeBtn').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
  expect(await page.evaluate(() => !!document.querySelector('script[type="importmap"]'))).toBe(true);
  await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
  expect(await list()).toEqual([]);
});

test('An injected inline script: it does not run and a securitypolicyviolation event reports script-src', async ({ page, baseURL }) => {
  const list = await watchViolations(page);
  await open(page);
  await policy(page, baseURL);
  await page.evaluate(() => { (window as any).__ran = false; const s = document.createElement('script'); s.textContent = 'window.__ran = true;'; document.body.appendChild(s); });
  await expect.poll(async () => (await list()).some(x => /script-src/.test(x.directive)), { message: 'a securitypolicyviolation for script-src' }).toBe(true);
  expect(await page.evaluate(() => (window as any).__ran)).toBe(false);
});

test('An inline handler in the source: the published page has no inline event handler attribute and no javascript: link', async ({ page, baseURL }) => {
  await open(page);
  await policy(page, baseURL);
  const html = await (await page.request.get(APP)).text();
  expect(html).not.toMatch(/\son[a-z]+="/i);
  expect(html).not.toMatch(/href="javascript:/i);
});
