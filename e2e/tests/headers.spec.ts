import type { Page } from '@playwright/test';
import { test, expect, APP } from './fixtures';

/* Response headers (openspec change learnvedicmath, security-headers spec). build.py writes them into _headers;
   Cloudflare (or e2e/local-server.mjs, or wrangler dev) sends them. Every response carries the common headers; each
   page carries its own policy, a stricter Report-Only policy and COOP. Skips on a server that sends none over http. */

const COMMON: Record<string, string | RegExp> = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': /geolocation=\(\), payment=\(\), usb=\(\), serial=\(\), bluetooth=\(\)/,
};

test.beforeEach(async ({ request, baseURL }) => {
  const h = (await request.get(APP)).headers();
  test.skip(!h['strict-transport-security'] && !/^https:/.test(baseURL || ''), 'this server sends no _headers: serve a build (node e2e/local-server.mjs 8124 _site)');
});

for (const path of ['/', APP, '/import/', '/parents/', '/privacy/', '/js/app.js', '/ds/2.1.0/tokens.css', '/manifest.webmanifest', '/plya/']) {
  test(`${path}: every common header, with its value`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 });
    const h = res.headers();
    for (const [k, v] of Object.entries(COMMON)) {
      expect(h[k], `${path} ${k}`).toBeTruthy();
      if (typeof v === 'string') expect(h[k], `${path} ${k}`).toBe(v);
      else expect(h[k], `${path} ${k}`).toMatch(v);
    }
    expect(h['strict-transport-security']).not.toContain('preload');
  });
}

for (const path of ['/', APP, '/parents/', '/teachers/', '/privacy/', '/terms/']) {
  test(`${path}: its own policy with reporting, a Report-Only variant, and COOP same-origin`, async ({ request }) => {
    const h = (await request.get(path)).headers();
    expect(h['content-security-policy']).toMatch(/frame-ancestors 'none'/);
    // Camera and microphone: this site only on the game page (Math Lens, Tala Lab), off everywhere else, named once
    const pp = h['permissions-policy'];
    expect(pp).toContain(path === APP ? 'camera=(self), microphone=(self)' : 'camera=(), microphone=()');
    expect(pp.match(/camera=/g)).toHaveLength(1);
    expect(h['content-security-policy']).toMatch(/report-to csp/);
    expect(h['content-security-policy']).toMatch(/report-uri \/_csp/);
    expect(h['content-security-policy-report-only']).toMatch(/style-src 'self';/);
    expect(h['content-security-policy-report-only']).toMatch(/require-trusted-types-for 'script'/);
    expect(h['reporting-endpoints']).toBe('csp="/_csp"');
    expect(h['content-security-policy-report-only']).not.toMatch(/report-uri/);
    expect(h['cross-origin-opener-policy']).toBe('same-origin');
    expect(h['content-security-policy'].split(',').length, 'one policy, not two joined').toBe(1);
  });
}

/* /import/ (the Hand-off page) opens the Export page in a popup and waits for its postMessage, so it sends COOP
   same-origin-allow-popups instead of same-origin; the rest matches the other pages. */
test('/import/: its own policy with reporting, a Report-Only variant, and COOP same-origin-allow-popups', async ({ request }) => {
  const h = (await request.get('/import/')).headers();
  expect(h['content-security-policy']).toMatch(/frame-ancestors 'none'/);
  expect(h['content-security-policy']).toMatch(/report-to csp/);
  expect(h['content-security-policy']).toMatch(/report-uri \/_csp/);
  expect(h['content-security-policy'].split(',').length, 'one policy, not two joined').toBe(1);
  expect(h['content-security-policy-report-only']).toMatch(/style-src 'self';/);
  expect(h['content-security-policy-report-only']).toMatch(/require-trusted-types-for 'script'/);
  expect(h['content-security-policy-report-only']).not.toMatch(/report-uri/);
  expect(h['permissions-policy']).toContain('camera=(), microphone=()');
  expect(h['reporting-endpoints']).toBe('csp="/_csp"');
  expect(h['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
});

/* What COOP does to a cross-origin popup (security-headers spec, the export popup scenario; task 12.6). A stand-in
   for the Export page, answered by the test on another origin, posts to its opener: /import/ keeps that link, and
   /play/ (same-origin, the negative control) cuts it, so the popup sees no opener and nothing arrives. */
const EXPORT_STANDIN = 'https://export.invalid/vm-export/';
type Inbox = { exportMessages: unknown[] };

async function popupFrom(page: Page, path: string) {
  await page.context().route(EXPORT_STANDIN, route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Export</title><script>document.title = window.opener ? "opener" : "no opener"; if (window.opener) window.opener.postMessage({ from: "export" }, "*");</script>',
  }));
  await page.goto(path);
  await page.evaluate(() => {
    const w = window as unknown as Inbox;
    w.exportMessages = [];
    window.addEventListener('message', e => { if (e.origin === 'https://export.invalid') w.exportMessages.push(e.data); });
  });
  const [popup] = await Promise.all([page.context().waitForEvent('page'), page.evaluate(u => { window.open(u, 'vm-export'); }, EXPORT_STANDIN)]);
  await popup.waitForLoadState();
  await expect(popup).toHaveTitle(/opener/);
  return popup;
}

test('/import/ keeps the link to a cross-origin popup, and its message arrives', async ({ page }) => {
  const popup = await popupFrom(page, '/import/');
  await expect(popup).toHaveTitle('opener');
  await expect.poll(() => page.evaluate(() => (window as unknown as Inbox).exportMessages)).toEqual([{ from: 'export' }]);
});

test('/play/ (COOP same-origin) cuts the link to a cross-origin popup', async ({ page, browserName }) => {
  // Playwright's WebKit keeps the opener under COOP same-origin too (checked against production, 2026-10-28), so the
  // control only proves something on Chromium; the /import/ case above runs on every project.
  test.skip(browserName === 'webkit', 'Playwright WebKit does not cut the opener for COOP same-origin');
  const popup = await popupFrom(page, APP);
  await expect(popup).toHaveTitle('no opener');
  expect(await page.evaluate(() => (window as unknown as Inbox).exportMessages)).toEqual([]);
});

test('POST /_csp answers 204, and anything else is refused', async ({ request }) => {
  const ok = await request.post('/_csp', { headers: { 'content-type': 'application/csp-report' }, data: JSON.stringify({ 'csp-report': { 'document-uri': 'https://learnvedicmath.com/play/', 'blocked-uri': 'inline', 'effective-directive': 'script-src-elem' } }) });
  expect(ok.status()).toBe(204);
  expect((await request.get('/_csp')).status()).toBe(405);
});

test('security.txt names the security contact and expires within a year', async ({ request }) => {
  const res = await request.get('/.well-known/security.txt');
  expect(res.status()).toBe(200);
  const txt = await res.text();
  expect(txt).toMatch(/^Contact: mailto:security@learnvedicmath\.com$/m);
  const expires = new Date(txt.match(/^Expires: (\S+)$/m)![1]).getTime();
  expect(expires - Date.now()).toBeGreaterThan(30 * 86400_000);
  expect(expires - Date.now()).toBeLessThan(366 * 86400_000);
});

test('the game page may ask for the camera and microphone; a grown-up page is refused without asking', async ({ page }) => {
  const allows = () => page.evaluate(() => { const fp = (document as any).featurePolicy || (document as any).permissionsPolicy; return fp?.allowsFeature ? [fp.allowsFeature('camera'), fp.allowsFeature('microphone')] : null; });
  await page.goto(APP);
  test.skip(await allows() === null, 'this engine has no Permissions-Policy introspection');
  expect(await allows()).toEqual([true, true]);
  await page.goto('/parents/');
  expect(await allows()).toEqual([false, false]);
});
