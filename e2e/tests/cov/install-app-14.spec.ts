import { test, expect, open } from '../fixtures';

/* install-app spec (openspec change install-app), Requirement "The Installed app opens offline": one test per scenario.
   The service worker runs here (as in offline.spec.ts); not in WebKit, whose Playwright build does not route the
   requests of a worker-controlled page. */
test.use({ serviceWorkers: 'allow' });
test.skip(({ browserName }) => browserName === 'webkit', 'Playwright WebKit does not route requests from worker-controlled pages (offline.spec.ts)');

test('Offline from the home screen: /play/?source=pwa and each shortcut come from the worker and render', async ({ page, context, request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  await open(page);
  await expect.poll(() => page.evaluate(async () => !!navigator.serviceWorker.controller && (await navigator.serviceWorker.getRegistration('/play/'))?.active?.state === 'activated'), { timeout: 30_000 }).toBe(true);
  const saved = await page.evaluate(async () => {
    const name = (await caches.keys()).filter(k => /^lvm-/.test(k) && k !== 'lvm-voice' && k !== 'lvm-sounds').pop()!;
    return (await (await caches.open(name)).keys()).map(r => new URL(r.url).pathname);
  });
  for (const f of ['/js/install.js', '/js/install-rules.js', '/js/prompt-slot.js', ...m.icons.map((i: { src: string }) => i.src)]) expect(saved, f).toContain(f);
  await context.setOffline(true);
  for (const url of [m.start_url, ...m.shortcuts.map((s: { url: string }) => s.url)]) {
    const tab = await context.newPage();
    const res = await tab.goto(url);
    expect(res?.fromServiceWorker(), url).toBe(true);
    await expect(tab.locator('#view h1, #view h2').first(), url).toBeVisible();
    await tab.close();
  }
  await context.setOffline(false);
});
