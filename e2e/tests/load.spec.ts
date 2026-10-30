import type { Route } from '@playwright/test';
import { test, expect, APP, open, mod, chromiumOnly } from './fixtures';

/* First load, page metadata, and the site's own files: the pinned design system, the theme, fonts, icons and manifest,
   all served by learnvedicmath.com (openspec change learnvedicmath, site-assets spec). */

test.describe('first visit', () => {
  test.use({ seedMode: null });

  test('loads with no console errors or failed requests, and shows the mode picker', async ({ page, issues }) => {
    await page.goto(APP);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await page.waitForLoadState('networkidle');
    expect(issues.console, 'console errors').toEqual([]);
    expect(issues.failed, 'failed requests').toEqual([]);
  });

  test('title, description, language and app metadata are present', async ({ page }) => {
    await page.goto(APP);
    await expect(page).toHaveTitle(/Learn Vedic Math$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Learn Vedic Math/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://learnvedicmath.com/play/');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    // The game is its own installable app (scope /play/)
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
    // The installed app on iPhone and iPad: its name under the icon and full screen (openspec change install-app)
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Vedic Math');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    // The Nikhilam Family favicon: the SVG, and PNG cuts at 16, 32 and 48 px
    await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/icons/favicon.svg');
    for (const s of [16, 32, 48]) await expect(page.locator(`link[rel="icon"][sizes="${s}x${s}"]`)).toHaveAttribute('href', `/icons/favicon-${s}.png`);
    await expect(page.locator('a.md-skip[href="#view"]')).toHaveCount(1);
    // The Vedic Math tabs are in the page but hidden until a Mode is picked (header.spec.ts 'tabs wait for a Mode')
    await expect(page.locator('nav.mq-nav')).toHaveCount(1);
    await expect(page.locator('nav.mq-nav')).toBeHidden();
  });
});

test('a returning player loads home with no console errors or failed requests', async ({ page, issues }) => {
  await open(page);
  await expect(page.locator('h1.home-h')).toHaveText('Learn a sutra, then use it');
  await page.waitForLoadState('networkidle');
  expect(issues.console, 'console errors').toEqual([]);
  expect(issues.failed, 'failed requests').toEqual([]);
});

/* The late imports (js/install.js after boot, js/stories.js after first paint, and a second after load js/sutra-tag.js,
   js/arena.js, js/tour.js and js/play/kit.js) are not in the first paint's import graph. A reload while one is still loading cuts it off; that is the page being left,
   not a failure, so nothing is logged (lateImport in js/life.js). Each is held in flight until the reload has started. */
for (const name of ['install', 'stories', 'sutra-tag', 'arena', 'tour', 'play/kit']) {
  test(`a reload while ${name}.js is still loading logs no console error`, async ({ page, issues }) => {
    const path = new URL(await mod(page, name), 'http://x').pathname;
    let hold = true, seen: () => void = () => {};
    const asked = new Promise<void>(r => { seen = r; });
    const held: Route[] = [];
    await page.route(u => u.pathname === path, route => {
      if (!hold) return route.continue();
      held.push(route); seen();
    });
    // Not open(): WebKit holds the load event for an import started before it, and this one is held
    await page.goto(APP, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1.home-h')).toBeVisible();
    await asked;
    hold = false;
    await page.reload();
    for (const r of held) await r.abort().catch(() => {}); /* the old page's request: gone with it */
    await expect(page.locator('h1.home-h')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(issues.console, 'console errors').toEqual([]);
  });
}

test('a late import that fails while the page stays still reports, as before', async ({ page, issues }) => {
  const path = new URL(await mod(page, 'install'), 'http://x').pathname;
  await page.route(u => u.pathname === path, route => route.abort('failed'));
  await open(page);
  await expect.poll(() => issues.console.some(m => m.includes('install.js did not load'))).toBe(true);
});

test.describe('the site\'s own files', () => {
  test('the pinned design system and the theme load from this site and apply', async ({ page }) => {
    const css: Record<string, number> = {};
    page.on('response', r => { const u = new URL(r.url()); if (/\.css$/.test(u.pathname)) css[u.pathname] = r.status(); });
    await open(page);
    for (const f of ['/ds/2.2.0/tokens.css', '/ds/2.2.0/components.css', '/theme/learnvedicmath.css', '/theme/fonts.css', '/math.css']) expect(css[f], f).toBe(200);
    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return ['--coral', '--teal', '--sun', '--sky', '--plum', '--bg', '--ink', '--on-accent'].map(v => [v, s.getPropertyValue(v).trim()]);
    });
    for (const [name, value] of tokens) expect(value, `${name} is defined`).not.toBe('');
    const radius = await page.locator('.md-btn').first().evaluate(e => getComputedStyle(e).borderRadius);
    expect(radius).not.toBe('0px');
  });

  /* The five category colours (Belts, avatars, tiles) are distinct in both schemes (site-assets spec) */
  for (const scheme of ['light', 'dark'] as const) {
    test(`the five category colours are distinct (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      const values = await page.evaluate(() => ['--coral', '--teal', '--sun', '--sky', '--plum'].map(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim().toLowerCase()));
      expect(new Set(values).size, values.join(' ')).toBe(5);
    });
  }

  test('every font comes from /fonts/ on this site, declared once, and mono text asks for its one weight', async ({ page, baseURL }) => {
    const fonts: string[] = [];
    page.on('request', r => { if (r.resourceType() === 'font') fonts.push(r.url()); });
    await open(page);
    const faces = await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([document.fonts.load('600 20px Fredoka'), document.fonts.load('700 20px Fredoka'), document.fonts.load('400 16px "Nunito Sans"'), document.fonts.load('400 16px "Space Grotesk"'), document.fonts.load('500 16px "JetBrains Mono"')]);
      return [...document.fonts].map(f => `${f.family.replace(/"/g, '')} ${f.weight} ${f.status}`);
    });
    for (const fam of ['Fredoka 600', 'Fredoka 700', 'Nunito Sans', 'Space Grotesk', 'JetBrains Mono'])
      expect(faces.find(f => f.startsWith(fam)), `${fam}: ${faces.join(', ')}`).toMatch(/loaded$/);
    expect(faces.filter(f => f.startsWith('JetBrains Mono')).length, 'one @font-face per font').toBe(1);
    expect(fonts.length).toBeGreaterThan(0);
    for (const u of fonts) expect(u.startsWith(`${new URL(baseURL!).origin}/fonts/`), u).toBe(true);
    // No faux bold: nothing styled with the mono font asks for a heavier weight than the 500 it ships
    const heavy = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => /JetBrains Mono/.test(getComputedStyle(e).fontFamily.split(',')[0]) && +getComputedStyle(e).fontWeight > 500).map(e => e.className || e.tagName).slice(0, 5));
    expect(heavy).toEqual([]);
  });

  test('the app manifest is Learn Vedic Math, scoped to /play/, with its own icons', async ({ request }) => {
    const m = await request.get('/manifest.webmanifest');
    expect(m.status()).toBe(200);
    const json = await m.json();
    expect(json.name).toBe('Learn Vedic Math');
    expect(json.short_name).toBe('Vedic Math');
    expect(json.id).toBe('/play/');
    expect(json.scope).toBe('/play/');
    expect(json.start_url).toBe('/play/?source=pwa');
    expect(json.display).toBe('standalone');
    expect(json.icons.some((i: { sizes: string }) => i.sizes === '192x192')).toBe(true);
    // Any-purpose and maskable cuts at 192 and 512 (openspec change install-app); "any" is the default purpose
    for (const size of ['192x192', '512x512']) {
      expect(json.icons.some((i: { sizes: string; purpose?: string }) => i.sizes === size && (!i.purpose || i.purpose === 'any')), `${size} any`).toBe(true);
      expect(json.icons.some((i: { sizes: string; purpose?: string }) => i.sizes === size && i.purpose === 'maskable'), `${size} maskable`).toBe(true);
    }
    // The richer install dialog: a description, narrow and wide screenshots served from this site, and shortcuts inside the scope
    expect(json.description.length).toBeGreaterThan(20);
    for (const f of ['narrow', 'wide']) expect(json.screenshots.some((s: { form_factor: string }) => s.form_factor === f), f).toBe(true);
    for (const s of json.screenshots) {
      const r = await request.get(s.src);
      expect(r.status(), s.src).toBe(200);
      expect(r.headers()['content-type'], s.src).toMatch(/image\/png/);
    }
    for (const s of json.shortcuts) expect(s.url, s.name).toMatch(/^\/play\/#\//);
    expect(json.launch_handler.client_mode).toContain('navigate-existing');
    for (const i of json.icons) {
      expect(i.src, 'icons come from this site').toMatch(/^\/icons\//);
      const r = await request.get(i.src);
      expect(r.status(), i.src).toBe(200);
      expect(r.headers()['content-type'], i.src).toMatch(/image\/(png|svg\+xml)/);
    }
    for (const f of ['apple-touch-icon.png', 'favicon-16.png', 'favicon-32.png', 'favicon-48.png', 'favicon.svg', 'og.png'])
      expect((await request.get(`/icons/${f}`)).status(), f).toBe(200);
  });

  test('Chromium finds the game installable from /play/', async ({ page }, testInfo) => {
    chromiumOnly(testInfo, 'the installability check is a Chromium DevTools call');
    await page.goto(APP);
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
    const cdp = await page.context().newCDPSession(page);
    await expect.poll(async () => (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors.map(e => e.errorId), { timeout: 10_000 }).toEqual([]);
    const m = await cdp.send('Page.getAppManifest');
    expect(m.url).toMatch(/\/manifest\.webmanifest$/);
    // Chrome's own manifest parser finds nothing wrong (openspec change install-app): no error, no warning
    expect(m.errors.map(e => e.message)).toEqual([]);
  });

  test('nothing loads from sbmadhav.com and there is no Explore menu', async ({ page }) => {
    const hosts = new Set<string>();
    page.on('request', r => hosts.add(new URL(r.url()).host));
    await open(page);
    await page.waitForLoadState('networkidle');
    // The site's own host is allowed: a pull request preview is served from <name>.sbmadhav.workers.dev
    const own = new URL(page.url()).host;
    expect([...hosts].filter(h => h !== own && /sbmadhav/.test(h))).toEqual([]);
    await expect(page.locator('#exploreBtn, dialog.xpm')).toHaveCount(0);
  });
});

test.describe('color schemes', () => {
  const bg = (page: import('@playwright/test').Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  test('Daybreak and Deep Space switch the palette and are remembered', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    const light = await bg(page);
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const dark = await bg(page);
    expect(dark).not.toBe(light);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  });

  test('System follows the operating system scheme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
    const darkSys = await bg(page);
    await page.emulateMedia({ colorScheme: 'light' });
    const lightSys = await bg(page);
    expect(darkSys).not.toBe(lightSys);
    // An explicit choice overrides the system, and switching back to match it clears the choice
    await page.locator('#themeBtn').click();
    expect(await bg(page)).toBe(darkSys);
    await page.locator('#themeBtn').click();
    expect(await bg(page)).toBe(lightSys);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('');
  });
});

/* Stable layout (page-layout spec): on a phone-sized first load, cumulative layout shift stays below 0.1. */
test('home first load on a phone: cumulative layout shift below 0.1', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'measured on the phone project');
  await page.addInitScript(() => {
    (window as any).__cls = 0;
    try {
      new PerformanceObserver(list => { for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value; })
        .observe({ type: 'layout-shift', buffered: true });
    } catch (e) { (window as any).__cls = -1; }
  });
  // A slow phone on a slow network (Lighthouse-like), so late module loads would show as shifts
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(APP);
  await expect(page.locator('#view h1').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => (window as any).__cls as number);
  test.skip(cls < 0, 'layout-shift entries are not supported in this engine');
  testInfo.annotations.push({ type: 'CLS', description: cls.toFixed(4) });
  console.log(`CLS on first load: ${cls.toFixed(4)}`);
  expect(cls).toBeLessThan(0.1);
});
