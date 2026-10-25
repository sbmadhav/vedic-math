import { test, expect, open, chromiumOnly } from '../fixtures';

/* install-app spec (openspec change install-app), Requirement "The manifest describes one app": one test per scenario. */

test('The manifest: those fields, and both colors are the vendored design system\'s Daybreak --bg', async ({ request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect([m.name, m.short_name, m.id, m.start_url, m.scope, m.display, m.lang]).toEqual(['Learn Vedic Math', 'Vedic Math', '/play/', '/play/?source=pwa', '/play/', 'standalone', 'en']);
  expect(m.description.length).toBeGreaterThan(20);
  const tokens = await (await request.get('/ds/2.1.0/tokens.css')).text();
  const bg = tokens.match(/:root\s*\{[\s\S]*?--bg:\s*(#[0-9A-Fa-f]{6})/)![1].toLowerCase();
  expect(m.background_color.toLowerCase()).toBe(bg);
  expect(m.theme_color.toLowerCase()).toBe(bg);
});

test('Chromium finds it installable: no installability error, and its manifest parser reports nothing', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'a Chromium DevTools call');
  await open(page);
  const cdp = await page.context().newCDPSession(page);
  await expect.poll(async () => (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors.map(e => e.errorId), { timeout: 10_000 }).toEqual([]);
  expect((await cdp.send('Page.getAppManifest')).errors).toEqual([]);
});
