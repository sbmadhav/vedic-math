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
  'permissions-policy': /camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\), usb=\(\), serial=\(\), bluetooth=\(\)/,
};

test.beforeEach(async ({ request, baseURL }) => {
  const h = (await request.get(APP)).headers();
  test.skip(!h['strict-transport-security'] && !/^https:/.test(baseURL || ''), 'this server sends no _headers: serve a build (node e2e/local-server.mjs 8124 _site)');
});

for (const path of ['/', APP, '/parents/', '/privacy/', '/js/app.js', '/ds/2.1.0/tokens.css', '/manifest.webmanifest', '/plya/']) {
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

test('the camera is refused by Permissions-Policy without asking', async ({ page }) => {
  await page.goto(`${APP}`);
  const allowed = await page.evaluate(() => (document as any).featurePolicy?.allowsFeature?.('camera') ?? (document as any).permissionsPolicy?.allowsFeature?.('camera') ?? null);
  test.skip(allowed === null, 'this engine has no Permissions-Policy introspection');
  expect(allowed).toBe(false);
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
