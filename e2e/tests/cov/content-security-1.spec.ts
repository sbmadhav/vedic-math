import { test, expect, APP, open, policyOf } from '../fixtures';
import type { Page } from '@playwright/test';

/* content-security spec (change learnvedicmath), Requirements "The published page carries a Content-Security-Policy"
   and "Inline scripts run only by hash": one test per scenario. The policy is a response header (build.py writes it
   into _headers), so against a server that sends none these skip (serve a build: python3 build.py &&
   node e2e/local-server.mjs 8124 _site). The build-time rules (a policy or an inline handler committed to a page fails
   the build) are run by test/build.test.mjs; here the served pages are checked for what those rules guarantee. */

type Violation = { directive: string; blocked: string; source: string };
async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    const w = window as any; w.__csp = [];
    document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
      if (e.disposition === 'report') return; // the stricter Report-Only policy only reports
      w.__csp.push({ directive: e.effectiveDirective || e.violatedDirective, blocked: e.blockedURI, source: `${e.sourceFile}:${e.lineNumber}` });
    });
  });
  return () => page.evaluate(() => ((window as any).__csp || []) as Violation[]);
}
const directives = (csp: string) => Object.fromEntries(csp.split(';').map(d => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));

test('Built page: every page is sent with its own policy, and no published page carries a policy <meta>', async ({ page, baseURL }) => {
  for (const path of ['/', '/learn/', '/parents/', '/teachers/', '/privacy/', '/terms/']) {
    const csp = directives(await policyOf(page, baseURL, path));
    expect(csp['default-src'], path).toEqual(["'self'"]);
    expect(csp['object-src'], path).toEqual(["'none'"]);
    expect(csp['base-uri'], path).toEqual(["'none'"]);
    expect(csp['form-action'], path).toEqual(["'self'"]);
    expect(csp['frame-ancestors'], path).toEqual(["'none'"]);
    expect(csp['report-to'], path).toEqual(['csp']);
    expect(csp['report-uri'], path).toEqual(['/_csp']);
    const html = await (await page.request.get(path)).text();
    expect(html, path).not.toMatch(/<meta http-equiv="Content-Security-Policy"/i);
  }
});

test('A policy committed to the source: the served policy is the build\'s (hashes for its own inline scripts, no unsafe-inline), never a hand-written one', async ({ page, baseURL }) => {
  await open(page);
  const csp = await policyOf(page, baseURL);
  const script = csp.split(';').map(s => s.trim()).find(s => s.startsWith('script-src'))!;
  expect(script).toMatch(/'sha256-[A-Za-z0-9+/=]+'/);
  expect(script).not.toContain("'unsafe-inline'");
  expect(script).not.toContain("'unsafe-eval'");
  const inline = await page.evaluate(() => [...document.querySelectorAll('script:not([src])')].filter(s => !/json/i.test(s.getAttribute('type') || '')).length); // data blocks need no hash
  expect((script.match(/'sha256-/g) || []).length).toBeGreaterThanOrEqual(inline);
});

test('Framing: another site cannot show the game in a frame', async ({ page, baseURL }) => {
  await policyOf(page, baseURL, APP);
  await page.goto('about:blank');
  await page.setContent(`<iframe id="f" src="${baseURL}${APP}" width="600" height="400"></iframe>`);
  await page.waitForTimeout(1500);
  const child = page.frames().find(f => f !== page.mainFrame());
  const shown = child ? await child.locator('#view').count().catch(() => 0) : 0;
  expect(shown, 'the game must not render inside another page').toBe(0);
});

test("The page's own inline scripts: the color scheme script, the import map and the color mode buttons work with no violation", async ({ page, baseURL }) => {
  const list = await watchViolations(page);
  await open(page);
  await policyOf(page, baseURL);
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
  await policyOf(page, baseURL);
  await page.evaluate(() => { (window as any).__ran = false; const s = document.createElement('script'); s.textContent = 'window.__ran = true;'; document.body.appendChild(s); });
  await expect.poll(async () => (await list()).some(x => /script-src/.test(x.directive)), { message: 'a securitypolicyviolation for script-src' }).toBe(true);
  expect(await page.evaluate(() => (window as any).__ran)).toBe(false);
});

test('An inline handler in the source: the published page has no inline event handler attribute and no javascript: link', async ({ page, baseURL }) => {
  await open(page);
  await policyOf(page, baseURL);
  const html = await (await page.request.get(APP)).text();
  expect(html).not.toMatch(/\son[a-z]+="/i);
  expect(html).not.toMatch(/href="javascript:/i);
});
